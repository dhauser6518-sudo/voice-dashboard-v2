'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Phone, DollarSign, FileText, TrendingUp, Settings, LogOut, Rocket } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/campaigns', label: 'Campaigns', icon: Rocket },
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/sales', label: 'Sales', icon: DollarSign },
  { href: '/scripts', label: 'Scripts', icon: FileText },
  { href: '/pnl', label: 'P&L', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-56 bg-gray-900 text-white min-h-screen flex flex-col py-6 px-3 shrink-0">
      <div className="px-3 mb-8">
        <h1 className="text-lg font-bold tracking-tight">Voice Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">AI Voice Agent</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-gray-800/50 transition-colors mt-2"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </aside>
  );
}
