import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { CreateClassData } from '../api/classes';

interface Props {
  onSubmit: (data: CreateClassData) => void;
  onCancel: () => void;
  initial?: Partial<CreateClassData>;
  instructors: { id: string; name: string }[];
}

const DAYS = [
  { key: 'MO', label: 'Mon' },
  { key: 'TU', label: 'Tue' },
  { key: 'WE', label: 'Wed' },
  { key: 'TH', label: 'Thu' },
  { key: 'FR', label: 'Fri' },
  { key: 'SA', label: 'Sat' },
  { key: 'SU', label: 'Sun' },
];

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
    isRecurring: initial?.isRecurring || false,
    recurrenceRule: initial?.recurrenceRule || '',
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
    if (validate()) onSubmit(form as CreateClassData);
  };

  const field = (name: keyof typeof form, label: string, type = 'text', step?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={String(form[name] ?? '')}
        onChange={e => setForm({ ...form, [name]: type === 'number' ? parseFloat(e.target.value) : e.target.value })}
        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[name] ? 'border-red-400' : 'border-gray-300'}`}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  const selectedDays = (form.recurrenceRule || '').split(',').filter(Boolean);

  const toggleDay = (key: string) => {
    const updated = selectedDays.includes(key)
      ? selectedDays.filter(d => d !== key)
      : [...selectedDays, key];
    setForm({ ...form, recurrenceRule: updated.join(',') });
  };

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

      {/* step="1800" = 30-minute increments in the picker; free typing still works */}
      {field('startTime', t.form.startTime, 'datetime-local', '1800')}
      {field('endTime', t.form.endTime, 'datetime-local', '1800')}
      {field('capacity', t.form.capacity, 'number')}
      {field('price', t.form.price, 'number')}
      {field('location', t.form.location)}

      {/* Recurring */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.isRecurring}
            onChange={e => setForm({ ...form, isRecurring: e.target.checked, recurrenceRule: e.target.checked ? form.recurrenceRule : '' })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">{t.form.recurring}</span>
        </label>

        {form.isRecurring && (
          <div>
            <p className="text-sm text-gray-600 mb-2">{t.form.recurringDays}</p>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map(day => {
                const active = selectedDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
