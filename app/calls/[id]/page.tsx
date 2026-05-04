import { getCartesiaKey } from '@/lib/cartesia';
import { formatPhone, formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type TranscriptTurn = {
  role: string;
  text: string;
  start_timestamp?: number;
  end_timestamp?: number;
  tool_calls?: { id: string; name: string; arguments: Record<string, unknown>; result: string }[];
};

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = await getCartesiaKey();

  if (!apiKey) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">No Cartesia API key configured</p>
        <Link href="/calls" className="text-cyan-400 hover:underline mt-4 inline-block">Back to calls</Link>
      </div>
    );
  }

  const res = await fetch(`https://api.cartesia.ai/agents/calls/${id}?expand=transcript`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': '2025-04-16',
    },
  });

  if (!res.ok) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Call not found</p>
        <Link href="/calls" className="text-cyan-400 hover:underline mt-4 inline-block">Back to calls</Link>
      </div>
    );
  }

  const call = await res.json();
  const meta = call.metadata || {};
  const leadName = meta.first_name
    ? `${meta.first_name} ${meta.last_name || ''}`.trim()
    : 'Unknown';
  const phone = call.telephony_params?.to || call.telephony_params?.from || '—';
  const direction = call.telephony_params?.direction || '—';
  const transcript: TranscriptTurn[] = Array.isArray(call.transcript) ? call.transcript : [];

  const duration = call.end_time && call.start_time
    ? Math.floor((new Date(call.end_time).getTime() - new Date(call.start_time).getTime()) / 1000)
    : null;

  return (
    <div className="max-w-5xl -m-8 p-8 bg-[#0B1120] min-h-screen">
      <Link href="/calls" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-4">
        <ArrowLeft size={14} />
        Back to calls
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{leadName}</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{formatPhone(phone)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            direction === 'inbound' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700/50 text-gray-400'
          }`}>{direction}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            call.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
            call.status === 'failed' ? 'bg-red-500/20 text-red-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>{call.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Started" value={call.start_time ? format(new Date(call.start_time), 'MMM d, h:mm a') : '—'} />
        <Stat label="Duration" value={formatDuration(duration)} />
        <Stat label="End Reason" value={call.end_reason || '—'} />
        <Stat label="Agent" value={call.agent_name || '—'} />
      </div>

      {call.summary && (
        <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-4 mb-6">
          <div className="text-xs text-gray-500 uppercase mb-2">Summary</div>
          <p className="text-sm text-gray-300">{call.summary}</p>
        </div>
      )}

      <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-4 mb-6">
        <div className="text-xs text-gray-500 uppercase mb-3">Transcript ({transcript.length} turns)</div>
        {transcript.length === 0 ? (
          <p className="text-sm text-gray-600">No transcript available</p>
        ) : (
          <div className="space-y-3">
            {transcript.map((turn, idx) => (
              <div key={idx}>
                <div className={`flex gap-3 ${turn.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="w-14 flex-shrink-0 text-xs text-gray-500 uppercase mt-1 text-right">
                    {turn.role === 'user' ? 'Caller' : 'Katie'}
                  </div>
                  <div className={`flex-1 text-sm rounded-lg px-3 py-2 ${
                    turn.role === 'user'
                      ? 'bg-gray-800/50 text-gray-300'
                      : 'bg-emerald-900/20 text-emerald-200 border border-emerald-800/30'
                  }`}>
                    {turn.text}
                  </div>
                </div>
                {turn.tool_calls && turn.tool_calls.length > 0 && (
                  <div className="ml-[68px] mt-1 space-y-1">
                    {turn.tool_calls.map(tc => (
                      <div key={tc.id} className="text-[10px] font-mono bg-cyan-900/20 border border-cyan-800/30 rounded px-2 py-1 text-cyan-300">
                        {tc.name}({JSON.stringify(tc.arguments)}) → {tc.result?.slice(0, 120)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111827] border border-gray-700/50 rounded-xl px-4 py-3">
      <div className="text-[10px] text-gray-600 uppercase">{label}</div>
      <div className="text-sm font-mono text-white mt-1">{value}</div>
    </div>
  );
}
