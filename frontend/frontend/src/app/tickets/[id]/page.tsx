"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../lib/api';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, FileText, CheckCircle, Lock, User, Calendar } from 'lucide-react';

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
  comments: { id: string; content: string; createdAt: string; author: { firstName: string; lastName: string; email: string } }[];
  internalNotes: { id: string; content: string; createdAt: string; author: { firstName: string; lastName: string; email: string } }[];
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
      // Refresh ticket to show new comment
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
      // Refresh ticket to show new note
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

  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!ticket) return <div className="p-8 text-center text-gray-500">Ticket not found</div>;

  const isAgent = user?.role !== 'REQUESTER';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Ticket Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>
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
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 whitespace-pre-wrap">
                    {ticket.description}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <MessageSquare size={18} /> Public Comments
                    </h3>
                    <div className="space-y-4">
                      {ticket.comments.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No comments yet.</p>
                      ) : (
                        ticket.comments.map(comment => (
                          <div key={comment.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{comment.author.firstName} {comment.author.lastName}</span>
                                <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
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
                    <div className="space-y-4 pt-6 border-t border-gray-200">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <Lock size={18} /> Internal Notes
                      </h3>
                      <div className="space-y-4">
                        {ticket.internalNotes.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No internal notes yet.</p>
                        ) : (
                          ticket.internalNotes.map(note => (
                            <div key={note.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{note.author.firstName} {note.author.lastName}</span>
                                  <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700">{note.content}</p>
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Metadata */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wider text-gray-500">Ticket Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-xs">Requester</div>
                      <div className="font-medium">{ticket.requester.firstName} {ticket.requester.lastName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-xs">Assigned Agent</div>
                      <div className="font-medium">{ticket.assignedAgent ? `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}` : 'Unassigned'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-xs">Created At</div>
                      <div className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <FileText size={16} className="text-gray-400" />
                    <div>
                      <div className="text-gray-500 text-xs">Category</div>
                      <div className="font-medium">{ticket.category?.name || 'Uncategorized'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
