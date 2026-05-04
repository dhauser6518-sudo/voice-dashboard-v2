import { getCartesiaKey, fetchAllCartesiaCalls } from '@/lib/cartesia';
import { formatPhone, formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const DISPOSITION_LABELS: Record<string, { label: string; color: string }> = {
  sale: { label: 'Sale', color: 'bg-emerald-500/20 text-emerald-400' },
  connected: { label: 'Connected', color: 'bg-blue-500/20 text-blue-400' },
  voicemail: { label: 'Voicemail', color: 'bg-amber-500/20 text-amber-400' },
  no_answer: { label: 'No Answer', color: 'bg-gray-700/50 text-gray-500' },
  failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400' },
  client_hangup: { label: 'Hang Up', color: 'bg-gray-700/50 text-gray-400' },
  agent_hangup: { label: 'Agent End', color: 'bg-gray-700/50 text-gray-400' },
};

function classifyCall(call: { status: string; start_time: string; end_time?: string; end_reason?: string; transcript?: { tool_calls?: { name: string }[] }[] }) {
  if (call.status === 'started') return 'in_progress';
  if (call.status === 'failed') return 'failed';

  const duration = call.end_time && call.start_time
    ? (new Date(call.end_time).getTime() - new Date(call.start_time).getTime()) / 1000
    : 0;

  if (call.transcript) {
    for (const turn of call.transcript) {
      if (turn.tool_calls?.some(tc => tc.name === 'record_sale')) return 'sale';
    }
  }

  if (duration <= 5) return 'no_answer';
  if (duration <= 15 && call.end_reason === 'agent_hangup') return 'voicemail';
  return 'connected';
}

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ outcome?: string; page?: string; range?: string }> }) {
  const params = await searchParams;
  const apiKey = await getCartesiaKey();

  let since: string | undefined;
  const range = params.range || '';
  if (range === '5m') {
    const d = new Date(); d.setMinutes(d.getMinutes() - 5);
    since = d.toISOString();
  } else if (range === '20m') {
    const d = new Date(); d.setMinutes(d.getMinutes() - 20);
    since = d.toISOString();
  } else if (range === '1h') {
    const d = new Date(); d.setHours(d.getHours() - 1);
    since = d.toISOString();
  } else if (range === 'today') {
    const d = new Date(); d.setHours(d.getHours() - 24);
    since = d.toISOString();
  }

  let calls = apiKey
    ? await fetchAllCartesiaCalls(apiKey, { limit: 500, since })
    : [];

  // Classify each call
  const classified = calls.map(c => {
    const duration = c.end_time && c.start_time
      ? Math.floor((new Date(c.end_time).getTime() - new Date(c.start_time).getTime()) / 1000)
      : null;
    const outcome = classifyCall(c as Parameters<typeof classifyCall>[0]);
    const leadName = c.metadata?.first_name
      ? `${c.metadata.first_name} ${c.metadata.last_name || ''}`.trim()
      : null;
    return { ...c, duration, outcome, leadName };
  });

  // Filter by outcome
  const filtered = params.outcome
    ? classified.filter(c => c.outcome === params.outcome)
    : classified;

  // Paginate
  const page = parseInt(params.page || '1');
  const perPage = 50;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <h1 className="text-xl font-bold text-white mb-6">Calls</h1>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex items-center gap-1 mr-2">
          {[{ value: '', label: 'All' }, { value: '5m', label: '5m' }, { value: '20m', label: '20m' }, { value: '1h', label: '1h' }, { value: 'today', label: 'Today' }].map(r => (
            <Link
              key={r.value}
              href={`/calls?range=${r.value}${params.outcome ? `&outcome=${params.outcome}` : ''}`}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                range === r.value ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2 flex-wrap">
          <input type="hidden" name="range" value={range} />
          <select name="outcome" defaultValue={params.outcome} className="px-3 py-1.5 text-sm bg-[#111827] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500">
            <option value="">All outcomes</option>
            <option value="sale">Sale</option>
            <option value="connected">Connected</option>
            <option value="voicemail">Voicemail</option>
            <option value="no_answer">No Answer</option>
            <option value="failed">Failed</option>
          </select>
          <button type="submit" className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors">Filter</button>
          {(params.outcome || range) && (
            <Link href="/calls" className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">Clear</Link>
          )}
        </form>
      </div>

      <div className="bg-[#111827] border border-gray-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-700/50">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Bot</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Disposition</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(call => {
              const dispInfo = DISPOSITION_LABELS[call.outcome] || { label: call.outcome, color: 'bg-gray-700/50 text-gray-500' };
              return (
                <tr key={call.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    <Link href={`/calls/${call.id}`} className="block">{format(new Date(call.start_time), 'MMM d, h:mm a')}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/calls/${call.id}`} className="block text-cyan-400 hover:text-cyan-300 font-medium text-xs">
                      {call.leadName || 'View call'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <Link href={`/calls/${call.id}`} className="block">{call.agent_name || '—'}</Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    <Link href={`/calls/${call.id}`} className="block">{formatPhone(call.telephony_params?.to || call.telephony_params?.from || '—')}</Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    <Link href={`/calls/${call.id}`} className="block">{formatDuration(call.duration)}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/calls/${call.id}`} className="block">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        call.telephony_params?.direction === 'inbound'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-700/50 text-gray-400'
                      }`}>
                        {call.telephony_params?.direction || '—'}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/calls/${call.id}`} className="block">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${dispInfo.color}`}>
                        {dispInfo.label}
                      </span>
                    </Link>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-600 text-sm">No calls yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/calls?page=${p}${params.outcome ? `&outcome=${params.outcome}` : ''}${range ? `&range=${range}` : ''}`}
              className={`px-3 py-1 text-sm rounded ${p === page ? 'bg-cyan-600 text-white' : 'bg-[#111827] border border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
