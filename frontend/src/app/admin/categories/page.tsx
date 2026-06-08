"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type Category = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  parentId?: string;
  subcategories: Category[];
  _count: { tickets: number };
};

const EMPTY_FORM = { name: '', description: '', parentId: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>('/categories?includeInactive=true');
      setCategories(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const parentOptions = categories.filter((c) => !c.parentId);

  const openCreate = (parentId?: string) => {
    setEditingCat(null);
    setForm({ ...EMPTY_FORM, parentId: parentId ?? '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setForm({ name: cat.name, description: cat.description ?? '', parentId: cat.parentId ?? '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, parentId: form.parentId || undefined, description: form.description || undefined };
      if (editingCat) {
        await api.patch(`/categories/${editingCat.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      setFormError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: Category) => {
    try {
      await api.patch(`/categories/${cat.id}`, { isActive: !cat.isActive });
      fetchCategories();
    } catch {}
  };

  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">{categories.length} total categories</p>
        </div>
        <Button onClick={() => openCreate()}>+ New Category</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>
      ) : topLevel.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No categories yet.</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {topLevel.map((cat) => (
            <Card key={cat.id} className={!cat.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cat.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <div>
                      <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                      {cat.description && <p className="text-xs text-slate-500">{cat.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400">{cat._count.tickets} tickets</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openCreate(cat.id)}>+ Sub</Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>Edit</Button>
                    <button
                      onClick={() => toggleActive(cat)}
                      className={`text-xs font-medium ${cat.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                    >
                      {cat.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
                {cat.subcategories.length > 0 && (
                  <div className="ml-5 flex flex-col gap-2 border-l border-slate-200 pl-4">
                    {cat.subcategories.map((sub) => (
                      <div key={sub.id} className={`flex items-center justify-between gap-4 ${!sub.isActive ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className="text-sm text-slate-700">{sub.name}</span>
                          {sub.description && <span className="text-xs text-slate-400">— {sub.description}</span>}
                          <span className="text-xs text-slate-400">{sub._count?.tickets ?? 0} tickets</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(sub)} className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
                          <button
                            onClick={() => toggleActive(sub)}
                            className={`text-xs font-medium ${sub.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          >
                            {sub.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-5">{editingCat ? 'Edit Category' : 'Create Category'}</h2>
            {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Parent Category (optional)</label>
                <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  <option value="">Top-level</option>
                  {parentOptions.filter((c) => c.id !== editingCat?.id).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
