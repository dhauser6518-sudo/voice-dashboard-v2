import { createServerClient } from '@/lib/supabase/server';
import { formatPhone, formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const DISPOSITION_LABELS: Record<string, { label: string; color: string }> = {
  sale: { label: 'Sale', color: 'bg-emerald-500/20 text-emerald-400' },
  qualified: { label: 'Qualified', color: 'bg-emerald-500/10 text-emerald-400' },
  application_started: { label: 'App Started', color: 'bg-emerald-500/10 text-emerald-400' },
  connected: { label: 'Connected', color: 'bg-blue-500/20 text-blue-400' },
  not_interested: { label: 'Not Interested', color: 'bg-gray-700/50 text-gray-400' },
  dnc: { label: 'DNC', color: 'bg-red-500/20 text-red-400' },
  voicemail: { label: 'Voicemail', color: 'bg-amber-500/20 text-amber-400' },
  no_answer: { label: 'No Answer', color: 'bg-gray-700/50 text-gray-500' },
  busy: { label: 'Busy', color: 'bg-gray-700/50 text-gray-500' },
  wrong_number: { label: 'Wrong Number', color: 'bg-amber-500/20 text-amber-400' },
  hangup: { label: 'Hang Up', color: 'bg-gray-700/50 text-gray-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400' },
};

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ outcome?: string; page?: string }> }) {
  const params = await searchParams;
  const supabase = createServerClient();
  const page = parseInt(params.page || '1');
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from('voice_call_logs')
    .select('*, voice_leads(full_name, first_name, last_name), voice_agents(name)', { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.outcome) query = query.eq('outcome', params.outcome);

  const { data: calls, count } = await query;
  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <h1 className="text-xl font-bold text-white mb-6">Calls</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <form className="flex gap-2 flex-wrap">
          <select name="outcome" defaultValue={params.outcome} className="px-3 py-1.5 text-sm bg-[#111827] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500">
            <option value="">All outcomes</option>
            <option value="sale">Sale</option>
            <option value="connected">Connected</option>
            <option value="qualified">Qualified</option>
            <option value="application_started">App Started</option>
            <option value="not_interested">Not Interested</option>
            <option value="dnc">DNC</option>
            <option value="voicemail">Voicemail</option>
            <option value="no_answer">No Answer</option>
            <option value="hangup">Hang Up</option>
            <option value="wrong_number">Wrong Number</option>
          </select>
          <button type="submit" className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors">Filter</button>
          {params.outcome && (
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
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Disposition</th>
              <th className="px-4 py-3">Recording</th>
            </tr>
          </thead>
          <tbody>
            {(calls || []).map((call: { id: string; started_at: string | null; voice_leads?: { full_name?: string; first_name?: string; last_name?: string } | null; voice_agents?: { name?: string } | null; phone: string; duration_seconds: number | null; stage_reached: number | null; outcome: string | null; disposition: string | null; recording_url: string | null; status: string }) => {
              const leadName = call.voice_leads?.full_name || `${call.voice_leads?.first_name || ''} ${call.voice_leads?.last_name || ''}`.trim() || '—';
              const botName = (call.voice_agents as { name?: string } | null)?.name || '—';
              const disp = call.outcome || call.disposition || call.status || 'unknown';
              const dispInfo = DISPOSITION_LABELS[disp] || { label: disp, color: 'bg-gray-700/50 text-gray-500' };
              return (
                <tr key={call.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {call.started_at ? format(new Date(call.started_at), 'MMM d, h:mm a') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/calls/${call.id}`} className="text-gray-300 hover:text-cyan-400 font-medium text-xs">
                      {leadName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{botName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{call.phone ? formatPhone(call.phone) : '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{formatDuration(call.duration_seconds)}</td>
                  <td className="px-4 py-3">
                    {call.stage_reached ? (
                      <span className="font-mono text-xs text-gray-300">S{call.stage_reached}</span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${dispInfo.color}`}>
                      {dispInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {call.recording_url ? (
                      <audio controls preload="none" className="h-7 w-32" style={{ filter: 'invert(0.8)' }}>
                        <source src={call.recording_url} type="audio/mpeg" />
                      </audio>
                    ) : <span className="text-xs text-gray-700">—</span>}
                  </td>
                </tr>
              );
            })}
            {(!calls || calls.length === 0) && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-600 text-sm">No calls yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/calls?page=${p}${params.outcome ? `&outcome=${params.outcome}` : ''}`}
              className={`px-3 py-1 text-sm rounded ${p === page ? 'bg-cyan-600 text-white' : 'bg-[#111827] border border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
