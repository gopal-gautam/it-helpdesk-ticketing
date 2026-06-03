"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

type Category = {
  id: string;
  name: string;
};

export default function TicketCreatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    categoryId: '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await api.get<Category[]>('/categories');
        setCategories(data);
      } catch (err: any) {
        setError('Failed to load categories');
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/tickets', formData);
      router.push('/tickets');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Create New Ticket</h1>
            <p className="text-sm text-zinc-400 mt-1">Please provide as much detail as possible to help us resolve your issue.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Subject</label>
                  <Input
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Brief summary of the issue"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Category</label>
                    <select
                      required
                      className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Priority</label>
                    <select
                      className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Description</label>
                  <textarea
                    required
                    className="flex w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white ring-offset-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 min-h-[150px] transition-all"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your issue in detail..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Ticket'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
