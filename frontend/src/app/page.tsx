"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { api } from '@/lib/api';

type TicketSummary = {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  OPEN: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  WAITING_ON_USER: 'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [recentTickets, setRecentTickets] = useState<TicketSummary[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      api.get<TicketSummary[]>('/tickets')
        .then((data) => setRecentTickets(data.slice(0, 5)))
        .catch(() => {})
        .finally(() => setTicketsLoading(false));
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getRoleBadgeClass = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'TEAM_LEAD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'AGENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Welcome Banner */}
        <div className="mb-10 p-8 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-slate-500 max-w-xl">
                Here is your dashboard overview. Use the navigation above to manage tickets, view reports, and more.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">Role:</span>
              <span className={`px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Link href="/tickets" className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-50 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">All Tickets</h3>
            <p className="text-xs text-slate-500 mt-1">View and manage all support tickets</p>
          </Link>

          {user.role === 'REQUESTER' && (
            <Link href="/tickets/new" className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-200 shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 group-hover:bg-emerald-50 transition-colors">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">New Ticket</h3>
              <p className="text-xs text-slate-500 mt-1">Submit a new support request</p>
            </Link>
          )}

          {(user.role === 'ADMIN' || user.role === 'TEAM_LEAD') && (
            <Link href="/tickets" className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-200 shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3 group-hover:bg-amber-50 transition-colors">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Team Tickets</h3>
              <p className="text-xs text-slate-500 mt-1">Monitor your team's workload</p>
            </Link>
          )}

          <div className="group p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">My Profile</h3>
            <p className="text-xs text-slate-500 mt-1">{user.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">Team: {user.team || 'Unassigned'}</p>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Tickets</h3>
            <Link href="/tickets" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {ticketsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No tickets found. {user.role === 'REQUESTER' && (
                  <Link href="/tickets/new" className="text-blue-600 hover:text-blue-700 ml-1">Create your first ticket →</Link>
                )}
              </div>
            ) : (
              recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">{ticket.ticketNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[ticket.priority] || ''}`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[ticket.status] || ''}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-medium text-slate-900 text-sm">{ticket.subject}</span>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:block">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
