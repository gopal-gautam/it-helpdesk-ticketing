"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { Ticket, AlertCircle } from 'lucide-react';

type Category = {
  id: string;
  name: string;
};

type CustomField = {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
};

export default function CreateTicketPage() {
  const { user } = useAuth();
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

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

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

  // Load custom fields applicable to the selected category (plus global fields).
  useEffect(() => {
    async function fetchFields() {
      try {
        const qs = formData.categoryId ? `?categoryId=${formData.categoryId}` : '';
        const fields = await api.get<CustomField[]>(`/custom-fields${qs}`);
        setCustomFields(fields);
      } catch {
        setCustomFields([]);
      }
    }
    fetchFields();
  }, [formData.categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      setError('Please select a category');
      return;
    }

    // Enforce required custom fields client-side.
    const missing = customFields.find((f) => f.isRequired && !customValues[f.id]);
    if (missing) {
      setError(`${missing.label} is required`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>('/tickets', formData);
      // Persist custom field values, if any.
      if (created?.id && Object.keys(customValues).length > 0) {
        await api.put(`/custom-fields/ticket/${created.id}`, { values: customValues });
      }
      router.push('/tickets');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setCustomValue = (fieldId: string, value: string) =>
    setCustomValues((prev) => ({ ...prev, [fieldId]: value }));

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Ticket className="text-blue-600" /> Create Support Ticket
            </h1>
            <p className="text-sm text-slate-500 mt-1">Tell us what's happening and we'll get back to you as soon as possible.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Subject</label>
                  <Input
                    required
                    placeholder="Brief summary of the issue"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Category</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">Select a category...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Priority</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Provide as much detail as possible..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-6 pt-2 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 pt-4">Additional Details</p>
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          {field.label}{field.isRequired && <span className="text-red-600"> *</span>}
                        </label>
                        {field.fieldType === 'TEXTAREA' ? (
                          <textarea
                            rows={3}
                            value={customValues[field.id] ?? ''}
                            onChange={(e) => setCustomValue(field.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                          />
                        ) : field.fieldType === 'SELECT' ? (
                          <select
                            value={customValues[field.id] ?? ''}
                            onChange={(e) => setCustomValue(field.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          >
                            <option value="">Select…</option>
                            {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : field.fieldType === 'CHECKBOX' ? (
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={customValues[field.id] === 'true'}
                              onChange={(e) => setCustomValue(field.id, e.target.checked ? 'true' : 'false')}
                            />
                            Yes
                          </label>
                        ) : (
                          <Input
                            type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
                            value={customValues[field.id] ?? ''}
                            onChange={(e) => setCustomValue(field.id, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8"
                  >
                    {isSubmitting ? 'Creating...' : 'Submit Ticket'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/tickets')}
                  >
                    Cancel
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
