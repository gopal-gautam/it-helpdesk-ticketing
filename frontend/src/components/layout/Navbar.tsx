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

  if (user?.role === 'AGENT' || user?.role === 'TEAM_LEAD' || user?.role === 'ADMIN') {
    navItems.push({ label: 'Workload', href: '/workload' });
  }

  if (user?.role === 'ADMIN' || user?.role === 'TEAM_LEAD') {
    navItems.push({ label: 'Reporting', href: '/reporting' });
  }

  if (user?.role === 'ADMIN') {
    navItems.push({ label: 'Audit Logs', href: '/audit-logs' });
    navItems.push({ label: 'Admin', href: '/admin' });
  }

  return (
    <header className="border-b border-slate-200 bg-white backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
              HD
            </div>
            <span className="font-bold tracking-tight text-slate-900 hidden sm:block">
              IT Helpdesk Portal
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <NotificationCenter />
          <Link href="/profile" className="flex flex-col text-right hidden md:flex hover:opacity-80 transition-opacity">
            <span className="text-sm font-semibold text-slate-900">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-xs text-slate-500">{user?.email}</span>
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
