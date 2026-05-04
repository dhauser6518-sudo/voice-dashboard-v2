import { createServerClient } from '@/lib/supabase/server';
import { decrypt, type EncryptedValue } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

/** Resolve the user's Cartesia API key from DB or env */
async function getCartesiaKey(): Promise<string | null> {
  const supabase = createServerClient();
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (userKeys?.cartesia_api_key) {
    const k = userKeys.cartesia_api_key;
    if (typeof k === 'object' && (k as EncryptedValue).ct) {
      return decrypt(k as EncryptedValue);
    }
    if (typeof k === 'string') return k;
  }

  return process.env.CARTESIA_API_KEY || null;
}

/** Pause for ms milliseconds */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/campaigns/launch — launch a campaign: call all leads in a list via Cartesia
export async function POST(req: NextRequest) {
  const { agent_id, lead_list_id, name, campaign_id } = await req.json();

  if (!agent_id || !lead_list_id) {
    return NextResponse.json(
      { error: 'agent_id and lead_list_id are required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Get Cartesia API key
  const cartesiaKey = await getCartesiaKey();
  if (!cartesiaKey) {
    return NextResponse.json(
      { error: 'No Cartesia API key found — save it in Settings or set CARTESIA_API_KEY env var' },
      { status: 400 }
    );
  }

  // Fetch all leads linked to this list
  const { data: leads, error: leadsErr } = await supabase
    .from('voice_leads')
    .select('*')
    .eq('lead_list_id', lead_list_id);

  if (leadsErr) {
    return NextResponse.json({ error: leadsErr.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: 'No leads found in this list' }, { status: 400 });
  }

  // Create or update campaign record
  let activeCampaignId = campaign_id;
  if (!activeCampaignId) {
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .insert({
        name: name || `Campaign - ${lead_list_id}`,
        agent_id,
        lead_list_id,
        status: 'running',
        total_leads: leads.length,
        calls_made: 0,
        calls_succeeded: 0,
        calls_failed: 0,
      })
      .select('id')
      .single();

    if (campErr || !campaign) {
      return NextResponse.json(
        { error: `Failed to create campaign: ${campErr?.message || 'unknown'}` },
        { status: 500 }
      );
    }
    activeCampaignId = campaign.id;
  } else {
    // Update existing campaign to running
    await supabase
      .from('campaigns')
      .update({ status: 'running', total_leads: leads.length })
      .eq('id', activeCampaignId);
  }

  // Process each lead — 1 call per second (Cartesia rate limit)
  let callsMade = 0;
  let callsSucceeded = 0;
  let callsFailed = 0;

  for (const lead of leads) {
    // Check if campaign was paused
    const { data: check } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', activeCampaignId)
      .single();

    if (check?.status === 'paused') {
      await supabase
        .from('campaigns')
        .update({ calls_made: callsMade, calls_succeeded: callsSucceeded, calls_failed: callsFailed })
        .eq('id', activeCampaignId);
      return NextResponse.json({
        ok: true,
        campaign_id: activeCampaignId,
        total: leads.length,
        succeeded: callsSucceeded,
        failed: callsFailed,
        paused: true,
      });
    }

    // Clean phone to E.164
    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      callsFailed++;
      callsMade++;
      continue;
    }
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;

    // Build metadata from lead fields
    const metadata: Record<string, string> = {};
    if (lead.first_name) metadata.first_name = lead.first_name;
    if (lead.last_name) metadata.last_name = lead.last_name;
    if (lead.phone) metadata.phone = formattedPhone;
    if (lead.street_address) metadata.address = lead.street_address;
    if (lead.city) metadata.city = lead.city;
    if (lead.state) metadata.state = lead.state;
    if (lead.zip) metadata.zip = lead.zip;
    if (lead.dob) metadata.dob = lead.dob;
    if (lead.age) metadata.age = String(lead.age);
    if (lead.gender) metadata.gender = lead.gender;
    if (lead.existing_carrier) metadata.active_carrier = lead.existing_carrier;
    if (lead.beneficiary) metadata.beneficiary = lead.beneficiary;
    if (lead.current_coverage) metadata.current_coverage = lead.current_coverage;
    if (lead.current_premium) metadata.current_premium = lead.current_premium;

    try {
      const res = await fetch('https://api.cartesia.ai/twilio/call/outbound', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cartesiaKey}`,
          'Cartesia-Version': '2025-04-16',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_numbers: [formattedPhone],
          agent_id,
          metadata,
        }),
      });

      const body = await res.json();
      const callInfo = body?.calls?.[0];

      // Track in campaign_calls table
      await supabase.from('campaign_calls').insert({
        campaign_id: activeCampaignId,
        agent_id,
        voice_lead_id: lead.id,
        phone: formattedPhone,
        call_sid: callInfo?.call_sid || null,
        agent_call_id: callInfo?.agent_call_id || null,
        status: res.ok ? 'initiated' : 'failed',
        error: res.ok ? null : (body?.error || body?.message || JSON.stringify(body).slice(0, 200)),
        metadata,
      });

      if (res.ok) {
        callsSucceeded++;
      } else {
        callsFailed++;
      }
    } catch (err) {
      // Track failed call
      await supabase.from('campaign_calls').insert({
        campaign_id: activeCampaignId,
        agent_id,
        voice_lead_id: lead.id,
        phone: formattedPhone,
        status: 'failed',
        error: (err as Error).message,
        metadata,
      });
      callsFailed++;
    }

    callsMade++;

    // Update campaign progress
    await supabase
      .from('campaigns')
      .update({
        calls_made: callsMade,
        calls_succeeded: callsSucceeded,
        calls_failed: callsFailed,
      })
      .eq('id', activeCampaignId);

    // Rate limit: 1 call per second
    if (callsMade < leads.length) {
      await sleep(1000);
    }
  }

  // Mark campaign complete
  await supabase
    .from('campaigns')
    .update({
      status: 'completed',
      calls_made: callsMade,
      calls_succeeded: callsSucceeded,
      calls_failed: callsFailed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', activeCampaignId);

  return NextResponse.json({
    ok: true,
    campaign_id: activeCampaignId,
    total: leads.length,
    succeeded: callsSucceeded,
    failed: callsFailed,
  });
}
