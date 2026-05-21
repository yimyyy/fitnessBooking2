import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { CreateClassData } from '../api/classes';

interface Props {
  onSubmit: (data: CreateClassData) => void;
  onCancel: () => void;
  initial?: Partial<CreateClassData>;
  instructors: { id: string; name: string }[];
}

/**
 * Form for creating or editing a fitness class.
 * Validates required fields before submission.
 */
export function AdminClassForm({ onSubmit, onCancel, initial, instructors }: Props) {
  const { t } = useLanguage();
  const [form, setForm] = useState<Partial<CreateClassData>>({
    title: initial?.title || '',
    description: initial?.description || '',
    instructorId: initial?.instructorId || '',
    startTime: initial?.startTime || '',
    endTime: initial?.endTime || '',
    capacity: initial?.capacity || 10,
    price: initial?.price || 0,
    location: initial?.location || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title) e.title = t.form.required;
    if (!form.instructorId) e.instructorId = t.form.required;
    if (!form.startTime) e.startTime = t.form.required;
    if (!form.endTime) e.endTime = t.form.required;
    if (!form.location) e.location = t.form.required;
    if (!form.capacity || form.capacity < 1) e.capacity = t.form.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form as CreateClassData);
    }
  };

  const field = (name: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={String(form[name] ?? '')}
        onChange={e => setForm({ ...form, [name]: type === 'number' ? parseFloat(e.target.value) : e.target.value })}
        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[name] ? 'border-red-400' : 'border-gray-300'}`}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field('title', t.form.title)}
      {field('description', t.form.description)}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.instructor}</label>
        <select
          value={form.instructorId || ''}
          onChange={e => setForm({ ...form, instructorId: e.target.value })}
          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.instructorId ? 'border-red-400' : 'border-gray-300'}`}
        >
          <option value="">-- Select --</option>
          {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        {errors.instructorId && <p className="text-red-500 text-xs mt-1">{errors.instructorId}</p>}
      </div>

      {field('startTime', t.form.startTime, 'datetime-local')}
      {field('endTime', t.form.endTime, 'datetime-local')}
      {field('capacity', t.form.capacity, 'number')}
      {field('price', t.form.price, 'number')}
      {field('location', t.form.location)}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          {t.form.save}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
          {t.form.cancel}
        </button>
      </div>
    </form>
  );
}
