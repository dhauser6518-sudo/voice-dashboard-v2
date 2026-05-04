import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { token, name, email, password } = await req.json();

  if (!token || !email || !password) {
    return NextResponse.json({ error: 'Token, email, and password are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Validate the invite token
  const { data: invite, error: inviteErr } = await supabase
    .from('dashboard_invites')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 });
  }

  // If invite is locked to a specific email, enforce it
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: `This invite is for ${invite.email}` }, { status: 400 });
  }

  // Create user via admin API (auto-confirms email)
  const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || email },
  });

  if (createErr) {
    if (createErr.message.includes('already been registered')) {
      return NextResponse.json({ error: 'An account with this email already exists. Try signing in instead.' }, { status: 400 });
    }
    return NextResponse.json({ error: createErr.message }, { status: 500 });
  }

  // Mark invite as used
  await supabase
    .from('dashboard_invites')
    .update({
      used: true,
      used_by: email,
      used_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  return NextResponse.json({
    ok: true,
    message: 'Account created. You can now sign in.',
    user_id: userData.user.id,
  });
}
