"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, FileText, Lock, User, Calendar, AlertCircle } from 'lucide-react';

type TicketDetail = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  requester: { firstName: string; lastName: string; email: string };
  assignedAgent?: { firstName: string; lastName: string; email: string };
  category?: { name: string };
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  comments: { id: string; content: string; createdAt: string; author: { firstName: string; lastName: string; email: string } }[];
  internalNotes: { id: string; content: string; createdAt: string; author: { firstName: string; lastName: string; email: string } }[];
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  OPEN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RESOLVED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CLOSED: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    async function fetchTicket() {
      try {
        const data = await api.get<TicketDetail>(`/tickets/${id}`);
        setTicket(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTicket();
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingComment(true);
    try {
      await api.post('/comments', { content: commentText, ticketId: id });
      setCommentText('');
      const updated = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNote(true);
    try {
      await api.post('/internal-notes', { content: noteText, ticketId: id });
      setNoteText('');
      const updated = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleResolve = async () => {
    try {
      await api.patch(`/tickets/${id}/resolve`, {});
      const updated = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClose = async () => {
    try {
      await api.patch(`/tickets/${id}/close`, {});
      const updated = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-zinc-950"><div className="w-12 h-12 rounded-full border-4 border-violet-600/30 border-t-violet-600 animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-400 bg-zinc-950 min-h-screen">{error}</div>;
  if (!ticket) return <div className="p-8 text-center text-zinc-500 bg-zinc-950 min-h-screen">Ticket not found</div>;

  const isAgent = user?.role !== 'REQUESTER';

  const isResponseBreached = ticket.firstResponseDueAt && new Date(ticket.firstResponseDueAt) < new Date() && ticket.status === 'NEW';
  const isResolutionBreached = ticket.resolutionDueAt && new Date(ticket.resolutionDueAt) < new Date() && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
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
                    <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                  </div>
                  {isAgent && ticket.status !== 'CLOSED' && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleResolve}>Resolve</Button>
                      <Button variant="danger" size="sm" onClick={handleClose}>Close</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-zinc-300 whitespace-pre-wrap">
                    {ticket.description}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <MessageSquare size={18} className="text-violet-400" /> Public Comments
                    </h3>
                    <div className="space-y-4">
                      {ticket.comments.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No comments yet.</p>
                      ) : (
                        ticket.comments.map(comment => (
                          <div key={comment.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-200">{comment.author.firstName} {comment.author.lastName}</span>
                                <span className="text-xs text-zinc-500">{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <p className="text-sm text-zinc-400">{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <Input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a public comment..."
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isSubmittingComment || !commentText.trim()}>Post</Button>
                    </form>
                  </div>

                  {isAgent && (
                    <div className="space-y-4 pt-6 border-t border-zinc-800">
                      <h3 className="font-medium text-white flex items-center gap-2">
                        <Lock size={18} className="text-amber-400" /> Internal Notes
                      </h3>
                      <div className="space-y-4">
                        {ticket.internalNotes.length === 0 ? (
                          <p className="text-sm text-zinc-500 italic">No internal notes yet.</p>
                        ) : (
                          ticket.internalNotes.map(note => (
                            <div key={note.id} className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-zinc-200">{note.author.firstName} {note.author.lastName}</span>
                                  <span className="text-xs text-zinc-500">{new Date(note.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                              <p className="text-sm text-zinc-400">{note.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <form onSubmit={handleAddNote} className="flex gap-2">
                        <Input
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a private note..."
                          className="flex-1"
                        />
                        <Button type="submit" variant="secondary" disabled={isSubmittingNote || !noteText.trim()}>Add Note</Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wider text-zinc-500">Ticket Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-zinc-500" />
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-xs">Requester</span>
                      <span className="font-medium text-zinc-200">{ticket.requester.firstName} {ticket.requester.lastName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-zinc-500" />
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-xs">Assigned Agent</span>
                      <span className="font-medium text-zinc-200">{ticket.assignedAgent ? `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}` : 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-zinc-500" />
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-xs">Created At</span>
                      <span className="font-medium text-zinc-200">{new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <FileText size={16} className="text-zinc-500" />
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-xs">Category</span>
                      <span className="font-medium text-zinc-200">{ticket.category?.name || 'Uncategorized'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={isResolutionBreached ? 'border-red-500/50 bg-red-950/10' : ''}>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <AlertCircle size={16} /> SLA Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">First Response</span>
                    <span className={`font-medium ${isResponseBreached ? 'text-red-400' : 'text-emerald-400'}`}>
                      {ticket.firstResponseDueAt ? new Date(ticket.firstResponseDueAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Resolution</span>
                    <span className={`font-medium ${isResolutionBreached ? 'text-red-400' : 'text-emerald-400'}`}>
                      {ticket.resolutionDueAt ? new Date(ticket.resolutionDueAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  {isResponseBreached || isResolutionBreached ? (
                    <div className="p-2 bg-red-500/10 text-red-400 text-xs rounded-lg font-medium text-center border border-red-500/20">
                      SLA Breach Detected
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg font-medium text-center border border-emerald-500/20">
                      Within SLA
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
