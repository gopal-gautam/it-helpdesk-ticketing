"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Tickets', href: '/tickets' },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'TEAM_LEAD') {
    navItems.push({ label: 'Reporting', href: '/reporting' });
  }

  if (user?.role === 'ADMIN') {
    navItems.push({ label: 'Audit Logs', href: '/audit-logs' });
  }

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/10">
              HD
            </div>
            <span className="font-bold tracking-tight text-white hidden sm:block">
              IT Helpdesk Portal
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'text-white bg-zinc-800/80'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <NotificationCenter />
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-sm font-semibold text-white">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-xs text-zinc-400">{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
