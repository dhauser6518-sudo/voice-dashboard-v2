import { createServerClient } from '@/lib/supabase/server';
import { decrypt, type EncryptedValue } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/bots — list all Cartesia agents
export async function GET() {
  const supabase = createServerClient();

  // Get user's Cartesia API key
  let cartesiaKey: string | null = null;

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

  if (!cartesiaKey) {
    cartesiaKey = process.env.CARTESIA_API_KEY || null;
  }

  if (!cartesiaKey) {
    return NextResponse.json(
      { error: 'No Cartesia API key found — save it in Settings or set CARTESIA_API_KEY env var' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch('https://api.cartesia.ai/agents', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cartesiaKey}`,
        'Cartesia-Version': '2025-04-16',
      },
    });

    const body = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Cartesia ${res.status}: ${body?.error || body?.message || JSON.stringify(body).slice(0, 200)}` },
        { status: 400 }
      );
    }

    // Cartesia returns {summaries: [...]}
    const agents = body?.summaries || [];

    return NextResponse.json({ bots: agents });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/bots — toggle bot active status (kept for compatibility)
export async function POST(req: NextRequest) {
  const { id, is_active } = await req.json();

  if (!id || typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid id or is_active' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('voice_agents')
    .update({ is_active })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
