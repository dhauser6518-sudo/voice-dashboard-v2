import { createServerClient } from '@/lib/supabase/server';
import { formatPhone, formatDuration } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: lead }, { data: calls }] = await Promise.all([
    supabase.from('voice_leads').select('*').eq('id', id).single(),
    supabase.from('voice_call_logs').select('*').eq('voice_lead_id', id).order('started_at', { ascending: false }),
  ]);

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Lead not found</p>
        <Link href="/leads" className="text-emerald-600 hover:underline mt-4 inline-block">← Back to leads</Link>
      </div>
    );
  }

  const leadName = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown';

  return (
    <div className="max-w-4xl">
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft size={14} />
        Back to leads
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{leadName}</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{formatPhone(lead.phone)}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          lead.status === 'qualified' || lead.status === 'booked' ? 'bg-emerald-50 text-emerald-700' :
          lead.dnc ? 'bg-red-50 text-red-700' :
          'bg-gray-100 text-gray-600'
        }`}>{lead.dnc ? 'DNC' : lead.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Section title="Contact">
          <Field label="Email" value={lead.email} />
          <Field label="Address" value={lead.street_address} />
          <Field label="City/State/Zip" value={[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')} />
          <Field label="DOB" value={lead.dob} />
        </Section>

        <Section title="Insurance">
          <Field label="Carrier" value={lead.existing_carrier} />
          <Field label="Coverage" value={lead.current_coverage ? `$${lead.current_coverage}` : null} />
          <Field label="Premium" value={lead.current_premium ? `$${lead.current_premium}/mo` : null} />
          <Field label="Source" value={lead.source} />
        </Section>
      </div>

      <Section title={`Call History (${calls?.length || 0})`}>
        {!calls || calls.length === 0 ? (
          <p className="text-sm text-gray-400 px-2 py-3">No calls yet</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {calls.map((c: { id: string; started_at: string | null; duration_seconds: number | null; stage_reached: number | null; outcome: string | null; status: string; recording_url: string | null }) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-2 font-mono text-xs text-gray-500">
                    {c.started_at ? format(new Date(c.started_at), 'MMM d, h:mm a') : '—'}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{formatDuration(c.duration_seconds)}</td>
                  <td className="px-2 py-2 text-xs">Stage {c.stage_reached || '—'}</td>
                  <td className="px-2 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.outcome === 'qualified' || c.outcome === 'booked' ? 'bg-emerald-50 text-emerald-700' :
                      c.outcome === 'dnc' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{c.outcome || c.status}</span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Link href={`/calls/${c.id}`} className="text-xs text-emerald-600 hover:underline">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs text-gray-400 uppercase mb-3">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="font-mono text-xs text-gray-700">{value || '—'}</span>
    </div>
  );
}
