'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto bg-[#0B1120]">{children}</main>
    </>
  );
}
