import { createServerClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Encrypt all sensitive keys
  const encryptedAiKey = body.ai_api_key ? encrypt(body.ai_api_key) : null;
  const encryptedVoiceKey = body.voice_api_key ? encrypt(body.voice_api_key) : null;
  const encryptedPhoneKey = body.phone_api_key ? encrypt(body.phone_api_key) : null;
  const encryptedPhoneSecret = body.phone_api_secret ? encrypt(body.phone_api_secret) : null;
  const encryptedDeepgramKey = body.deepgram_api_key ? encrypt(body.deepgram_api_key) : null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('voice_agents')
    .insert({
      name: body.name.trim(),
      is_active: false,
      voice_id: body.voice_id || null,
      voice_name: body.voice_name || null,
      voice_provider: body.voice_provider || 'elevenlabs',
      phone_provider: body.phone_provider || 'telnyx',
      prompt_id: body.prompt_id || null,
      script_id: body.script_id || null,
      model: body.model || 'claude-sonnet-4-6',
      product_type: body.product_type || 'final_expense',
      stability: body.stability ?? 0.55,
      similarity_boost: body.similarity_boost ?? 0.85,
      style: body.style ?? 0.25,
      speed: body.speed ?? 1.15,
      phone_number: body.phone_number || null,
      telnyx_connection_id: body.phone_connection_id || body.telnyx_connection_id || null,
      phone_account_sid: body.phone_account_sid || null,
      signalwire_space_url: body.signalwire_space_url || null,
      max_concurrent: body.max_concurrent || 5,
      lead_list_id: body.lead_list_id && body.lead_list_id.length > 10 ? body.lead_list_id : null,
      created_by: body.created_by || null,
      created_by_name: body.created_by_name || null,
      ai_api_key: encryptedAiKey,
      elevenlabs_api_key: encryptedVoiceKey,
      telnyx_api_key: encryptedPhoneKey,
      twilio_auth_token: encryptedPhoneSecret,
      stt_provider: body.stt_provider || 'telnyx',
      stt_model: body.stt_model || 'nova-2',
      deepgram_api_key: encryptedDeepgramKey,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
