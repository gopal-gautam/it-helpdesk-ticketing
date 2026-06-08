"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type CustomField = {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  sortOrder: number;
  isActive: boolean;
};

type Category = { id: string; name: string };

const FIELD_TYPES = ['TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE'];

type FormState = {
  label: string;
  name: string;
  fieldType: string;
  options: string;
  isRequired: boolean;
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  label: '',
  name: '',
  fieldType: 'TEXT',
  options: '',
  isRequired: false,
  categoryId: '',
  sortOrder: 0,
  isActive: true,
};

export default function AdminCustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fieldData, categoryData] = await Promise.all([
        api.get<CustomField[]>('/custom-fields/all'),
        api.get<Category[]>('/categories'),
      ]);
      setFields(fieldData);
      setCategories(categoryData);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingField(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (field: CustomField) => {
    setEditingField(field);
    setForm({
      label: field.label,
      name: field.name,
      fieldType: field.fieldType,
      options: (field.options ?? []).join(', '),
      isRequired: field.isRequired,
      categoryId: field.categoryId ?? '',
      sortOrder: field.sortOrder,
      isActive: field.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const options = form.fieldType === 'SELECT'
        ? form.options.split(',').map((o) => o.trim()).filter(Boolean)
        : [];
      const payload = {
        name: form.name.trim(),
        label: form.label.trim(),
        fieldType: form.fieldType,
        options,
        isRequired: form.isRequired,
        categoryId: form.categoryId || undefined,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      };
      if (editingField) {
        await api.patch(`/custom-fields/${editingField.id}`, payload);
      } else {
        await api.post('/custom-fields', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (field: CustomField) => {
    try {
      await api.patch(`/custom-fields/${field.id}`, { isActive: !field.isActive });
      fetchData();
    } catch {}
  };

  const handleDelete = async (field: CustomField) => {
    if (!window.confirm(`Delete custom field "${field.label}"?`)) return;
    try {
      await api.delete(`/custom-fields/${field.id}`);
      fetchData();
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Custom Fields</h1>
          <p className="text-sm text-slate-500">Define extra fields captured on tickets</p>
        </div>
        <Button onClick={openCreate}>+ New Field</Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" /></div>
      ) : fields.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No custom fields configured.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Label</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Key</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Scope</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Required</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fields.map((field) => (
                  <tr key={field.id} className={`hover:bg-slate-50 transition-colors ${!field.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{field.label}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{field.name}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-600 border-slate-200">
                        {field.fieldType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {field.category?.name ?? 'All categories'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${field.isRequired ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {field.isRequired ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${field.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {field.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(field)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                        <button
                          onClick={() => toggleActive(field)}
                          className={`text-xs font-medium ${field.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}`}
                        >
                          {field.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDelete(field)} className="text-xs text-red-600 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-5">{editingField ? 'Edit Custom Field' : 'Create Custom Field'}</h2>
            {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Label</label>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Asset Tag"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Key (machine name)</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase() })}
                  placeholder="e.g. asset_tag"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Type</label>
                <select value={form.fieldType} onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {form.fieldType === 'SELECT' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Options (comma-separated)</label>
                  <input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}
                    placeholder="Option A, Option B"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Category scope</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500">
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                  className="rounded border-slate-300" />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300" />
                Active
              </label>
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
