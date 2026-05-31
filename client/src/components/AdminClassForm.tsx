import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { CreateClassData } from '../api/classes';

interface Props {
  onSubmit: (data: CreateClassData) => void;
  onCancel: () => void;
  initial?: Partial<CreateClassData>;
  instructors: { id: string; name: string }[];
  locations: string[];
}

// 30-minute time slots for the picker: "00:00", "00:30", … "23:30"
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

function fmt12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
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

type FormState = {
  title: string;
  description: string;
  instructorId: string;
  startTime: string;
  duration: number;
  capacity: number;
  price: number;
  location: string;
  isRecurring: boolean;
  recurrenceRule: string;
  recurrenceEndDate: string;
};

function toLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function computeDuration(start: string | undefined, end: string | undefined): number {
  if (!start || !end) return 60;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function threeMonthsFrom(startTime: string): string {
  const datePart = (startTime || '').split('T')[0];
  if (!datePart) return '';
  const d = new Date(datePart);
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export function AdminClassForm({ onSubmit, onCancel, initial, instructors, locations }: Props) {
  const { t } = useLanguage();
  const [form, setForm] = useState<FormState>({
    title: initial?.title || '',
    description: initial?.description || '',
    instructorId: initial?.instructorId || '',
    startTime: initial?.startTime ? toLocalInput(initial.startTime) : todayDate(),
    duration: computeDuration(initial?.startTime, initial?.endTime),
    capacity: initial?.capacity || 10,
    price: initial?.price || 0,
    location: initial?.location || '',
    isRecurring: initial?.isRecurring || false,
    recurrenceRule: initial?.recurrenceRule || '',
    recurrenceEndDate: initial?.recurrenceEndDate ? initial.recurrenceEndDate.slice(0, 10) : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title) e.title = t.form.required;
    if (!form.instructorId) e.instructorId = t.form.required;
    if (!form.startTime) e.startTime = t.form.required;
    if (!form.duration || form.duration < 1) e.duration = t.form.required;
    if (!form.location) e.location = t.form.required;
    if (!form.capacity || form.capacity < 1) e.capacity = t.form.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const startISO = form.startTime + ':00Z';
    const endISO = new Date(new Date(startISO).getTime() + form.duration * 60000).toISOString();
    onSubmit({
      title: form.title,
      description: form.description || undefined,
      instructorId: form.instructorId,
      startTime: startISO,
      endTime: endISO,
      capacity: form.capacity,
      price: form.price,
      location: form.location,
      isRecurring: form.isRecurring,
      recurrenceRule: form.recurrenceRule || undefined,
      recurrenceEndDate: form.recurrenceEndDate ? form.recurrenceEndDate + 'T00:00:00Z' : undefined,
    });
  };

  const field = (name: keyof FormState, label: string, type = 'text', step?: string) => (
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

      {/* Date + time picker: select shows only 30-min slots; custom input allows any time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.startTime}</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={(form.startTime || '').split('T')[0] || ''}
            onChange={e => {
              const time = (form.startTime || '').split('T')[1] || '09:00';
              setForm({ ...form, startTime: e.target.value + 'T' + time });
            }}
            className={`flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.startTime ? 'border-red-400' : 'border-gray-300'}`}
          />
          <select
            value={TIME_OPTIONS.includes((form.startTime || '').split('T')[1] || '') ? (form.startTime || '').split('T')[1] : ''}
            onChange={e => {
              const date = (form.startTime || '').split('T')[0] || '';
              setForm({ ...form, startTime: date + 'T' + e.target.value });
            }}
            className="w-36 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Pick time…</option>
            {TIME_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{fmt12h(opt)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-gray-400">Custom time:</span>
          <input
            type="time"
            value={(form.startTime || '').split('T')[1] || ''}
            onChange={e => {
              const date = (form.startTime || '').split('T')[0] || '';
              setForm({ ...form, startTime: date + 'T' + e.target.value });
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
      </div>
      {field('duration', t.form.duration, 'number')}
      {field('capacity', t.form.capacity, 'number')}
      {field('price', t.form.price, 'number')}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.location}</label>
        <select
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.location ? 'border-red-400' : 'border-gray-300'}`}
        >
          <option value="">-- Select location --</option>
          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
        {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
      </div>

      {/* Recurring */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.isRecurring}
            onChange={e => {
              const checked = e.target.checked;
              setForm({
                ...form,
                isRecurring: checked,
                recurrenceRule: checked ? form.recurrenceRule : '',
                recurrenceEndDate: checked && !form.recurrenceEndDate
                  ? threeMonthsFrom(form.startTime)
                  : form.recurrenceEndDate,
              });
            }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">{t.form.recurring}</span>
        </label>

        {form.isRecurring && (
          <div className="space-y-3">
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
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t.form.recurrenceEndDate}</label>
              <input
                type="date"
                value={form.recurrenceEndDate}
                onChange={e => setForm({ ...form, recurrenceEndDate: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
