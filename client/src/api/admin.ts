import { apiClient } from './client';

export interface Location {
  id: string;
  name: string;
}

export interface AdminBooking {
  id: string;
  userId: string;
  classId: string;
  status: string;
  paymentStatus: string;
  paymentAmount: number | null;
  paymentRef: string | null;
  bookedAt: string;
  class?: {
    id: string;
    title: string;
    startTime: string;
    location: string;
    instructor?: { id: string; name: string };
  };
}

export const adminApi = {
  getSettings: () =>
    apiClient.get<{ settings: Record<string, string> }>('/admin/settings'),

  updateSetting: (key: string, value: string) =>
    apiClient.put<{ settings: Record<string, string> }>('/admin/settings', { key, value }),

  getUserBookings: (userId: string) =>
    apiClient.get<{ bookings: AdminBooking[] }>(`/admin/users/${userId}/bookings`),

  bookForUser: (userId: string, classId: string) =>
    apiClient.post<{ booking: AdminBooking }>('/admin/bookings', { userId, classId }),

  updatePayment: (bookingId: string, paymentStatus: string) =>
    apiClient.patch<{ booking: AdminBooking }>(`/admin/bookings/${bookingId}/payment`, { paymentStatus }),

  getLogs: () =>
    apiClient.get<{ logs: LogEntry[] }>('/admin/logs'),

  updateUserRole: (userId: string, role: string) =>
    apiClient.patch<{ user: { id: string; name: string; email: string; role: string } }>(`/admin/users/${userId}/role`, { role }),

  getLocations: () =>
    apiClient.get<{ locations: Location[] }>('/admin/locations'),

  createLocation: (name: string) =>
    apiClient.post<{ location: Location }>('/admin/locations', { name }),

  deleteLocation: (id: string) =>
    apiClient.delete(`/admin/locations/${id}`),
};

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'email' | 'error';
  message: string;
  details?: string;
}
