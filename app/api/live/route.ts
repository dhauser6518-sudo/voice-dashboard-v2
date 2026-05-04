import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerClient();

  // Active calls (in_progress)
  const { data: activeCalls } = await supabase
    .from('voice_call_logs')
    .select('id, phone, started_at, voice_agent_id, voice_leads(full_name), voice_agents(name)')
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false });

  // Recent completed calls (last 20, within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentCalls } = await supabase
    .from('voice_call_logs')
    .select('id, phone, outcome, disposition, stage_reached, duration_seconds, ended_at, voice_agent_id, voice_leads(full_name), voice_agents(name)')
    .eq('status', 'completed')
    .gte('ended_at', oneHourAgo)
    .order('ended_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    active: (activeCalls || []).map(c => ({
      id: c.id,
      phone: c.phone,
      lead: (c.voice_leads as { full_name?: string } | null)?.full_name || null,
      bot: (c.voice_agents as { name?: string } | null)?.name || null,
      started_at: c.started_at,
      duration: c.started_at ? Math.floor((Date.now() - new Date(c.started_at).getTime()) / 1000) : 0,
    })),
    recent: (recentCalls || []).map(c => ({
      id: c.id,
      phone: c.phone,
      lead: (c.voice_leads as { full_name?: string } | null)?.full_name || null,
      bot: (c.voice_agents as { name?: string } | null)?.name || null,
      outcome: c.outcome,
      disposition: c.disposition,
      stage: c.stage_reached,
      duration: c.duration_seconds,
      ended_at: c.ended_at,
    })),
  });
}
