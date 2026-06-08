"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  requester: { firstName: string; lastName: string; email: string };
  assignedAgent?: { firstName: string; lastName: string; email: string };
  category?: { name: string };
  team?: { name: string };
};

type TicketsResponse = {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type Category = { id: string; name: string };

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
  WAITING_ON_THIRD_PARTY: 'bg-orange-50 text-orange-700 border-orange-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_THIRD_PARTY', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function TicketsPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<TicketsResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [priority, setPriority] = useState(searchParams.get('priority') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const LIMIT = 15;

  // Bulk selection (agents/leads/admins only)
  const canBulk = user?.role === 'AGENT' || user?.role === 'TEAM_LEAD' || user?.role === 'ADMIN';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (categoryId) params.set('categoryId', categoryId);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const result = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, status, priority, categoryId, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  // Load agents+leads for the bulk-assign dropdown.
  useEffect(() => {
    if (!canBulk) return;
    Promise.all([
      api.get<{ users: any[] }>('/users?role=AGENT&limit=100').catch(() => ({ users: [] })),
      api.get<{ users: any[] }>('/users?role=TEAM_LEAD&limit=100').catch(() => ({ users: [] })),
    ]).then(([a, l]) => setAgents([...(a.users ?? []), ...(l.users ?? [])]));
  }, [canBulk]);

  // Clear selection whenever the result set changes.
  useEffect(() => { setSelected(new Set()); }, [data]);

  const runBulk = async (action: 'ASSIGN' | 'CLOSE' | 'PRIORITY' | 'STATUS', value?: string) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await api.post('/tickets/bulk', { ticketIds: Array.from(selected), action, value });
      setSelected(new Set());
      await fetchTickets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setCategoryId('');
    setPage(1);
  };

  const tickets = data?.tickets ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Tickets</h1>
              <p className="text-sm text-slate-500 mt-1">
                {total > 0 ? `${total} ticket${total !== 1 ? 's' : ''} found` : 'No tickets found'}
              </p>
            </div>
            {user?.role === 'REQUESTER' && (
              <Link href="/tickets/new">
                <Button>+ New Ticket</Button>
              </Link>
            )}
          </div>

          {/* Search & Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by subject, description, or ticket number…"
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <Button type="submit" variant="primary" size="sm">Search</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <select
                    value={priority}
                    onChange={(e) => { setPriority(e.target.value); setPage(1); }}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Priorities</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {categories.length > 0 && (
                    <select
                      value={categoryId}
                      onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                      className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          {/* Bulk action toolbar */}
          {canBulk && selected.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-sm font-semibold text-blue-800">{selected.size} selected</span>
              <select
                disabled={bulkBusy}
                defaultValue=""
                onChange={(e) => { if (e.target.value) { runBulk('ASSIGN', e.target.value); e.target.value = ''; } }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">Assign to…</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
              </select>
              <select
                disabled={bulkBusy}
                defaultValue=""
                onChange={(e) => { if (e.target.value) { runBulk('PRIORITY', e.target.value); e.target.value = ''; } }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">Set priority…</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Button variant="danger" size="sm" disabled={bulkBusy} onClick={() => runBulk('CLOSE')}>Close selected</Button>
              <Button variant="ghost" size="sm" disabled={bulkBusy} onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}

          {/* Ticket List */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-500">
                <p className="text-lg font-medium mb-2">No tickets found</p>
                <p className="text-sm">Try adjusting your search or filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center gap-3">
                  {canBulk && (
                    <input
                      type="checkbox"
                      checked={selected.has(ticket.id)}
                      onChange={() => toggleSelect(ticket.id)}
                      className="w-4 h-4 shrink-0 accent-blue-600 cursor-pointer"
                      aria-label={`Select ${ticket.ticketNumber}`}
                    />
                  )}
                  <Link href={`/tickets/${ticket.id}`} className="flex-1 min-w-0">
                  <Card className="hover:border-blue-200 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono text-slate-500 shrink-0">{ticket.ticketNumber}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[ticket.priority]}`}>
                              {ticket.priority}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[ticket.status]}`}>
                              {ticket.status.replace(/_/g, ' ')}
                            </span>
                            {ticket.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-slate-100 text-slate-500 border-slate-200">
                                {ticket.category.name}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{ticket.subject}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>By: {ticket.requester.firstName} {ticket.requester.lastName}</span>
                            {ticket.assignedAgent && (
                              <span>Agent: {ticket.assignedAgent.firstName} {ticket.assignedAgent.lastName}</span>
                            )}
                            {ticket.team && <span>Team: {ticket.team.name}</span>}
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors shrink-0">View →</span>
                      </div>
                    </CardContent>
                  </Card>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pageNum = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
        </div>
      }
    >
      <TicketsPageInner />
    </Suspense>
  );
}
