import { createServerClient } from '@/lib/supabase/server';
import { decryptApplicationData } from '@/lib/encryption';
import { computeCallCost, formatUSD, isHumanPickup } from '@/lib/pricing';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STAGE_LABELS: Record<number, string> = {
  1: 'Opener', 2: 'DOB / Needs Analysis', 3: 'Health Screening', 4: 'Coverage Discussion',
  5: 'Quote Delivered', 6: 'Application Started', 7: 'Vital Info Collected', 8: 'Close / Sale',
};

const OBJECTION_LABELS: Record<string, string> = {
  not_interested: 'Not interested', already_have_insurance: 'Already have insurance',
  ssn_refusal: 'SSN refusal', banking_refusal: 'Banking refusal',
  scam_concern: 'Scam concern', spouse_consult: 'Wants to talk to spouse',
  send_in_mail: 'Send in mail', busy_callback: 'Busy / callback',
  cost_concern: 'Cost concern', callback_later: 'Callback later',
  wrong_person: 'Wrong person', language_barrier: 'Language barrier',
  hostile_hangup: 'Hostile hangup',
};

type CallRow = {
  id: string; voice_agent_id: string; model_used: string | null; outcome: string | null;
  stage_reached: number | null; duration_seconds: number | null;
  total_input_tokens: number | null; total_output_tokens: number | null;
  cache_hits: number | null; cache_creates: number | null;
  ai_responses: unknown; application_data: Record<string, unknown> | null;
  objections: string[] | null;
  voice_agents?: { id: string; name: string; model: string } | { id: string; name: string; model: string }[] | null;
};

export default async function PnLPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const range = (params.range as 'today' | '7d' | '30d' | 'all') || 'today';
  const supabase = createServerClient();

  let since: string | null = null;
  if (range === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); since = d.toISOString(); }
  else if (range === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); since = d.toISOString(); }
  else if (range === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); since = d.toISOString(); }

  let query = supabase
    .from('voice_call_logs')
    .select('id, voice_agent_id, model_used, outcome, stage_reached, duration_seconds, total_input_tokens, total_output_tokens, cache_hits, cache_creates, ai_responses, application_data, objections, voice_agents(id, name, model)')
    .order('started_at', { ascending: false });
  if (since) query = query.gte('started_at', since);
  const { data: rawCalls } = await query;
  const calls = (rawCalls || []) as CallRow[];

  const totalDialed = calls.length;
  const humanPickups = calls.filter(c => isHumanPickup(c));
  const totalCalls = humanPickups.length;
  let totalCost = 0, totalRevenue = 0, totalSales = 0;

  const byBot: Record<string, { name: string; model: string; calls: number; pickups: number; sales: number; revenue: number; cost: number; duration: number }> = {};
  const objectionCounts: Record<string, number> = {};
  const stageCounts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0};

  for (const call of calls) {
    const bot = Array.isArray(call.voice_agents) ? call.voice_agents[0] : call.voice_agents;
    const botId = call.voice_agent_id || 'unknown';
    if (!byBot[botId]) byBot[botId] = { name: bot?.name || 'Unknown', model: bot?.model || call.model_used || 'claude-sonnet-4-6', calls: 0, pickups: 0, sales: 0, revenue: 0, cost: 0, duration: 0 };
    byBot[botId].calls += 1;
    if (isHumanPickup(call)) byBot[botId].pickups += 1;
    byBot[botId].duration += call.duration_seconds || 0;

    const cost = computeCallCost(call);
    totalCost += cost.total;
    byBot[botId].cost += cost.total;

    if (call.outcome === 'sale') {
      totalSales += 1;
      byBot[botId].sales += 1;
      const decrypted = call.application_data ? decryptApplicationData(call.application_data) : null;
      const mp = Number(decrypted?.premium_quoted);
      if (!isNaN(mp) && mp > 0) { totalRevenue += mp * 12; byBot[botId].revenue += mp * 12; }
    }

    if (call.stage_reached && call.stage_reached >= 1) {
      for (let s = 1; s <= Math.min(call.stage_reached, 8); s++) stageCounts[s] += 1;
    }

    if (Array.isArray(call.objections)) {
      for (const obj of call.objections) objectionCounts[obj] = (objectionCounts[obj] || 0) + 1;
    }
  }

  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const costPerSale = totalSales > 0 ? totalCost / totalSales : 0;
  const costPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;
  const conversionRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0;

  const botRows = Object.values(byBot).sort((a, b) => b.revenue - a.revenue) as { name: string; model: string; calls: number; pickups: number; sales: number; revenue: number; cost: number; duration: number }[];
  const topObjections = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxStageCount = Math.max(...Object.values(stageCounts), 1);

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">P&L</h1>
          <p className="text-sm text-gray-500 mt-1">Profit, cost per sale, and bot performance</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <RangeButton current={range} target="today" label="Today" />
          <RangeButton current={range} target="7d" label="7d" />
          <RangeButton current={range} target="30d" label="30d" />
          <RangeButton current={range} target="all" label="All time" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Revenue" value={formatUSD(totalRevenue, 0)} sub="annual premium" accent />
        <Stat label="Total Cost" value={formatUSD(totalCost, 2)} sub="all calls" />
        <Stat label="Profit" value={formatUSD(profit, 0)} sub={`${margin.toFixed(1)}% margin`} accent={profit > 0} negative={profit < 0} />
        <Stat label="Cost per Sale" value={totalSales > 0 ? formatUSD(costPerSale, 2) : '—'} sub={`${totalSales} sales`} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Dialed" value={totalDialed.toString()} sub={`${totalCalls} pickups`} />
        <Stat label="Conversion" value={`${conversionRate.toFixed(1)}%`} sub="of pickups" />
        <Stat label="Cost per Call" value={formatUSD(costPerCall, 3)} sub="pickups only" />
      </div>

      <Section title="Bot Leaderboard" sub="Sorted by annual premium revenue">
        {botRows.length === 0 ? <p className="text-sm text-gray-600 py-4">No data in this range</p> : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 uppercase border-b border-gray-700/50">
                <th className="text-left py-2 px-3">Bot</th><th className="text-left py-2 px-3">Model</th>
                <th className="text-right py-2 px-3">Dialed</th><th className="text-right py-2 px-3">Pickups</th><th className="text-right py-2 px-3">Sales</th>
                <th className="text-right py-2 px-3">Conv %</th><th className="text-right py-2 px-3">Revenue</th>
                <th className="text-right py-2 px-3">Cost</th><th className="text-right py-2 px-3">Profit</th>
                <th className="text-right py-2 px-3">Cost/Sale</th>
              </tr>
            </thead>
            <tbody>
              {botRows.map((b, i) => {
                const p = b.revenue - b.cost;
                const conv = b.pickups > 0 ? (b.sales / b.pickups) * 100 : 0;
                return (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2.5 px-3 text-white font-medium">{b.name}</td>
                    <td className="py-2.5 px-3 text-gray-500 font-mono">{b.model}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{b.calls}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{b.pickups}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-mono">{b.sales}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{conv.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{formatUSD(b.revenue, 0)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{formatUSD(b.cost, 2)}</td>
                    <td className={`py-2.5 px-3 text-right font-mono ${p >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatUSD(p, 0)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300 font-mono">{b.sales > 0 ? formatUSD(b.cost / b.sales, 2) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Top Objections" sub="Fix the top 2-3 to lift conversion">
        {topObjections.length === 0 ? <p className="text-sm text-gray-600 py-4">No objection data yet</p> : (
          <div className="space-y-2">
            {topObjections.map(([obj, count]) => {
              const max = topObjections[0][1];
              const pct = (count / max) * 100;
              const totalPct = totalCalls > 0 ? (count / totalCalls) * 100 : 0;
              return (
                <div key={obj} className="flex items-center gap-3">
                  <div className="w-44 text-xs text-gray-400">{OBJECTION_LABELS[obj] || obj}</div>
                  <div className="flex-1 relative h-6 bg-gray-800 rounded overflow-hidden">
                    <div className="h-full bg-gray-600 transition-all" style={{ width: `${pct}%` }} />
                    <div className="absolute inset-0 flex items-center px-2 text-[10px] font-mono text-gray-300">{count}</div>
                  </div>
                  <div className="w-12 text-right text-[10px] text-gray-500 font-mono">{totalPct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Stage Drop-off" sub="Where prospects bail">
        <div className="space-y-1.5">
          {[1,2,3,4,5,6,7,8].map(stage => {
            const count = stageCounts[stage];
            const pct = (count / maxStageCount) * 100;
            const overall = totalCalls > 0 ? (count / totalCalls) * 100 : 0;
            const prev = stage > 1 ? stageCounts[stage-1] : count;
            const step = prev > 0 ? (count / prev) * 100 : 0;
            return (
              <div key={stage} className="flex items-center gap-2">
                <div className="w-6 text-[10px] text-gray-600 font-mono text-right">S{stage}</div>
                <div className="w-36 text-[10px] text-gray-400">{STAGE_LABELS[stage]}</div>
                <div className="flex-1 relative h-5 bg-gray-800 rounded overflow-hidden">
                  <div className={`h-full transition-all ${stage <= 2 ? 'bg-gray-600' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  <div className="absolute inset-0 flex items-center px-2 text-[10px] font-mono text-gray-300">{count}</div>
                </div>
                <div className="w-10 text-right text-[10px] text-gray-500 font-mono">{overall.toFixed(0)}%</div>
                <div className="w-14 text-right text-[10px] text-gray-600 font-mono">{stage > 1 && prev > 0 ? `${step.toFixed(0)}% step` : ''}</div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Cost Methodology" sub="How we compute the numbers above">
        <div className="text-xs text-gray-500 space-y-2 py-2">
          <p><span className="text-emerald-400 font-mono">LLM (actual):</span> per-call token usage x model pricing. Sonnet $3/MT in, Haiku $1/MT, GPT-4o-mini $0.15/MT. Cache hits at 10%.</p>
          <p><span className="text-amber-400 font-mono">ElevenLabs (est):</span> transcript chars x $0.30/1k (Pro tier).</p>
          <p><span className="text-amber-400 font-mono">Telnyx (est):</span> duration x $0.0085/min outbound.</p>
          <p className="text-gray-700 pt-2 border-t border-gray-800">Reconcile against vendor invoices monthly. Estimates typically 5-15% off actual.</p>
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value, sub, accent, negative }: { label: string; value: string; sub?: string; accent?: boolean; negative?: boolean }) {
  return (
    <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-4">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${negative ? 'text-red-400' : accent ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5 mb-6">
      <div className="mb-4">
        <div className="text-sm font-semibold text-white">{title}</div>
        {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function RangeButton({ current, target, label }: { current: string; target: string; label: string }) {
  const isActive = current === target;
  return (
    <Link href={target === 'all' ? '/pnl' : `/pnl?range=${target}`} className={`px-2.5 py-1 rounded transition-colors ${isActive ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'}`}>
      {label}
    </Link>
  );
}
