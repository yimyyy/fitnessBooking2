import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBooking } from '../../hooks/useBooking';

vi.mock('../../api/bookings', () => ({
  bookingsApi: {
    create: vi.fn(),
    cancel: vi.fn(),
    getMyBookings: vi.fn(),
  },
}));

import { bookingsApi } from '../../api/bookings';

describe('useBooking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls correct API endpoint on book', async () => {
    (bookingsApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { booking: { id: 'b1', status: 'confirmed', classId: 'c1' } },
    });

    const { result } = renderHook(() => useBooking());
    let booking;
    await act(async () => {
      booking = await result.current.book('c1');
    });
    expect(bookingsApi.create).toHaveBeenCalledWith('c1');
    expect(booking).toMatchObject({ status: 'confirmed' });
  });

  it('handles booking error', async () => {
    (bookingsApi.create as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: 'Class full' } },
    });

    const { result } = renderHook(() => useBooking());
    let booking;
    await act(async () => {
      booking = await result.current.book('c1');
    });
    expect(booking).toBeNull();
    expect(result.current.error).toBe('Class full');
  });
});
