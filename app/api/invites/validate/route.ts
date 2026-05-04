import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET — check if invite is valid
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('dashboard_invites')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  return NextResponse.json({ valid: true, email: data.email });
}

// POST — mark invite as used
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const { email } = await req.json();
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const supabase = createServerClient();
  await supabase
    .from('dashboard_invites')
    .update({ used: true, used_by: email, used_at: new Date().toISOString() })
    .eq('token', token);

  return NextResponse.json({ ok: true });
}
