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

// GET /api/bots/[id] — get a single Cartesia agent
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cartesiaKey = await getCartesiaKey();
  if (!cartesiaKey) {
    return NextResponse.json(
      { error: 'No Cartesia API key found — save it in Settings or set CARTESIA_API_KEY env var' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://api.cartesia.ai/agents/${id}`, {
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
        { status: res.status >= 400 && res.status < 500 ? res.status : 500 }
      );
    }

    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PUT /api/bots/[id] — update a Cartesia agent via PATCH
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const cartesiaKey = await getCartesiaKey();
  if (!cartesiaKey) {
    return NextResponse.json(
      { error: 'No Cartesia API key found — save it in Settings or set CARTESIA_API_KEY env var' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://api.cartesia.ai/agents/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${cartesiaKey}`,
        'Cartesia-Version': '2025-04-16',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Cartesia ${res.status}: ${result?.error || result?.message || JSON.stringify(result).slice(0, 200)}` },
        { status: res.status >= 400 && res.status < 500 ? res.status : 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/bots/[id] — delete bot from local DB (kept for compatibility)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from('voice_agents')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
