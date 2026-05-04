import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const range = request.nextUrl.searchParams.get('range') || 'today';

  let since: string | null = null;
  if (range === 'today') { const d = new Date(); d.setHours(-5, 0, 0, 0); since = d.toISOString(); } // EST offset
  else if (range === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); since = d.toISOString(); }
  else if (range === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); since = d.toISOString(); }

  // PostgREST caps row-returning selects at 1000 rows. Use head:true count queries
  // per metric so totals are accurate past 1000 calls. Sales rows are fetched (no
  // count) because we need application_data for premium math, but sale count is tiny.
  const withSince = <T extends { gte: (col: string, val: string) => T }>(q: T): T =>
    since ? q.gte('started_at', since) : q;

  const [
    activeBotsRes,
    totalBotsRes,
    totalCallsRes,
    pickupsRes,
    voicemailsRes,
    salesRes,
    activeCallsRes,
  ] = await Promise.all([
    supabase.from('voice_agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('voice_agents').select('id', { count: 'exact', head: true }),
    withSince(supabase.from('voice_call_logs').select('id', { count: 'exact', head: true })),
    withSince(supabase.from('voice_call_logs').select('id', { count: 'exact', head: true }).not('outcome', 'in', '("voicemail","no_answer")')),
    withSince(supabase.from('voice_call_logs').select('id', { count: 'exact', head: true }).eq('outcome', 'voicemail')),
    withSince(supabase.from('voice_call_logs').select('application_data').eq('outcome', 'sale')),
    supabase.from('voice_call_logs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
  ]);

  const activeBots = activeBotsRes.count;
  const totalBots = totalBotsRes.count;
  const totalCalls = totalCallsRes.count || 0;
  const pickups = pickupsRes.count || 0;
  const voicemails = voicemailsRes.count || 0;
  const activeCalls = activeCallsRes.count;
  const sales = salesRes.data || [];
  const totalSales = sales.length;

  let totalPremium = 0;
  for (const sale of sales) {
    const mp = Number((sale.application_data as { premium_quoted?: number } | null)?.premium_quoted);
    if (!isNaN(mp) && mp > 0) totalPremium += mp * 12;
  }

  return NextResponse.json({
    activeBots: activeBots || 0,
    totalBots: totalBots || 0,
    activeCalls: activeCalls || 0,
    totalCalls,
    pickups,
    voicemails,
    totalSales,
    totalPremium: Math.round(totalPremium),
  });
}
