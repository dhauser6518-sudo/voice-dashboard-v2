import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerClient();

  const { data: lists, error } = await supabase
    .from('lead_lists')
    .select('id, name, description, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (lists || []).map(async (list) => {
      const { count } = await supabase
        .from('voice_leads')
        .select('id', { count: 'exact', head: true })
        .eq('lead_list_id', list.id);
      return { ...list, lead_count: count || 0 };
    })
  );

  return NextResponse.json({ lists: enriched });
}
