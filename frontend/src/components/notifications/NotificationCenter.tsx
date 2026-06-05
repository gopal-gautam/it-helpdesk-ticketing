"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Bell, CheckCircle, Ticket, AlertCircle, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  ticketId?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const data = await api.get<Notification[]>('/notifications/unread');
        setNotifications(data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleAllRead = async () => {
    try {
      await Promise.all(notifications.map(n => api.patch(`/notifications/${n.id}/read`, {})));
      setNotifications([]);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SLA_BREACH': return <AlertCircle size={16} className="text-red-400" />;
      case 'TICKET_CREATED': return <Ticket size={16} className="text-blue-400" />;
      case 'ASSIGNED': return <User size={16} className="text-emerald-400" />;
      default: return <Bell size={16} className="text-zinc-400" />;
    }
  };

  // Mock User icon since it's used in getIcon but not imported
  const User = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
      >
        <Bell size={22} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full border-2 border-zinc-950"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 mt-2 w-80 max-h-[500px] overflow-hidden z-50 flex flex-col shadow-2xl border-zinc-800">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-medium text-white">Notifications</h3>
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-violet-400 hover:text-violet-300" onClick={handleAllRead}>
                  Mark all as read
                </Button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-8 text-center text-zinc-500 text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No new notifications</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {notifications.map(n => (
                    <div key={n.id} className="p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-zinc-200 truncate">{n.title}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}
                              className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-emerald-400"
                            >
                              <CheckCircle size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{n.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                            {n.ticketId && (
                              <a
                                href={`/tickets/${n.ticketId}`}
                                onClick={() => setIsOpen(false)}
                                className="text-[10px] text-violet-400 hover:underline flex items-center gap-1"
                              >
                                View Ticket <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
