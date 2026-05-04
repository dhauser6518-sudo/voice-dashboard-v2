import { createServerClient } from '@/lib/supabase/server';
import { decryptApplicationData } from '@/lib/encryption';
import { getAuthUser } from '@/lib/supabase/auth-server';
import { formatPhone, formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type SaleRow = {
  id: string;
  call_control_id: string;
  phone: string;
  duration_seconds: number | null;
  outcome: string | null;
  stage_reached: number | null;
  recording_url: string | null;
  application_data: Record<string, unknown> | null;
  started_at: string | null;
  ended_at: string | null;
  voice_leads?: { full_name?: string; first_name?: string; last_name?: string; email?: string; state?: string } | { full_name?: string; first_name?: string; last_name?: string; email?: string; state?: string }[] | null;
  voice_agents?: { id: string; name: string } | { id: string; name: string }[] | null;
};

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ range?: string; agent?: string; view?: string }> }) {
  const params = await searchParams;
  const range = (params.range as '7d' | '30d' | 'all') || 'all';
  const agentFilter = params.agent || '';
  const view = params.view || 'all';
  const supabase = createServerClient();
  const user = await getAuthUser();

  let since: string | null = null;
  if (range === '7d') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    since = d.toISOString();
  } else if (range === '30d') {
    const d = new Date(); d.setDate(d.getDate() - 30);
    since = d.toISOString();
  }

  // If "My Sales", get user's bot IDs first
  let myBotIds: string[] = [];
  if (view === 'mine' && user) {
    const { data: myBots } = await supabase.from('voice_agents').select('id').eq('created_by', user.id);
    myBotIds = (myBots || []).map(b => b.id);
  }

  let query = supabase
    .from('voice_call_logs')
    .select('id, call_control_id, phone, duration_seconds, outcome, stage_reached, recording_url, application_data, started_at, ended_at, voice_leads(full_name, first_name, last_name, email, state), voice_agents(id, name)')
    .order('started_at', { ascending: false });

  query = query.eq('outcome', 'sale');
  if (since) query = query.gte('started_at', since);
  if (agentFilter) query = query.eq('voice_agent_id', agentFilter);
  if (view === 'mine' && myBotIds.length > 0) query = query.in('voice_agent_id', myBotIds);

  const { data: sales } = await query;
  const salesList = (sales || []) as SaleRow[];

  let totalPremium = 0;
  let totalCoverage = 0;
  for (const s of salesList) {
    const decrypted = s.application_data ? decryptApplicationData(s.application_data) : null;
    if (decrypted) {
      const premium = Number(decrypted.premium_quoted);
      const coverage = Number(decrypted.coverage_amount);
      if (!isNaN(premium)) totalPremium += premium * 12;
      if (!isNaN(coverage)) totalCoverage += coverage;
    }
  }

  const { data: agents } = await supabase.from('voice_agents').select('id, name').order('name');

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Sales</h1>
          <p className="text-sm text-gray-500 mt-1">Calls that captured banking info (sale closed)</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <RangeButton current={range} target="7d" label="7d" agent={agentFilter} />
          <RangeButton current={range} target="30d" label="30d" agent={agentFilter} />
          <RangeButton current={range} target="all" label="All time" agent={agentFilter} />
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6">
        <Link href="/sales" className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${view === 'all' ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'}`}>All Sales</Link>
        <Link href="/sales?view=mine" className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${view === 'mine' ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'}`}>My Sales</Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total Sales" value={salesList.length.toString()} accent />
        <Stat label="Annual Premium" value={`$${totalPremium.toLocaleString()}`} accent />
        <Stat label="Total Coverage" value={`$${totalCoverage.toLocaleString()}`} />
      </div>

      {(agents || []).length > 1 && (
        <div className="mb-4">
          <form className="flex gap-2 items-center">
            <label className="text-xs text-gray-500 uppercase">Filter by Bot</label>
            <select name="agent" defaultValue={agentFilter} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md">
              <option value="">All bots</option>
              {(agents || []).map((a: { id: string; name: string }) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {range !== 'all' && <input type="hidden" name="range" value={range} />}
            <button type="submit" className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md">Filter</button>
          </form>
        </div>
      )}

      <div className="bg-[#111827] border border-gray-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-700/50">
              <th className="px-5 py-2">Time</th>
              <th className="px-5 py-2">Lead</th>
              <th className="px-5 py-2">Bot</th>
              <th className="px-5 py-2">Carrier</th>
              <th className="px-5 py-2">Coverage</th>
              <th className="px-5 py-2">Premium</th>
              <th className="px-5 py-2">Annual</th>
              <th className="px-5 py-2">Duration</th>
              <th className="px-5 py-2">Recording</th>
            </tr>
          </thead>
          <tbody>
            {salesList.map(s => {
              const lead = Array.isArray(s.voice_leads) ? s.voice_leads[0] : s.voice_leads;
              const agent = Array.isArray(s.voice_agents) ? s.voice_agents[0] : s.voice_agents;
              const decrypted = s.application_data ? decryptApplicationData(s.application_data) : null;
              const carrier = decrypted?.carrier as string | null;
              const premium = Number(decrypted?.premium_quoted);
              const coverage = Number(decrypted?.coverage_amount);
              const annual = !isNaN(premium) ? premium * 12 : null;
              const leadName = lead?.full_name || `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || formatPhone(s.phone);
              return (
                <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">
                    {s.started_at ? format(new Date(s.started_at), 'MMM d, h:mm a') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/calls/${s.id}`} className="text-gray-300 hover:text-cyan-400 font-medium">
                      {leadName}
                    </Link>
                    <div className="text-xs text-gray-400 font-mono">{formatPhone(s.phone)}</div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {agent?.name || '—'}
                  </td>
                  <td className="px-5 py-3 text-xs">{carrier || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs">{!isNaN(coverage) ? `$${coverage.toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs">{!isNaN(premium) ? `$${premium}/mo` : '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-emerald-600">{annual !== null ? `$${annual.toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs">{formatDuration(s.duration_seconds)}</td>
                  <td className="px-5 py-3">
                    {s.recording_url ? (
                      <a href={s.recording_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">Play</a>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
            {salesList.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400 text-sm">
                No sales in this range yet — sales appear when a call captures banking info
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-4">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function RangeButton({ current, target, label, agent }: { current: string; target: string; label: string; agent: string }) {
  const isActive = current === target;
  const params = new URLSearchParams();
  if (target !== 'all') params.set('range', target);
  if (agent) params.set('agent', agent);
  const href = params.toString() ? `/sales?${params.toString()}` : '/sales';
  return (
    <Link href={href} className={`px-2.5 py-1 rounded transition-colors ${isActive ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'}`}>
      {label}
    </Link>
  );
}
