import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// GET /api/invites — list active invites
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('dashboard_invites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: data });
}

// POST /api/invites — create invite link
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerClient();

  const token = randomUUID();
  const { data, error } = await supabase
    .from('dashboard_invites')
    .insert({
      token,
      email: body.email || null,
      role: body.role || 'member',
      created_by: body.created_by || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/invites?id=xxx — revoke invite
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from('dashboard_invites').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
