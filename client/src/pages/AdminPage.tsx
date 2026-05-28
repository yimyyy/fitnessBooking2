import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { classesApi } from '../api/classes';
import type { FitnessClass, CreateClassData } from '../api/classes';
import { AdminClassForm } from '../components/AdminClassForm';
import { apiClient } from '../api/client';
import { adminApi } from '../api/admin';

export function AdminPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, classCount: 0 });
  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<FitnessClass | null>(null);
  const [cancellationWindow, setCancellationWindow] = useState('24');
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get('/admin/stats'),
      classesApi.getAll(),
      apiClient.get('/admin/users'),
      adminApi.getSettings(),
    ]).then(([statsRes, classesRes, usersRes, settingsRes]) => {
      setStats(statsRes.data);
      setClasses(classesRes.data.classes);
      setInstructors(
        (usersRes.data.users as { id: string; name: string; role: string }[])
          .filter((u) => u.role === 'instructor' || u.role === 'admin')
          .map((u) => ({ id: u.id, name: u.name }))
      );
      setCancellationWindow(settingsRes.data.settings.cancellationWindowHours ?? '24');
    }).catch(console.error);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApi.updateSetting('cancellationWindowHours', cancellationWindow);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const handleCreate = async (data: CreateClassData) => {
    const res = await classesApi.create(data);
    setClasses(prev => [...prev, res.data.class]);
    setShowForm(false);
  };

  const handleUpdate = async (data: CreateClassData) => {
    if (!editingClass) return;
    const res = await classesApi.update(editingClass.id, data);
    setClasses(prev => prev.map(c => c.id === editingClass.id ? res.data.class : c));
    setEditingClass(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.admin.deleteConfirm)) return;
    await classesApi.delete(id);
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.admin.dashboard}</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t.admin.totalBookings, value: stats.totalBookings },
          { label: t.admin.totalRevenue, value: `$${stats.totalRevenue.toFixed(2)}` },
          { label: t.admin.totalClasses, value: stats.classCount },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t.admin.settings}</h2>
        <form onSubmit={handleSaveSettings} className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.admin.cancellationWindow}
            </label>
            <p className="text-xs text-gray-500 mb-2">{t.admin.cancellationWindowHelp}</p>
            <input
              type="number"
              min="0"
              value={cancellationWindow}
              onChange={e => setCancellationWindow(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {t.form.save}
          </button>
          {settingsSaved && (
            <span className="text-sm text-green-600">{t.admin.settingsSaved}</span>
          )}
        </form>
      </div>

      {/* Classes */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Classes</h2>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {t.admin.createClass}
          </button>
        </div>

        {(showForm || editingClass) && (
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="font-medium mb-4">{editingClass ? t.admin.editClass : t.admin.createClass}</h3>
            <AdminClassForm
              onSubmit={editingClass ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingClass(null); }}
              initial={editingClass || undefined}
              instructors={instructors}
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Title</th>
                <th className="text-left px-4 py-3 text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-gray-600">Capacity</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cls.title}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(cls.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{cls._count?.bookings ?? 0}/{cls.capacity}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      cls.status === 'full' ? 'bg-red-100 text-red-700' :
                      cls.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                      'bg-green-100 text-green-700'
                    }`}>{cls.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setEditingClass(cls)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(cls.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
