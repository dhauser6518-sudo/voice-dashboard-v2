'use client';

import { useState, useEffect } from 'react';

type Stats = {
  activeBots: number;
  totalBots: number;
  activeCalls: number;
  totalCalls: number;
  pickups: number;
  voicemails: number;
  totalSales: number;
  totalPremium: number;
};

export default function DashboardStats({ range }: { range: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const res = await fetch(`/api/stats?range=${range}`);
        if (res.ok && mounted) setStats(await res.json());
      } catch {}
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [range]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-5 gap-3 mb-8">
      <Stat label="Active Bots" value={stats.activeBots.toString()} sub={`of ${stats.totalBots}`} color="cyan" />
      <Stat label="Dialed" value={stats.totalCalls.toLocaleString()} sub={`${stats.activeCalls} active`} color="white" />
      <Stat label="Connections" value={stats.pickups.toLocaleString()} sub={stats.totalCalls > 0 ? `${Math.round(stats.pickups / stats.totalCalls * 100)}% rate` : ''} color="cyan" />
      <Stat label="Total Sales" value={stats.totalSales.toLocaleString()} color="emerald" />
      <Stat label="Annual Premium" value={`$${stats.totalPremium.toLocaleString()}`} color="emerald" />
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const colorClass = color === 'emerald' ? 'text-emerald-400' : color === 'cyan' ? 'text-cyan-400' : 'text-white';
  return (
    <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-4">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}
