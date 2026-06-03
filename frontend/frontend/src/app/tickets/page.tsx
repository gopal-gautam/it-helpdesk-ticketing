"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import Link from 'next/link';
import { Ticket, Priority, TicketStatus } from '@prisma/client'; // Need to define these types in frontend since I can't import from @prisma/client

// Since we are in frontend, we define these types locally or in a shared types file
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
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  OPEN: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-purple-100 text-purple-800',
  CLOSED: 'bg-gray-100 text-gray-800',
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
              <p className="text-sm text-gray-500">Manage and track your helpdesk tickets</p>
            </div>
            {user?.role === 'REQUESTER' && (
              <Link href="/tickets/new">
                <Button>Create Ticket</Button>
              </Link>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No tickets found.
                  </CardContent>
                </Card>
              ) : (
                tickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:border-blue-300 transition-colors cursor-pointer" onClick={() => window.location.href = `/tickets/${ticket.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Requester: {ticket.requester.firstName} {ticket.requester.lastName}</span>
                          {ticket.assignedAgent && (
                            <span>Agent: {ticket.assignedAgent.firstName} {ticket.assignedAgent.lastName}</span>
                          )}
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link href={`/tickets/${ticket.id}`} className="text-blue-600 text-sm font-medium hover:underline">
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
