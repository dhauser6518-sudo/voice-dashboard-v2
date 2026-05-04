'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardStats from '@/components/DashboardStats';
import LiveFeed from '@/components/LiveFeed';
import TestCallButton from '@/components/TestCallButton';

type CartesiaPhoneNumber = {
  id: string;
  phone_number: string;
  provider: { type: string };
};

type CartesiaBot = {
  id: string;
  name: string;
  is_live: boolean;
  tts_voice: string | null;
  phoneNumbers: CartesiaPhoneNumber[] | null;
  created_at: string;
  description?: string;
  git_deploy_branch?: string;
};

export default function HomePage() {
  const [bots, setBots] = useState<CartesiaBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('today');
  const [direction, setDirection] = useState<'all' | 'inbound' | 'outbound'>('all');

  useEffect(() => {
    async function fetchBots() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/bots');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to fetch bots');
          setBots([]);
        } else {
          setBots(data.bots || []);
        }
      } catch {
        setError('Network error fetching bots');
      } finally {
        setLoading(false);
      }
    }
    fetchBots();
  }, []);

  const liveBots = bots.filter(b => b.is_live).length;

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Bot Command Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {liveBots} of {bots.length} bots live
          </p>
        </div>
        <Link
          href="/campaigns"
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors"
        >
          Launch Campaign
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          {(['today', '7d', '30d', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                range === r ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7d' : r === '30d' ? '30d' : 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'inbound', 'outbound'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                direction === d ? 'bg-cyan-600 text-white' : 'bg-[#111827] text-gray-400 hover:bg-gray-800'
              }`}
            >
              {d === 'all' ? 'All Calls' : d === 'inbound' ? 'Inbound' : 'Outbound'}
            </button>
          ))}
        </div>
      </div>

      <DashboardStats range={range} direction={direction} />

      <div className="mb-6">
        <LiveFeed direction={direction} />
      </div>

      {loading ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">Loading Cartesia agents...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-600 text-xs mt-2">Check your Cartesia API key in Settings</p>
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">No Cartesia agents found</p>
          <p className="text-gray-600 text-xs mt-2">Create an agent in Cartesia to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {bots.map((bot) => {
            const phoneNumber = bot.phoneNumbers?.[0]?.phone_number || null;
            return (
              <div
                key={bot.id}
                className={`rounded-xl border p-5 transition-all ${
                  bot.is_live
                    ? 'bg-[#111827] border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                    : 'bg-[#111827] border-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${bot.is_live ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                    <div>
                      <h3 className="text-white font-semibold text-sm">{bot.name}</h3>
                      {bot.description && (
                        <p className="text-gray-500 text-xs truncate max-w-[200px]">{bot.description}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    bot.is_live
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {bot.is_live ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-y-1.5 mb-4 text-xs">
                  <ConfigRow label="Agent ID" value={bot.id.slice(0, 12) + '...'} title={bot.id} />
                  <ConfigRow label="Phone" value={phoneNumber || 'No number'} />
                  {bot.tts_voice && <ConfigRow label="Voice" value={bot.tts_voice.slice(0, 20)} title={bot.tts_voice} />}
                  {bot.git_deploy_branch && <ConfigRow label="Branch" value={bot.git_deploy_branch} />}
                </div>

                <div className="border-t border-gray-700/50 mb-4" />

                <div className="flex items-center justify-between pt-1">
                  <TestCallButton botId={bot.id} />
                  <Link href={`/bots/${bot.id}`} className="text-xs text-cyan-400 hover:text-cyan-300">
                    Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConfigRow({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-400 font-mono truncate max-w-[180px]" title={title}>{value}</span>
    </div>
  );
}
