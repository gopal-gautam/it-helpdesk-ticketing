"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

type FrontendTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  requester: {
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedAgent?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  category?: {
    name: string;
  };
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-zinc-800 text-zinc-300',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  OPEN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RESOLVED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CLOSED: 'bg-zinc-800 text-zinc-400',
};

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<FrontendTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTickets() {
      try {
        const data = await api.get<FrontendTicket[]>('/tickets');
        setTickets(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTickets();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Tickets</h1>
              <p className="text-sm text-zinc-400 mt-1">Manage and track your helpdesk tickets</p>
            </div>
            {user?.role === 'REQUESTER' && (
              <Link href="/tickets/new">
                <Button>Create Ticket</Button>
              </Link>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 rounded-full border-4 border-violet-600/30 border-t-violet-600 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-zinc-500">
                    No tickets found.
                  </CardContent>
                </Card>
              ) : (
                tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="hover:border-violet-500/30 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/tickets/${ticket.id}`)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-500">{ticket.ticketNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[ticket.status]}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-white text-base">{ticket.subject}</h3>
                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                          <span>Requester: {ticket.requester.firstName} {ticket.requester.lastName}</span>
                          {ticket.assignedAgent && (
                            <span>Agent: {ticket.assignedAgent.firstName} {ticket.assignedAgent.lastName}</span>
                          )}
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link href={`/tickets/${ticket.id}`} className="text-violet-400 text-sm font-medium hover:text-violet-300 transition-colors">
                        View Details →
                      </Link>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
