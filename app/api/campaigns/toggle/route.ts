import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { campaign_id, status } = await req.json();

  if (!campaign_id || !status) {
    return NextResponse.json({ error: 'campaign_id and status are required' }, { status: 400 });
  }

  if (!['running', 'paused', 'completed', 'draft'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from('campaigns')
    .update({ status })
    .eq('id', campaign_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
