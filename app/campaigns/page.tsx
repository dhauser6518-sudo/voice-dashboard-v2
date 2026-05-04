'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Rocket, CheckCircle, AlertCircle, Loader2, Play, Pause, RotateCcw } from 'lucide-react';

type CartesiaBot = {
  id: string;
  name: string;
  is_live: boolean;
};

type LeadList = {
  id: string;
  name: string;
  lead_count: number;
  created_at: string;
};

type Campaign = {
  id: string;
  name: string;
  agent_id: string;
  status: string;
  total_leads: number;
  calls_made: number;
  calls_succeeded: number;
  calls_failed: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type LaunchResult = {
  ok: boolean;
  campaign_id?: string;
  total?: number;
  succeeded?: number;
  failed?: number;
  error?: string;
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  running: { label: 'Running', color: 'bg-emerald-500/20 text-emerald-400' },
  paused: { label: 'Paused', color: 'bg-amber-500/20 text-amber-400' },
  completed: { label: 'Completed', color: 'bg-blue-500/20 text-blue-400' },
  draft: { label: 'Draft', color: 'bg-gray-700/50 text-gray-400' },
};

export default function CampaignPage() {
  const [bots, setBots] = useState<CartesiaBot[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedBot, setSelectedBot] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [loadingBots, setLoadingBots] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBots();
    fetchLists();
    fetchCampaigns();
  }, []);

  async function fetchBots() {
    try {
      const res = await fetch('/api/bots');
      const data = await res.json();
      if (res.ok) setBots(data.bots || []);
    } catch {} finally {
      setLoadingBots(false);
    }
  }

  async function fetchLists() {
    try {
      const res = await fetch('/api/lead-lists');
      const data = await res.json();
      if (res.ok) setLists(data.lists || []);
    } catch {} finally {
      setLoadingLists(false);
    }
  }

  async function fetchCampaigns() {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns || []);
    } catch {} finally {
      setLoadingCampaigns(false);
    }
  }

  async function toggleCampaign(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'running' ? 'paused' : 'running';
    setTogglingId(id);
    try {
      const res = await fetch('/api/campaigns/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id, status: newStatus }),
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      }
    } catch {} finally {
      setTogglingId(null);
    }
  }

  const selectedListObj = lists.find(l => l.id === selectedList);
  const leadCount = selectedListObj?.lead_count || 0;
  const botMap = Object.fromEntries(bots.map(b => [b.id, b.name]));

  async function handleLaunch() {
    if (!selectedBot || !selectedList) return;
    setLaunching(true);
    setResult(null);

    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedBot,
          lead_list_id: selectedList,
          name: campaignName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, ...data });
        fetchCampaigns();
      } else {
        setResult({ ok: false, error: data.error || 'Failed to launch campaign' });
      }
    } catch {
      setResult({ ok: false, error: 'Network error' });
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6">
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <h1 className="text-xl font-bold text-white mb-6">Campaigns</h1>

        {/* Campaign List */}
        {!loadingCampaigns && campaigns.length > 0 && (
          <div className="bg-[#111827] border border-gray-700/50 rounded-xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-gray-700/50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Campaigns</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-gray-600 uppercase border-b border-gray-800/50">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Agent</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Progress</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2 text-right">Toggle</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const style = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                  const canToggle = c.status === 'running' || c.status === 'paused';
                  const progress = c.total_leads > 0
                    ? Math.round((c.calls_made / c.total_leads) * 100)
                    : 0;
                  return (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 text-white text-xs font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{botMap[c.agent_id] || c.agent_id.slice(0, 12)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.color}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {c.calls_made}/{c.total_leads}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-[10px] font-mono">
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canToggle ? (
                          <button
                            onClick={() => toggleCampaign(c.id, c.status)}
                            disabled={togglingId === c.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold rounded-lg transition-colors ${
                              c.status === 'running'
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            } disabled:opacity-50`}
                          >
                            {togglingId === c.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : c.status === 'running' ? (
                              <Pause size={10} />
                            ) : (
                              <Play size={10} />
                            )}
                            {c.status === 'running' ? 'Pause' : 'Resume'}
                          </button>
                        ) : c.status === 'completed' ? (
                          <button
                            onClick={() => toggleCampaign(c.id, 'paused')}
                            disabled={togglingId === c.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw size={10} />
                            Restart
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {loadingCampaigns && (
          <div className="text-center py-8 mb-8">
            <p className="text-gray-600 text-xs">Loading campaigns...</p>
          </div>
        )}

        {/* Launch New Campaign */}
        <h2 className="text-sm font-bold text-white mb-4">Launch New Campaign</h2>

        {result?.ok && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">Campaign Complete</p>
            <p className="text-xs text-gray-400 mt-1">{result.total} leads processed — {result.succeeded} succeeded, {result.failed} failed</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Select Agent (Cartesia Bot)
            </label>
            {loadingBots ? (
              <p className="text-xs text-gray-600">Loading agents...</p>
            ) : bots.length === 0 ? (
              <p className="text-xs text-red-400">No Cartesia agents found. Check your API key in Settings.</p>
            ) : (
              <select
                value={selectedBot}
                onChange={e => setSelectedBot(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#0B1120] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Choose an agent...</option>
                {bots.map(bot => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name} {bot.is_live ? '(Live)' : '(Offline)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Select Lead List
            </label>
            {loadingLists ? (
              <p className="text-xs text-gray-600">Loading lead lists...</p>
            ) : lists.length === 0 ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">No lead lists found.</p>
                <Link href="/leads/upload" className="text-xs text-cyan-400 hover:text-cyan-300">Upload a CSV first</Link>
              </div>
            ) : (
              <>
                <select
                  value={selectedList}
                  onChange={e => setSelectedList(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#0B1120] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Choose a lead list...</option>
                  {lists.map(list => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list.lead_count} leads)
                    </option>
                  ))}
                </select>
                {selectedListObj && (
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-[#0B1120] border border-gray-700 rounded-lg px-4 py-2">
                      <div className="text-[10px] text-gray-600 uppercase">Leads</div>
                      <div className="text-lg font-bold text-cyan-400 font-mono">{leadCount}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Created {new Date(selectedListObj.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Campaign Name (optional)
            </label>
            <input
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="e.g. May 2026 FE Blast"
              className="w-full px-3 py-2 text-sm bg-[#0B1120] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {result && !result.ok && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{result.error}</p>
            </div>
          )}

          <button
            onClick={handleLaunch}
            disabled={launching || !selectedBot || !selectedList}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {launching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Launching... (calling {leadCount} leads)
              </>
            ) : (
              <>
                <Rocket size={16} />
                Launch Campaign {leadCount > 0 ? `(${leadCount} leads)` : ''}
              </>
            )}
          </button>

          {launching && (
            <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5 text-center">
              <p className="text-sm text-gray-400">Campaign is running server-side at ~1 call/second.</p>
              <p className="text-xs text-gray-600 mt-1">This page will update when all calls are complete.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
