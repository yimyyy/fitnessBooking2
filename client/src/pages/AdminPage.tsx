import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { classesApi } from '../api/classes';
import type { FitnessClass, CreateClassData } from '../api/classes';
import { AdminClassForm } from '../components/AdminClassForm';
import { apiClient } from '../api/client';
import { adminApi } from '../api/admin';
import type { AdminBooking, LogEntry } from '../api/admin';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  _count: { bookings: number };
}

type TabId = 'stats' | 'classes' | 'users' | 'settings' | 'logs';

const TABS: { id: TabId; label: string }[] = [
  { id: 'stats',    label: 'Stats' },
  { id: 'classes',  label: 'Classes' },
  { id: 'users',    label: 'Users' },
  { id: 'settings', label: 'Settings' },
  { id: 'logs',     label: 'Logs' },
];

export function AdminPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  // ── shared data ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, classCount: 0 });
  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [cancellationWindow, setCancellationWindow] = useState('24');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── class form state ──────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<FitnessClass | null>(null);

  // ── per-user booking state ────────────────────────────────────────────────
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<Record<string, AdminBooking[]>>({});
  const [bookingClassId, setBookingClassId] = useState<Record<string, string>>({});
  const [bookingFeedback, setBookingFeedback] = useState<Record<string, string>>({});
  const [paymentValues, setPaymentValues] = useState<Record<string, string>>({});
  const [paymentFeedback, setPaymentFeedback] = useState<Record<string, string>>({});

  // ── per-user role state ───────────────────────────────────────────────────
  const [roleValues, setRoleValues] = useState<Record<string, string>>({});
  const [roleFeedback, setRoleFeedback] = useState<Record<string, string>>({});

  // ── logs state ────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'email' | 'error'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiClient.get('/admin/stats'),
      classesApi.getAll(),
      apiClient.get('/admin/users'),
      adminApi.getSettings(),
    ]).then(([statsRes, classesRes, usersRes, settingsRes]) => {
      setStats(statsRes.data);
      setClasses(classesRes.data.classes);
      const allUsers = usersRes.data.users as UserRow[];
      setUsers(allUsers);
      setInstructors(
        allUsers
          .filter((u) => u.role === 'instructor' || u.role === 'admin')
          .map((u) => ({ id: u.id, name: u.name }))
      );
      setCancellationWindow(settingsRes.data.settings.cancellationWindowHours ?? '24');
    }).catch(console.error);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await adminApi.getLogs();
      setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchLogs]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApi.updateSetting('cancellationWindowHours', cancellationWindow);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const handleCreate = async (data: CreateClassData) => {
    try {
      setFormError(null);
      const res = await classesApi.create(data);
      setClasses(prev => [...prev, res.data.class]);
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create class';
      setFormError(msg);
    }
  };

  const handleUpdate = async (data: CreateClassData) => {
    if (!editingClass) return;
    try {
      setFormError(null);
      const res = await classesApi.update(editingClass.id, data);
      setClasses(prev => prev.map(c => c.id === editingClass.id ? res.data.class : c));
      setEditingClass(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update class';
      setFormError(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.admin.deleteConfirm)) return;
    await classesApi.delete(id);
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  const handleCancelClass = async (id: string) => {
    if (!confirm(t.admin.cancelClassConfirm)) return;
    const res = await classesApi.cancel(id);
    setClasses(prev => prev.map(c => c.id === id ? res.data.class : c));
  };

  const handleToggleUser = async (userId: string) => {
    if (expandedUserId === userId) { setExpandedUserId(null); return; }
    setExpandedUserId(userId);
    if (!userBookings[userId]) {
      try {
        const res = await adminApi.getUserBookings(userId);
        setUserBookings(prev => ({ ...prev, [userId]: res.data.bookings }));
        const payInit: Record<string, string> = {};
        res.data.bookings.forEach(b => { payInit[b.id] = b.paymentStatus; });
        setPaymentValues(prev => ({ ...prev, ...payInit }));
      } catch (err) { console.error(err); }
    }
  };

  const handleBookForUser = async (userId: string) => {
    const classId = bookingClassId[userId];
    if (!classId) return;
    try {
      await adminApi.bookForUser(userId, classId);
      setBookingFeedback(prev => ({ ...prev, [userId]: t.admin.bookingCreated }));
      setTimeout(() => setBookingFeedback(prev => ({ ...prev, [userId]: '' })), 3000);
      const [bookingsRes, classesRes] = await Promise.all([
        adminApi.getUserBookings(userId),
        classesApi.getAll(),
      ]);
      setUserBookings(prev => ({ ...prev, [userId]: bookingsRes.data.bookings }));
      setClasses(classesRes.data.classes);
      setBookingClassId(prev => ({ ...prev, [userId]: '' }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error';
      setBookingFeedback(prev => ({ ...prev, [userId]: msg }));
    }
  };

  const handleUpdatePayment = async (bookingId: string) => {
    const status = paymentValues[bookingId];
    if (!status) return;
    try {
      await adminApi.updatePayment(bookingId, status);
      setPaymentFeedback(prev => ({ ...prev, [bookingId]: t.admin.paymentUpdated }));
      setTimeout(() => setPaymentFeedback(prev => ({ ...prev, [bookingId]: '' })), 3000);
    } catch (err) { console.error(err); }
  };

  const handleUpdateRole = async (userId: string) => {
    const role = roleValues[userId];
    if (!role) return;
    try {
      const res = await adminApi.updateUserRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: res.data.user.role } : u));
      setInstructors(prev => {
        const updatedRole = res.data.user.role;
        const isInstructorOrAdmin = updatedRole === 'instructor' || updatedRole === 'admin';
        const exists = prev.some(i => i.id === userId);
        const userName = users.find(u => u.id === userId)?.name ?? '';
        if (isInstructorOrAdmin && !exists) return [...prev, { id: userId, name: userName }];
        if (!isInstructorOrAdmin && exists) return prev.filter(i => i.id !== userId);
        return prev;
      });
      setRoleFeedback(prev => ({ ...prev, [userId]: t.admin.roleSaved }));
      setTimeout(() => setRoleFeedback(prev => ({ ...prev, [userId]: '' })), 3000);
    } catch (err) { console.error(err); }
  };

  // ── tab content ───────────────────────────────────────────────────────────
  const renderStats = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t.admin.dashboard}</h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t.admin.totalBookings, value: stats.totalBookings },
          { label: t.admin.totalRevenue,  value: `$${stats.totalRevenue.toFixed(2)}` },
          { label: t.admin.totalClasses,  value: stats.classCount },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClasses = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Classes</h2>
        <button onClick={() => { setShowForm(true); setEditingClass(null); }} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          {t.admin.createClass}
        </button>
      </div>

      {(showForm || editingClass) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-4">{editingClass ? t.admin.editClass : t.admin.createClass}</h3>
          {formError && (
            <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded text-sm">{formError}</div>
          )}
          <AdminClassForm
            onSubmit={editingClass ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingClass(null); setFormError(null); }}
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
                  <button onClick={() => { setEditingClass(cls); setShowForm(false); }} className="text-blue-600 hover:underline text-sm">Edit</button>
                  {cls.status !== 'cancelled' && (
                    <button onClick={() => handleCancelClass(cls.id)} className="text-yellow-600 hover:underline text-sm">Cancel</button>
                  )}
                  <button onClick={() => handleDelete(cls.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t.admin.users}</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600">Name</th>
              <th className="text-left px-4 py-3 text-gray-600">Email</th>
              <th className="text-left px-4 py-3 text-gray-600">Role</th>
              <th className="text-left px-4 py-3 text-gray-600">Bookings</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <React.Fragment key={user.id}>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'instructor' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{user.role}</span>
                      <select
                        value={roleValues[user.id] ?? user.role}
                        onChange={e => setRoleValues(prev => ({ ...prev, [user.id]: e.target.value }))}
                        className="border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none"
                      >
                        <option value="student">student</option>
                        <option value="instructor">instructor</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        onClick={() => handleUpdateRole(user.id)}
                        className="text-xs px-2 py-0.5 bg-gray-700 text-white rounded hover:bg-gray-600"
                      >
                        {t.admin.changeRole}
                      </button>
                      {roleFeedback[user.id] && (
                        <span className="text-xs text-green-600">{roleFeedback[user.id]}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user._count.bookings}</td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== 'admin' && (
                      <button onClick={() => handleToggleUser(user.id)} className="text-blue-600 hover:underline text-sm">
                        {expandedUserId === user.id ? t.admin.hideBookings : t.admin.manageBookings}
                      </button>
                    )}
                  </td>
                </tr>

                {expandedUserId === user.id && (
                  <tr className="border-t bg-blue-50">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm font-medium text-gray-700">{t.admin.bookForUser}:</span>
                        <select
                          value={bookingClassId[user.id] ?? ''}
                          onChange={e => setBookingClassId(prev => ({ ...prev, [user.id]: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{t.admin.selectClass}</option>
                          {classes.filter(c => c.status !== 'cancelled').map(c => (
                            <option key={c.id} value={c.id}>{c.title} — {new Date(c.startTime).toLocaleDateString()}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleBookForUser(user.id)}
                          disabled={!bookingClassId[user.id]}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-40"
                        >
                          Book
                        </button>
                        {bookingFeedback[user.id] && (
                          <span className="text-sm text-green-600">{bookingFeedback[user.id]}</span>
                        )}
                      </div>

                      {(userBookings[user.id] ?? []).length === 0 ? (
                        <p className="text-sm text-gray-500">{t.admin.noBookings}</p>
                      ) : (
                        <table className="w-full text-sm border rounded overflow-hidden">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left px-3 py-2 text-gray-600">Class</th>
                              <th className="text-left px-3 py-2 text-gray-600">Date</th>
                              <th className="text-left px-3 py-2 text-gray-600">Status</th>
                              <th className="text-left px-3 py-2 text-gray-600">Payment</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userBookings[user.id] ?? []).map(b => (
                              <tr key={b.id} className="border-t bg-white">
                                <td className="px-3 py-2 font-medium">{b.class?.title ?? '—'}</td>
                                <td className="px-3 py-2 text-gray-500">{b.class ? new Date(b.class.startTime).toLocaleString() : '—'}</td>
                                <td className="px-3 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    b.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>{b.status}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={paymentValues[b.id] ?? b.paymentStatus}
                                    onChange={e => setPaymentValues(prev => ({ ...prev, [b.id]: e.target.value }))}
                                    className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="refunded">Refunded</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                                  <button onClick={() => handleUpdatePayment(b.id)} className="text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700">
                                    {t.admin.updatePayment}
                                  </button>
                                  {paymentFeedback[b.id] && (
                                    <span className="text-xs text-green-600">{paymentFeedback[b.id]}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t.admin.settings}</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSaveSettings} className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.cancellationWindow}</label>
            <p className="text-xs text-gray-500 mb-2">{t.admin.cancellationWindowHelp}</p>
            <input
              type="number"
              min="0"
              value={cancellationWindow}
              onChange={e => setCancellationWindow(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{t.form.save}</button>
          {settingsSaved && <span className="text-sm text-green-600">{t.admin.settingsSaved}</span>}
        </form>
      </div>
    </div>
  );

  const renderLogs = () => {
    const filtered = logFilter === 'all' ? logs : logs.filter(l => l.type === logFilter);
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Logs</h2>
          <button onClick={fetchLogs} disabled={logsLoading} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
            {logsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="flex gap-2">
          {(['all', 'email', 'error'] as const).map(f => (
            <button
              key={f}
              onClick={() => setLogFilter(f)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                logFilter === f
                  ? f === 'error' ? 'bg-red-600 text-white border-red-600'
                    : f === 'email' ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1.5 text-xs opacity-75">
                  {logs.filter(l => l.type === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 && !logsLoading ? (
          <p className="text-gray-500 text-sm">No logs yet.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 w-44">Time</th>
                  <th className="text-left px-4 py-3 text-gray-600 w-20">Type</th>
                  <th className="text-left px-4 py-3 text-gray-600">Message</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <React.Fragment key={log.id}>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>{log.type}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-800">{log.message}</td>
                      <td className="px-4 py-2 text-right">
                        {log.details && (
                          <button
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {expandedLogId === log.id ? 'Hide' : 'Details'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedLogId === log.id && log.details && (
                      <tr className="border-t bg-gray-50">
                        <td colSpan={4} className="px-4 py-3">
                          <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">{log.details}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-48 bg-gray-900 shrink-0 flex flex-col">
        <div className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-700">
          Admin Panel
        </div>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-left text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-8 min-w-0">
        {activeTab === 'stats'    && renderStats()}
        {activeTab === 'classes'  && renderClasses()}
        {activeTab === 'users'    && renderUsers()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'logs'     && renderLogs()}
      </main>
    </div>
  );
}
