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
import { MessageSquare, FileText, Lock, User, Calendar, AlertCircle, Paperclip, Download, X } from 'lucide-react';

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
  attachments: { id: string; originalName: string; fileSize: number; mimeType: string; createdAt: string; uploadedBy: { firstName: string; lastName: string } }[];
  customFieldValues?: { id: string; value: string; field: { id: string; label: string; fieldType: string } }[];
  reopenCount?: number;
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
  WAITING_ON_THIRD_PARTY: 'bg-orange-50 text-orange-700 border-orange-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleReopen = async () => {
    try {
      await api.patch(`/tickets/${id}/reopen`, {});
      const updated = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('ticketId', id as string);

      await api.upload(`/attachments/upload`, formData);

      setSelectedFile(null);
      const updated = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-slate-50 min-h-screen">{error}</div>;
  if (!ticket) return <div className="p-8 text-center text-slate-500 bg-slate-50 min-h-screen">Ticket not found</div>;

  const isAgent = user?.role !== 'REQUESTER';

  const isResponseBreached = ticket.firstResponseDueAt && new Date(ticket.firstResponseDueAt) < new Date() && ticket.status === 'NEW';
  const isResolutionBreached = ticket.resolutionDueAt && new Date(ticket.resolutionDueAt) < new Date() && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">{ticket.ticketNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    {isAgent && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleResolve}>Resolve</Button>
                        <Button variant="danger" size="sm" onClick={handleClose}>Close</Button>
                      </>
                    )}
                    {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                      <Button variant="outline" size="sm" onClick={handleReopen}>Reopen</Button>
                    )}
                    {isAgent && ticket.status === 'RESOLVED' && (
                      <Button variant="danger" size="sm" onClick={handleClose}>Close</Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap">
                    {ticket.description}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium text-slate-900 flex items-center gap-2 text-sm">
                      <Paperclip size={16} className="text-blue-600" /> Attachments
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ticket.attachments.length === 0 ? (
                        <p className="text-xs text-slate-500 italic col-span-2">No attachments yet.</p>
                      ) : (
                        ticket.attachments.map(att => (
                          <div key={att.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText size={14} className="text-slate-500 flex-shrink-0" />
                              <span className="truncate text-slate-700" title={att.originalName}>{att.originalName}</span>
                            </div>
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL}/attachments/${att.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleFileUpload} className="flex gap-2 mt-4">
                      <div className="relative flex-1">
                        <Input
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="file-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-center"
                          onClick={() => document.getElementById('file-upload')?.click()}
                        >
                          {selectedFile ? selectedFile.name : 'Choose file...'}
                        </Button>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="absolute -right-2 -top-2 p-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-500 hover:text-slate-900"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!selectedFile || isUploadingFile}
                      >
                        {isUploadingFile ? 'Uploading...' : 'Upload'}
                      </Button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900 flex items-center gap-2">
                      <MessageSquare size={18} className="text-blue-600" /> Public Comments
                    </h3>
                    <div className="space-y-4">
                      {ticket.comments.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No comments yet.</p>
                      ) : (
                        ticket.comments.map(comment => (
                          <div key={comment.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">{comment.author.firstName} {comment.author.lastName}</span>
                                <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-700">{comment.content}</p>
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
                    <div className="space-y-4 pt-6 border-t border-slate-200">
                      <h3 className="font-medium text-slate-900 flex items-center gap-2">
                        <Lock size={18} className="text-amber-600" /> Internal Notes
                      </h3>
                      <div className="space-y-4">
                        {ticket.internalNotes.length === 0 ? (
                          <p className="text-sm text-slate-500 italic">No internal notes yet.</p>
                        ) : (
                          ticket.internalNotes.map(note => (
                            <div key={note.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900">{note.author.firstName} {note.author.lastName}</span>
                                  <span className="text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                              <p className="text-sm text-slate-700">{note.content}</p>
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
                  <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Ticket Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-slate-500" />
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Requester</span>
                      <span className="font-medium text-slate-900">{ticket.requester.firstName} {ticket.requester.lastName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-slate-500" />
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Assigned Agent</span>
                      <span className="font-medium text-slate-900">{ticket.assignedAgent ? `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}` : 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-slate-500" />
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Created At</span>
                      <span className="font-medium text-slate-900">{new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <FileText size={16} className="text-slate-500" />
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">Category</span>
                      <span className="font-medium text-slate-900">{ticket.category?.name || 'Uncategorized'}</span>
                    </div>
                  </div>

                  {(ticket.reopenCount ?? 0) > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <AlertCircle size={16} className="text-amber-600" />
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-xs">Reopened</span>
                        <span className="font-medium text-amber-700">{ticket.reopenCount}× </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {ticket.customFieldValues && ticket.customFieldValues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Additional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ticket.customFieldValues.map((cfv) => (
                      <div key={cfv.id} className="flex flex-col text-sm">
                        <span className="text-slate-500 text-xs">{cfv.field.label}</span>
                        <span className="font-medium text-slate-900">
                          {cfv.field.fieldType === 'CHECKBOX'
                            ? (cfv.value === 'true' ? 'Yes' : 'No')
                            : (cfv.value || '—')}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className={isResolutionBreached ? 'border-red-200 bg-red-50' : ''}>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <AlertCircle size={16} /> SLA Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">First Response</span>
                    <span className={`font-medium ${isResponseBreached ? 'text-red-600' : 'text-green-700'}`}>
                      {ticket.firstResponseDueAt ? new Date(ticket.firstResponseDueAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Resolution</span>
                    <span className={`font-medium ${isResolutionBreached ? 'text-red-600' : 'text-green-700'}`}>
                      {ticket.resolutionDueAt ? new Date(ticket.resolutionDueAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  {isResponseBreached || isResolutionBreached ? (
                    <div className="p-2 bg-red-50 text-red-700 text-xs rounded-lg font-medium text-center border border-red-200">
                      SLA Breach Detected
                    </div>
                  ) : (
                    <div className="p-2 bg-green-50 text-green-700 text-xs rounded-lg font-medium text-center border border-green-200">
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
