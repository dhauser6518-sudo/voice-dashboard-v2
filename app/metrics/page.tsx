import { createServerClient } from '@/lib/supabase/server';
import { decryptApplicationData } from '@/lib/encryption';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STAGE_LABELS: Record<number, string> = {
  1: 'Opener',
  2: 'DOB / Needs Analysis',
  3: 'Health Screening',
  4: 'Benefits Explained',
  5: 'Quote Delivered',
  6: 'Application Started',
  7: 'Vital Info Collected',
  8: 'Close / Sale',
};

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const range = (params.range as '7d' | '30d' | 'all') || 'all';
  const supabase = createServerClient();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  let funnelSince: string | null = null;
  if (range === '7d') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    funnelSince = d.toISOString();
  } else if (range === '30d') {
    const d = new Date(); d.setDate(d.getDate() - 30);
    funnelSince = d.toISOString();
  }

  const [
    { count: totalLeads },
    { count: totalCalls },
    { count: callsToday },
    { count: salesToday },
    { count: dncTotal },
    { data: allSales },
    { data: recentCalls },
  ] = await Promise.all([
    supabase.from('voice_leads').select('id', { count: 'exact', head: true }),
    supabase.from('voice_call_logs').select('id', { count: 'exact', head: true }),
    supabase.from('voice_call_logs').select('id', { count: 'exact', head: true }).gte('started_at', todayISO),
    supabase.from('voice_call_logs').select('id', { count: 'exact', head: true }).gte('started_at', todayISO).eq('outcome', 'sale'),
    supabase.from('voice_leads').select('id', { count: 'exact', head: true }).eq('dnc', true),
    supabase.from('voice_call_logs').select('application_data').eq('outcome', 'sale'),
    supabase.from('voice_call_logs').select('id, phone, outcome, status, started_at, voice_leads(full_name)').order('started_at', { ascending: false }).limit(10),
  ]);

  let annualPremium = 0;
  const totalSalesCount = allSales?.length || 0;
  for (const sale of allSales || []) {
    if (!sale.application_data) continue;
    const decrypted = decryptApplicationData(sale.application_data as Record<string, unknown>);
    const monthly = Number(decrypted?.premium_quoted);
    if (monthly > 0) annualPremium += monthly * 12;
  }

  let funnelQuery = supabase.from('voice_call_logs').select('stage_reached');
  if (funnelSince) funnelQuery = funnelQuery.gte('started_at', funnelSince);
  const { data: stageData } = await funnelQuery;

  const stageCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  let funnelTotal = 0;
  for (const row of stageData || []) {
    const stage = row.stage_reached as number | null;
    if (stage == null || stage < 1) continue;
    funnelTotal += 1;
    for (let s = 1; s <= Math.min(stage, 8); s++) {
      stageCounts[s] += 1;
    }
  }

  const maxCount = Math.max(...Object.values(stageCounts), 1);

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <h1 className="text-xl font-bold text-white mb-6">Metrics</h1>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Total Leads" value={totalLeads || 0} link="/leads" />
        <Stat label="Total Calls" value={totalCalls || 0} link="/calls" />
        <Stat label="Total Sales" value={totalSalesCount} accent />
        <CurrencyStat label="Annual Premium" value={annualPremium} />
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Today</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Calls" value={callsToday || 0} />
        <Stat label="Sales" value={salesToday || 0} accent />
        <Stat label="DNC" value={dncTotal || 0} link="/leads?status=dnc" />
      </div>

      <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Conversion Funnel</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {funnelTotal} {funnelTotal === 1 ? 'call' : 'calls'} reached at least Stage 1
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <RangeButton current={range} target="7d" label="7d" />
            <RangeButton current={range} target="30d" label="30d" />
            <RangeButton current={range} target="all" label="All time" />
          </div>
        </div>

        {funnelTotal === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No calls in this time range</p>
        ) : (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((stage) => {
              const count = stageCounts[stage];
              const pctOfTotal = funnelTotal > 0 ? (count / funnelTotal) * 100 : 0;
              const pctBar = (count / maxCount) * 100;
              const prevCount = stage > 1 ? stageCounts[stage - 1] : count;
              const stepConv = prevCount > 0 ? (count / prevCount) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-3 group">
                  <div className="w-8 text-xs text-gray-400 font-mono text-right">S{stage}</div>
                  <div className="w-44 text-xs text-gray-700">{STAGE_LABELS[stage]}</div>
                  <div className="flex-1 relative h-7 bg-gray-50 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${stage <= 2 ? 'bg-gray-400' : stage <= 5 ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                      style={{ width: `${pctBar}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 text-xs font-mono text-gray-700">
                      {count}
                    </div>
                  </div>
                  <div className="w-16 text-right text-xs text-gray-500 font-mono">
                    {pctOfTotal.toFixed(0)}%
                  </div>
                  <div className="w-20 text-right text-xs text-gray-400 font-mono">
                    {stage > 1 && prevCount > 0 ? `${stepConv.toFixed(0)}% step` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {funnelTotal > 0 && funnelTotal < 20 && (
          <p className="text-xs text-amber-600 mt-4 text-center">
            Only {funnelTotal} calls in range — funnel patterns become meaningful at 50+ calls
          </p>
        )}
      </div>

      <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase mb-3">Recent Calls</div>
        <div className="space-y-1">
          {(recentCalls || []).map((c: { id: string; phone: string; outcome: string | null; status: string; started_at: string | null; voice_leads?: { full_name?: string } | { full_name?: string }[] | null }) => {
            const lead = Array.isArray(c.voice_leads) ? c.voice_leads[0] : c.voice_leads;
            return (
              <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded text-sm">
                <span className="text-gray-700">{lead?.full_name || c.phone}</span>
                <span className="text-xs text-gray-400">{c.outcome || c.status}</span>
              </Link>
            );
          })}
          {(!recentCalls || recentCalls.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">No calls yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, link, accent }: { label: string; value: number; link?: string; accent?: boolean }) {
  const inner = (
    <div className={`bg-[#111827] border border-gray-700/50 rounded-xl p-4 ${link ? 'hover:border-gray-600 transition-colors' : ''}`}>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? 'text-emerald-400' : 'text-white'}`}>{value.toLocaleString()}</div>
    </div>
  );
  return link ? <Link href={link}>{inner}</Link> : inner;
}

function CurrencyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-4">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1 text-emerald-400">
        ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

function RangeButton({ current, target, label }: { current: string; target: string; label: string }) {
  const isActive = current === target;
  return (
    <Link
      href={target === 'all' ? '/metrics' : `/metrics?range=${target}`}
      className={`px-2.5 py-1 rounded transition-colors ${isActive ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'}`}
    >
      {label}
    </Link>
  );
}
