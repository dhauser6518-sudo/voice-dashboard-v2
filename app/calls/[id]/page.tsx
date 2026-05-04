import { createServerClient } from '@/lib/supabase/server';
import { formatPhone, formatDuration } from '@/lib/utils';
import { decryptApplicationData } from '@/lib/encryption';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type TranscriptTurn = { role: string; text: string; ts: string };
type AIResponse = { text: string; ts: string; input_tokens?: number; output_tokens?: number; cache_read?: boolean; cache_create?: boolean };

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: call } = await supabase
    .from('voice_call_logs')
    .select('*, voice_leads(*)')
    .eq('id', id)
    .single();

  if (!call) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Call not found</p>
        <Link href="/calls" className="text-emerald-600 hover:underline mt-4 inline-block">← Back to calls</Link>
      </div>
    );
  }

  const lead = call.voice_leads;
  const leadName = lead?.full_name || `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || 'Unknown';
  const transcript: TranscriptTurn[] = Array.isArray(call.transcript) ? call.transcript : [];
  const aiResponses: AIResponse[] = Array.isArray(call.ai_responses) ? call.ai_responses : [];
  const decryptedAppData = call.application_data ? decryptApplicationData(call.application_data) : null;

  const totalCacheHits = aiResponses.filter(r => r.cache_read).length;
  const totalTokens = (call.total_input_tokens || 0) + (call.total_output_tokens || 0);

  return (
    <div className="max-w-5xl">
      <Link href="/calls" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft size={14} />
        Back to calls
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{leadName}</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{formatPhone(call.phone)}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            call.outcome === 'qualified' || call.outcome === 'booked' || call.outcome === 'application_started' ? 'bg-emerald-50 text-emerald-700' :
            call.outcome === 'dnc' ? 'bg-red-50 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>{call.outcome || call.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Started" value={call.started_at ? format(new Date(call.started_at), 'MMM d, h:mm a') : '—'} />
        <Stat label="Duration" value={formatDuration(call.duration_seconds)} />
        <Stat label="Stage Reached" value={call.stage_reached?.toString() || '—'} />
        <Stat label="Tokens" value={totalTokens.toString()} hint={`${totalCacheHits} cache hits`} />
      </div>

      {call.recording_url && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-xs text-gray-400 uppercase mb-2">Recording</div>
          <audio controls className="w-full" src={call.recording_url} />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="text-xs text-gray-400 uppercase mb-3">Transcript ({transcript.length} turns)</div>
        {transcript.length === 0 ? (
          <p className="text-sm text-gray-400">No transcript available</p>
        ) : (
          <div className="space-y-3">
            {transcript.map((turn, idx) => (
              <div key={idx} className={`flex gap-3 ${turn.role === 'caller' ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className="w-12 flex-shrink-0 text-xs text-gray-400 uppercase mt-1">
                  {turn.role === 'caller' ? 'Lead' : 'Alex'}
                </div>
                <div className={`flex-1 text-sm rounded-lg px-3 py-2 ${
                  turn.role === 'caller' ? 'bg-gray-50 text-gray-700' : 'bg-emerald-50 text-emerald-900'
                }`}>
                  {turn.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {decryptedAppData && Object.keys(decryptedAppData).some(k => decryptedAppData[k]) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-xs text-gray-400 uppercase mb-3">Application Data (decrypted)</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(decryptedAppData).map(([k, v]) => (
              v ? (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-400 text-xs">{k}</span>
                  <span className="font-mono text-xs">{String(v)}</span>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}

      {call.ai_summary && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase mb-2">AI Summary</div>
          <p className="text-sm text-gray-700">{call.ai_summary}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="text-xs text-gray-400 uppercase">{label}</div>
      <div className="text-sm font-mono mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}
