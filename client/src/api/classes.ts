import { apiClient } from './client';

export interface FitnessClass {
  id: string;
  title: string;
  description?: string;
  instructorId: string;
  instructor: { id: string; name: string; email: string };
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  location: string;
  status: 'upcoming' | 'full' | 'cancelled';
  _count?: { bookings: number };
}

export interface CreateClassData {
  title: string;
  description?: string;
  instructorId: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  location: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export const classesApi = {
  getAll: (view: 'upcoming' | 'past' = 'upcoming') =>
    apiClient.get<{ classes: FitnessClass[] }>('/classes', { params: { view } }),
  getById: (id: string) => apiClient.get<{ class: FitnessClass }>(`/classes/${id}`),
  create: (data: CreateClassData) => apiClient.post<{ class: FitnessClass }>('/classes', data),
  update: (id: string, data: Partial<CreateClassData>) =>
    apiClient.put<{ class: FitnessClass }>(`/classes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/classes/${id}`),
};
