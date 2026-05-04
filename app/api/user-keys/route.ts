import { createServerClient } from '@/lib/supabase/server';
import { encrypt, decrypt, type EncryptedValue } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/user-keys?user_id=xxx — get saved keys (masked)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const supabase = createServerClient();
  const { data } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return NextResponse.json({ keys: {} });

  // Return masked versions so the UI knows which are set
  const keys: Record<string, string> = {};
  const fields = [
    'anthropic_api_key', 'openai_api_key',
    'elevenlabs_api_key', 'deepgram_api_key', 'playht_api_key', 'cartesia_api_key',
    'telnyx_api_key', 'twilio_auth_token', 'signalwire_api_token',
  ];

  for (const f of fields) {
    const val = data[f];
    if (val && typeof val === 'object' && (val as EncryptedValue).ct) {
      const decrypted = decrypt(val as EncryptedValue);
      keys[f] = decrypted ? '••••' + decrypted.slice(-4) : '';
    } else if (val && typeof val === 'string') {
      keys[f] = '••••' + val.slice(-4);
    } else {
      keys[f] = '';
    }
  }

  // Plain text fields
  keys.telnyx_connection_id = data.telnyx_connection_id || '';
  keys.twilio_account_sid = data.twilio_account_sid || '';
  keys.signalwire_project_id = data.signalwire_project_id || '';
  keys.signalwire_space_url = data.signalwire_space_url || '';
  keys.telnyx_phone_number = data.telnyx_phone_number || '';
  keys.twilio_phone_number = data.twilio_phone_number || '';
  keys.signalwire_phone_number = data.signalwire_phone_number || '';

  return NextResponse.json({ keys });
}

// POST /api/user-keys — save/update keys
export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = body.user_id;
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const supabase = createServerClient();

  const update: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };

  // Encrypt sensitive keys (only if non-empty — empty means don't change)
  const encryptFields = [
    'anthropic_api_key', 'openai_api_key',
    'elevenlabs_api_key', 'deepgram_api_key', 'playht_api_key', 'cartesia_api_key',
    'telnyx_api_key', 'twilio_auth_token', 'signalwire_api_token',
  ];
  for (const f of encryptFields) {
    if (body[f] && body[f].trim() && !body[f].startsWith('••••')) {
      update[f] = encrypt(body[f].trim());
    }
  }

  // Plain text fields
  const plainFields = [
    'telnyx_connection_id', 'twilio_account_sid',
    'signalwire_project_id', 'signalwire_space_url',
    'telnyx_phone_number', 'twilio_phone_number', 'signalwire_phone_number',
  ];
  for (const f of plainFields) {
    if (body[f] !== undefined) update[f] = body[f] || null;
  }

  const { error } = await supabase
    .from('user_api_keys')
    .upsert(update, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET /api/user-keys/raw?user_id=xxx — get DECRYPTED keys (internal use for bot creation)
export async function PUT(req: NextRequest) {
  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const supabase = createServerClient();
  const { data } = await supabase.from('user_api_keys').select('*').eq('user_id', user_id).maybeSingle();
  if (!data) return NextResponse.json({ keys: {} });

  const keys: Record<string, string> = {};
  const encryptFields = [
    'anthropic_api_key', 'openai_api_key',
    'elevenlabs_api_key', 'deepgram_api_key', 'playht_api_key', 'cartesia_api_key',
    'telnyx_api_key', 'twilio_auth_token', 'signalwire_api_token',
  ];
  for (const f of encryptFields) {
    const val = data[f];
    if (val && typeof val === 'object' && (val as EncryptedValue).ct) {
      keys[f] = decrypt(val as EncryptedValue) || '';
    } else if (val && typeof val === 'string') {
      keys[f] = val;
    }
  }

  const plainFields = ['telnyx_connection_id', 'twilio_account_sid', 'signalwire_project_id', 'signalwire_space_url', 'telnyx_phone_number', 'twilio_phone_number', 'signalwire_phone_number'];
  for (const f of plainFields) { keys[f] = data[f] || ''; }

  return NextResponse.json({ keys });
}
