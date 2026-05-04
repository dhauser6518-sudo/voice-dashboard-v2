import { createServerClient } from '@/lib/supabase/server';
import { decrypt, type EncryptedValue } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/bots/test-call — initiate a test call via Cartesia
export async function POST(req: NextRequest) {
  const { bot_id, phone, metadata } = await req.json();

  if (!bot_id || !phone) {
    return NextResponse.json({ error: 'bot_id and phone are required' }, { status: 400 });
  }

  // Clean phone number to E.164
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }
  const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;

  const supabase = createServerClient();

  // Try to get user's Cartesia API key from user_api_keys
  let cartesiaKey: string | null = null;

  // Look up the first available user key (single-tenant dashboard)
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (userKeys?.cartesia_api_key) {
    const k = userKeys.cartesia_api_key;
    cartesiaKey = (typeof k === 'object' && (k as EncryptedValue).ct)
      ? decrypt(k as EncryptedValue)
      : (typeof k === 'string' ? k : null);
  }

  // Fall back to env var
  if (!cartesiaKey) {
    cartesiaKey = process.env.CARTESIA_API_KEY || null;
  }

  if (!cartesiaKey) {
    return NextResponse.json(
      { error: 'No Cartesia API key found — save it in Settings or set CARTESIA_API_KEY env var' },
      { status: 400 }
    );
  }

  // Initiate outbound call via Cartesia
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
        agent_id: bot_id,
        metadata: metadata || {},
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Cartesia ${res.status}: ${body?.error || body?.message || JSON.stringify(body).slice(0, 200)}` },
        { status: 400 }
      );
    }

    // Cartesia returns {status: "success", calls: [{number, call_sid, agent_call_id}]}
    const callInfo = body?.calls?.[0];

    return NextResponse.json({
      ok: true,
      call_sid: callInfo?.call_sid || null,
      to: formattedPhone,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
