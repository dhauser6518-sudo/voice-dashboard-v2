'use client';

import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Zap } from 'lucide-react';
import Link from 'next/link';

type ActiveCall = { id: string; phone: string; lead: string | null; bot: string | null; started_at: string; duration: number };
type RecentCall = { id: string; phone: string; lead: string | null; bot: string | null; outcome: string | null; disposition: string | null; stage: number | null; duration: number | null; ended_at: string };

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return p;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function LiveFeed() {
  const [active, setActive] = useState<ActiveCall[]>([]);
  const [recent, setRecent] = useState<RecentCall[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const res = await fetch('/api/live');
        if (res.ok && mounted) {
          const data = await res.json();
          setActive(data.active || []);
          setRecent(data.recent || []);
        }
      } catch { /* ignore */ }
    }
    poll();
    const interval = setInterval(() => { poll(); setTick(t => t + 1); }, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (active.length === 0) return;
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [active.length]);

  const hasActivity = active.length > 0 || recent.length > 0;
  const totalCount = active.length + recent.length;

  return (
    <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className={active.length > 0 ? 'text-emerald-400 animate-pulse' : 'text-gray-600'} />
        <h2 className="text-sm font-semibold text-white">Live Activity</h2>
        {totalCount > 0 && (
          <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full font-semibold">
            {active.length > 0 ? `${active.length} active` : `${totalCount} recent`}
          </span>
        )}
      </div>

      {!hasActivity ? (
        <p className="text-xs text-gray-600 text-center py-4">No activity — turn on a bot to start dialing</p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
          {active.map(c => {
            const elapsed = c.started_at ? Math.floor((Date.now() - new Date(c.started_at).getTime()) / 1000) : 0;
            return (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone size={12} className="text-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs text-white font-medium truncate">{c.lead || 'Unknown'}</span>
                  <span className="text-[10px] text-gray-600 font-mono shrink-0">{formatPhone(c.phone)}</span>
                  {c.bot && <span className="text-[10px] text-gray-600 shrink-0">· {c.bot}</span>}
                </div>
                <span className="text-xs text-emerald-400 font-mono shrink-0 ml-2">{formatDuration(elapsed)}</span>
              </div>
            );
          })}

          {recent.map(c => (
            <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <PhoneOff size={12} className={
                  c.outcome === 'sale' ? 'text-emerald-400' :
                  c.outcome === 'dnc' ? 'text-red-400' : 'text-gray-600'
                } />
                <span className="text-xs text-gray-300 truncate">{c.lead || 'Unknown'}</span>
                <span className="text-[10px] text-gray-600 font-mono shrink-0">{formatPhone(c.phone)}</span>
                {c.bot && <span className="text-[10px] text-gray-700 shrink-0">· {c.bot}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  c.outcome === 'sale' ? 'bg-emerald-500/20 text-emerald-400' :
                  c.outcome === 'dnc' ? 'bg-red-500/20 text-red-400' :
                  c.outcome === 'voicemail' ? 'bg-amber-500/20 text-amber-400' :
                  c.outcome === 'no_answer' ? 'bg-gray-700/50 text-gray-500' :
                  c.outcome === 'not_interested' ? 'bg-gray-700/50 text-gray-400' :
                  'bg-gray-700/50 text-gray-500'
                }`}>{c.outcome || c.disposition || 'connected'}</span>
                {c.duration != null && <span className="text-[10px] text-gray-600 font-mono">{formatDuration(c.duration)}</span>}
                <span className="text-[10px] text-gray-700 w-12 text-right">{c.ended_at ? timeAgo(c.ended_at) : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
