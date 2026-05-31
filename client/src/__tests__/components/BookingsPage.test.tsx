import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingsPage } from '../../pages/BookingsPage';
import { LanguageProvider } from '../../contexts/LanguageContext';

vi.mock('../../api/bookings', () => ({
  bookingsApi: {
    getMyBookings: vi.fn(),
  },
}));

vi.mock('../../hooks/useBooking', () => ({
  useBooking: vi.fn(),
}));

import { bookingsApi } from '../../api/bookings';
import { useBooking } from '../../hooks/useBooking';

const future = '2099-01-01T10:00:00Z';
const past   = '2020-01-01T10:00:00Z';

const mockBookings = [
  {
    id: 'b1', classId: 'c1', status: 'confirmed', paymentStatus: 'paid', bookedAt: '2099-01-01T00:00:00Z',
    class: { id: 'c1', title: 'Future Yoga', startTime: future, endTime: future, location: 'Room A', instructor: { name: 'Jane', email: 'j@test.com' } },
  },
  {
    id: 'b2', classId: 'c2', status: 'waitlisted', paymentStatus: 'pending', bookedAt: '2099-01-01T00:00:00Z',
    class: { id: 'c2', title: 'Future Pilates', startTime: future, endTime: future, location: 'Room B', instructor: { name: 'Jane', email: 'j@test.com' } },
  },
  {
    id: 'b3', classId: 'c3', status: 'confirmed', paymentStatus: 'paid', bookedAt: '2020-01-01T00:00:00Z',
    class: { id: 'c3', title: 'Past Spin', startTime: past, endTime: past, location: 'Room C', instructor: { name: 'Jane', email: 'j@test.com' } },
  },
  {
    id: 'b4', classId: 'c4', status: 'cancelled', paymentStatus: 'refunded', bookedAt: '2020-01-01T00:00:00Z',
    class: { id: 'c4', title: 'Cancelled Yoga', startTime: past, endTime: past, location: 'Room A', instructor: { name: 'Jane', email: 'j@test.com' } },
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({ data: { bookings: mockBookings } } as never);
    vi.mocked(useBooking).mockReturnValue({ book: vi.fn(), cancel: vi.fn(), isLoading: false, error: null, setError: vi.fn() });
  });

  it('shows upcoming confirmed and waitlisted bookings by default', async () => {
    render(<BookingsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText('Future Yoga')).toBeInTheDocument());
    expect(screen.getByText('Future Pilates')).toBeInTheDocument();
    expect(screen.queryByText('Past Spin')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelled Yoga')).not.toBeInTheDocument();
  });

  it('shows Cancel Booking button for upcoming bookings', async () => {
    render(<BookingsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText('Future Yoga')).toBeInTheDocument());
    expect(screen.getAllByText('Cancel Booking')).toHaveLength(2);
  });

  it('shows past bookings when Past tab is clicked', async () => {
    render(<BookingsPage />, { wrapper });
    await waitFor(() => screen.getByText('Future Yoga'));
    fireEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(screen.getByText('Past Spin')).toBeInTheDocument();
    expect(screen.queryByText('Future Yoga')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelled Yoga')).not.toBeInTheDocument();
  });

  it('does not show Cancel Booking button for past bookings', async () => {
    render(<BookingsPage />, { wrapper });
    await waitFor(() => screen.getByText('Future Yoga'));
    fireEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
  });

  it('shows cancelled bookings when Cancelled tab is clicked', async () => {
    render(<BookingsPage />, { wrapper });
    await waitFor(() => screen.getByText('Future Yoga'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    expect(screen.getByText('Cancelled Yoga')).toBeInTheDocument();
    expect(screen.queryByText('Future Yoga')).not.toBeInTheDocument();
    expect(screen.queryByText('Past Spin')).not.toBeInTheDocument();
  });

  it('does not show Cancel Booking button in Cancelled tab', async () => {
    render(<BookingsPage />, { wrapper });
    await waitFor(() => screen.getByText('Future Yoga'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
  });

  it('shows empty message when no upcoming bookings', async () => {
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({ data: { bookings: [] } } as never);
    render(<BookingsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText('No bookings yet')).toBeInTheDocument());
  });

  it('shows empty message when no past bookings', async () => {
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({ data: { bookings: [] } } as never);
    render(<BookingsPage />, { wrapper });
    await waitFor(() => screen.getByText('No bookings yet'));
    fireEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(screen.getByText('No past bookings')).toBeInTheDocument();
  });

  it('shows empty message when no cancelled bookings', async () => {
    vi.mocked(bookingsApi.getMyBookings).mockResolvedValue({ data: { bookings: [] } } as never);
    render(<BookingsPage />, { wrapper });
    await waitFor(() => screen.getByText('No bookings yet'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    expect(screen.getByText('No cancelled bookings')).toBeInTheDocument();
  });
});
