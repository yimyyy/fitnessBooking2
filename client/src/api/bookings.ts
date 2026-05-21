import { apiClient } from './client';

export interface Booking {
  id: string;
  userId: string;
  classId: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentAmount?: number;
  paymentRef?: string;
  bookedAt: string;
  cancelledAt?: string;
  class?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    instructor: { name: string; email: string };
  };
}

export const bookingsApi = {
  create: (classId: string) => apiClient.post<{ booking: Booking }>('/bookings', { classId }),
  cancel: (id: string) => apiClient.delete(`/bookings/${id}`),
  getMyBookings: () => apiClient.get<{ bookings: Booking[] }>('/bookings/my'),
};
