import { createServerClient } from '@/lib/supabase/server';
import { formatPhone } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { Upload, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; q?: string; list?: string }> }) {
  const params = await searchParams;
  const supabase = createServerClient();
  const page = parseInt(params.page || '1');
  const perPage = 50;
  const offset = (page - 1) * perPage;
  const selectedList = params.list || '';

  // Fetch lead lists with counts
  const { data: lists } = await supabase.from('lead_lists').select('id, name, description, created_at').order('created_at', { ascending: false });

  const listCounts: Record<string, number> = {};
  for (const list of lists || []) {
    const { count } = await supabase.from('voice_leads').select('id', { count: 'exact', head: true }).eq('source', list.name);
    listCounts[list.id] = count || 0;
  }

  // Total leads not in any list
  const { count: totalLeads } = await supabase.from('voice_leads').select('id', { count: 'exact', head: true });

  // Build leads query
  let query = supabase.from('voice_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + perPage - 1);

  if (selectedList && selectedList !== 'all') {
    const listObj = (lists || []).find(l => l.id === selectedList);
    if (listObj) query = query.eq('source', listObj.name);
  }
  if (params.status) query = query.eq('status', params.status);
  if (params.q) query = query.or(`full_name.ilike.%${params.q}%,phone.ilike.%${params.q}%`);

  const { data: leads, count } = await query;
  const totalPages = Math.ceil((count || 0) / perPage);

  const buildHref = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { list: selectedList, status: params.status || '', q: params.q || '', page: '1', ...overrides };
    for (const [k, v] of Object.entries(merged)) { if (v) p.set(k, v); }
    const qs = p.toString();
    return qs ? `/leads?${qs}` : '/leads';
  };

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Leads</h1>
        <Link href="/leads/upload" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors">
          <Upload size={14} />
          Upload CSV
        </Link>
      </div>

      {/* Lead List Cards */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <Link
          href="/leads"
          className={`shrink-0 rounded-xl border p-4 min-w-[160px] transition-all ${
            !selectedList ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-[#111827] border-gray-700/50 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className={!selectedList ? 'text-cyan-400' : 'text-gray-600'} />
            <span className={`text-xs font-semibold ${!selectedList ? 'text-white' : 'text-gray-400'}`}>All Leads</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${!selectedList ? 'text-cyan-400' : 'text-white'}`}>{(totalLeads || 0).toLocaleString()}</div>
        </Link>

        {(lists || []).map(list => {
          const isSelected = selectedList === list.id;
          const leadCount = listCounts[list.id] || 0;
          return (
            <Link
              key={list.id}
              href={buildHref({ list: list.id, page: '1' })}
              className={`shrink-0 rounded-xl border p-4 min-w-[160px] transition-all ${
                isSelected ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-[#111827] border-gray-700/50 hover:border-gray-600'
              }`}
            >
              <div className={`text-xs font-semibold mb-1 truncate max-w-[140px] ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                {list.name}
              </div>
              <div className={`text-2xl font-bold font-mono ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                {leadCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                {format(new Date(list.created_at), 'MMM d, yyyy')}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <form className="flex gap-2">
          <input name="q" defaultValue={params.q} placeholder="Search name or phone..." className="px-3 py-1.5 text-sm bg-[#111827] border border-gray-700 rounded-lg w-64 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
          {selectedList && <input type="hidden" name="list" value={selectedList} />}
          <select name="status" defaultValue={params.status} className="px-3 py-1.5 text-sm bg-[#111827] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500">
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="called">Called</option>
            <option value="qualified">Qualified</option>
            <option value="sale">Sale</option>
            <option value="application_started">Application Started</option>
            <option value="dnc">DNC</option>
          </select>
          <button type="submit" className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors">Filter</button>
          {(params.q || params.status) && (
            <Link href={selectedList ? `/leads?list=${selectedList}` : '/leads'} className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">Clear</Link>
          )}
        </form>
      </div>

      {/* Leads Table */}
      <div className="bg-[#111827] border border-gray-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-700/50">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">State</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Last Called</th>
              <th className="px-5 py-3">Calls</th>
              <th className="px-5 py-3">Last Outcome</th>
            </tr>
          </thead>
          <tbody>
            {(leads || []).map((lead: { id: string; full_name: string | null; first_name: string | null; last_name: string | null; phone: string; state: string | null; status: string; dnc: boolean; last_called_at: string | null; call_count: number; last_outcome: string | null }) => (
              <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/leads/${lead.id}`} className="text-gray-300 hover:text-cyan-400 font-medium">
                    {lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || '—'}
                  </Link>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{formatPhone(lead.phone)}</td>
                <td className="px-5 py-3 text-xs text-gray-500">{lead.state || '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    lead.status === 'sale' ? 'bg-emerald-500/20 text-emerald-400' :
                    lead.status === 'qualified' || lead.status === 'application_started' ? 'bg-emerald-500/10 text-emerald-400' :
                    lead.dnc ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-700/50 text-gray-400'
                  }`}>{lead.dnc ? 'DNC' : lead.status}</span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {lead.last_called_at ? format(new Date(lead.last_called_at), 'MMM d, h:mm a') : '—'}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{lead.call_count}</td>
                <td className="px-5 py-3 text-xs text-gray-400">{lead.last_outcome || '—'}</td>
              </tr>
            ))}
            {(!leads || leads.length === 0) && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-600 text-sm">No leads — upload a CSV to get started</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={buildHref({ page: p.toString() })}
              className={`px-3 py-1 text-sm rounded ${p === page ? 'bg-cyan-600 text-white' : 'bg-[#111827] border border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
