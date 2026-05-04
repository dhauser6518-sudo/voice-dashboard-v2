'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Rocket, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

type LaunchResult = {
  ok: boolean;
  campaign_id?: string;
  total?: number;
  succeeded?: number;
  failed?: number;
  error?: string;
};

export default function CampaignPage() {
  const [bots, setBots] = useState<CartesiaBot[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedBot, setSelectedBot] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [loadingBots, setLoadingBots] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
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

    fetchBots();
    fetchLists();
  }, []);

  const selectedListObj = lists.find(l => l.id === selectedList);
  const leadCount = selectedListObj?.lead_count || 0;

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
      } else {
        setResult({ ok: false, error: data.error || 'Failed to launch campaign' });
      }
    } catch {
      setResult({ ok: false, error: 'Network error' });
    } finally {
      setLaunching(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
        <div className="max-w-lg mx-auto mt-20 text-center">
          <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Campaign Complete</h2>
          <p className="text-sm text-gray-400 mb-1">{result.total} leads processed</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{result.succeeded}</div>
              <div className="text-[10px] text-gray-600 uppercase">Succeeded</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400 font-mono">{result.failed}</div>
              <div className="text-[10px] text-gray-600 uppercase">Failed</div>
            </div>
          </div>
          <Link href="/" className="inline-block mt-6 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6">
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <h1 className="text-xl font-bold text-white mb-6">Launch Campaign</h1>

        <div className="space-y-6">
          {/* Select Bot */}
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

          {/* Select Lead List */}
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

          {/* Campaign Name */}
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

          {/* Error display */}
          {result && !result.ok && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{result.error}</p>
            </div>
          )}

          {/* Launch Button */}
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
              <p className="text-xs text-gray-600 mt-1">This page will update when all calls are complete. Do not close this tab.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
