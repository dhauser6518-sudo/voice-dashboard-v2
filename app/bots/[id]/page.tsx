'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TestCallButton from '@/components/TestCallButton';

type Deployment = {
  id: string;
  status: string;
  created_at?: string;
};

type CartesiaAgent = {
  id: string;
  name: string;
  is_live: boolean;
  tts_voice: string | null;
  phoneNumbers: string[] | null;
  created_at: string;
  description?: string;
  git_deploy_branch?: string;
  pinned_version?: {
    id?: string;
    deployments?: Deployment[];
  };
  language?: string;
  [key: string]: unknown;
};

export default function BotDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [bot, setBot] = useState<CartesiaAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBot() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bots/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to fetch agent');
        } else {
          setBot(data);
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchBot();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen -m-8 p-8 bg-[#0B1120] text-center py-16">
        <p className="text-gray-500">Loading agent...</p>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="min-h-screen -m-8 p-8 bg-[#0B1120] text-center py-16">
        <p className="text-red-400">{error || 'Agent not found'}</p>
        <Link href="/" className="text-cyan-400 hover:underline mt-4 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const phoneNumber = bot.phoneNumbers?.[0] || null;
  const deployments = bot.pinned_version?.deployments || [];

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6">
        <ArrowLeft size={14} />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${bot.is_live ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <div>
            <h1 className="text-xl font-bold text-white">{bot.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {bot.description || 'Cartesia Agent'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TestCallButton botId={bot.id} />
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            bot.is_live
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {bot.is_live ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Agent Info */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <DetailStat label="Status" value={bot.is_live ? 'Live' : 'Offline'} accent={bot.is_live} />
        <DetailStat label="Phone" value={phoneNumber || 'None'} />
        <DetailStat label="Voice ID" value={bot.tts_voice ? bot.tts_voice.slice(0, 16) + '...' : 'Default'} title={bot.tts_voice || undefined} />
        <DetailStat label="Branch" value={bot.git_deploy_branch || 'N/A'} />
      </div>

      {/* Configuration */}
      <div className="bg-[#111827] rounded-xl border border-gray-700/50 p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Agent Configuration</h2>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-gray-600">Agent ID</span><br />
            <span className="text-gray-300 font-mono text-[10px] break-all">{bot.id}</span>
          </div>
          <div>
            <span className="text-gray-600">Voice ID</span><br />
            <span className="text-gray-300 font-mono text-[10px] break-all">{bot.tts_voice || 'Default'}</span>
          </div>
          <div>
            <span className="text-gray-600">Phone Number</span><br />
            <span className="text-gray-300 font-mono">{phoneNumber || 'No number assigned'}</span>
          </div>
          <div>
            <span className="text-gray-600">Git Branch</span><br />
            <span className="text-gray-300 font-mono">{bot.git_deploy_branch || 'N/A'}</span>
          </div>
          {bot.language && (
            <div>
              <span className="text-gray-600">Language</span><br />
              <span className="text-gray-300 font-mono">{bot.language}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Created</span><br />
            <span className="text-gray-300 font-mono">{new Date(bot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          {bot.pinned_version?.id && (
            <div>
              <span className="text-gray-600">Pinned Version</span><br />
              <span className="text-gray-300 font-mono text-[10px] break-all">{bot.pinned_version.id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Phone Numbers */}
      {bot.phoneNumbers && bot.phoneNumbers.length > 0 && (
        <div className="bg-[#111827] rounded-xl border border-gray-700/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Phone Numbers ({bot.phoneNumbers.length})</h2>
          <div className="flex flex-wrap gap-2">
            {bot.phoneNumbers.map((num, i) => (
              <span key={i} className="px-3 py-1 bg-[#0B1120] border border-gray-700 rounded-lg text-sm text-gray-300 font-mono">
                {num}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deployment Status */}
      {deployments.length > 0 && (
        <div className="bg-[#111827] rounded-xl border border-gray-700/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Deployments</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-600 uppercase border-b border-gray-700/50">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((dep, i) => (
                <tr key={dep.id || i} className="border-b border-gray-800/50">
                  <td className="py-2 px-3 text-gray-300 font-mono text-[10px]">{dep.id || '---'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      dep.status === 'active' || dep.status === 'deployed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : dep.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-700/50 text-gray-400'
                    }`}>
                      {dep.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-500 font-mono">
                    {dep.created_at ? new Date(dep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '---'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetailStat({ label, value, accent, title }: { label: string; value: string; accent?: boolean; title?: string }) {
  return (
    <div className="bg-[#111827] rounded-xl border border-gray-700/50 px-4 py-3">
      <div className="text-[10px] text-gray-600 uppercase">{label}</div>
      <div className={`text-lg font-bold font-mono mt-1 truncate ${accent ? 'text-emerald-400' : 'text-white'}`} title={title}>{value}</div>
    </div>
  );
}
