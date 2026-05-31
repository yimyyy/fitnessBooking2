import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassesPage } from '../../pages/ClassesPage';
import { LanguageProvider } from '../../contexts/LanguageContext';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useClasses', () => ({
  useClasses: vi.fn(),
}));

vi.mock('../../hooks/useBooking', () => ({
  useBooking: vi.fn(),
}));

vi.mock('../../api/bookings', () => ({
  bookingsApi: {
    getMyBookings: vi.fn(),
  },
}));

vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { bookingWindowDays: 7 } }),
  },
}));

import { useAuth } from '../../contexts/AuthContext';
import { useClasses } from '../../hooks/useClasses';
import { useBooking } from '../../hooks/useBooking';
import { bookingsApi } from '../../api/bookings';

const pastClasses = [
  { id: 'c1', title: 'Past Yoga', status: 'upcoming', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', capacity: 10, price: 20, location: 'Room A', instructor: { name: 'Jane' }, _count: { bookings: 5 } },
  { id: 'c2', title: 'Past Pilates', status: 'upcoming', startTime: '2025-01-02T10:00:00Z', endTime: '2025-01-02T11:00:00Z', capacity: 10, price: 20, location: 'Room B', instructor: { name: 'Jane' }, _count: { bookings: 3 } },
  { id: 'c3', title: 'Past Spin', status: 'upcoming', startTime: '2025-01-03T10:00:00Z', endTime: '2025-01-03T11:00:00Z', capacity: 10, price: 20, location: 'Room C', instructor: { name: 'Jane' }, _count: { bookings: 7 } },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('ClassesPage – Past Classes filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBooking).mockReturnValue({ book: vi.fn(), cancel: vi.fn(), isLoading: false, error: null });
    vi.mocked(useClasses).mockReturnValue({ classes: pastClasses, isLoading: false, error: null, refetch: vi.fn() });
  });

  it('shows all past classes when user is not logged in', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, token: null, login: vi.fn(), logout: vi.fn(), isLoading: false });
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({ data: { bookings: [] } } as never);

    render(<ClassesPage />, { wrapper });
    fireEvent.click(screen.getByText('Past Classes'));

    await waitFor(() => {
      expect(screen.getByText('Past Yoga')).toBeInTheDocument();
      expect(screen.getByText('Past Pilates')).toBeInTheDocument();
      expect(screen.getByText('Past Spin')).toBeInTheDocument();
    });
  });

  it('shows only classes with non-cancelled bookings for logged-in student', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'student', language: 'en' }, token: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false });
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({
      data: {
        bookings: [
          { id: 'b1', classId: 'c1', status: 'confirmed', paymentStatus: 'paid', bookedAt: '2025-01-01T00:00:00Z' },
          { id: 'b3', classId: 'c3', status: 'cancelled', paymentStatus: 'pending', bookedAt: '2025-01-03T00:00:00Z' },
        ],
      },
    } as never);

    render(<ClassesPage />, { wrapper });
    fireEvent.click(screen.getByText('Past Classes'));

    await waitFor(() => {
      // c1: confirmed booking → shown
      expect(screen.getByText('Past Yoga')).toBeInTheDocument();
      // c2: no booking → hidden
      expect(screen.queryByText('Past Pilates')).not.toBeInTheDocument();
      // c3: cancelled booking → hidden
      expect(screen.queryByText('Past Spin')).not.toBeInTheDocument();
    });
  });

  it('shows classes with waitlisted bookings for logged-in student', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'student', language: 'en' }, token: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false });
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({
      data: {
        bookings: [
          { id: 'b2', classId: 'c2', status: 'waitlisted', paymentStatus: 'pending', bookedAt: '2025-01-02T00:00:00Z' },
        ],
      },
    } as never);

    render(<ClassesPage />, { wrapper });
    fireEvent.click(screen.getByText('Past Classes'));

    await waitFor(() => {
      expect(screen.getByText('Past Pilates')).toBeInTheDocument();
      expect(screen.queryByText('Past Yoga')).not.toBeInTheDocument();
    });
  });

  it('shows all past classes for admin regardless of bookings', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'a1', name: 'Admin', email: 'admin@test.com', role: 'admin', language: 'en' }, token: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false });
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({ data: { bookings: [] } } as never);

    render(<ClassesPage />, { wrapper });
    fireEvent.click(screen.getByText('Past Classes'));

    await waitFor(() => {
      expect(screen.getByText('Past Yoga')).toBeInTheDocument();
      expect(screen.getByText('Past Pilates')).toBeInTheDocument();
      expect(screen.getByText('Past Spin')).toBeInTheDocument();
    });
  });
});
