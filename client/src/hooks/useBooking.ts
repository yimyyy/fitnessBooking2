import { useState } from 'react';
import { bookingsApi } from '../api/bookings';

/**
 * Hook for booking/cancelling fitness classes.
 * Provides optimistic UI updates.
 */
export function useBooking() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const book = async (classId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.create(classId);
      return res.data.booking;
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Booking failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const cancel = async (bookingId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await bookingsApi.cancel(bookingId);
      return true;
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Cancellation failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { book, cancel, isLoading, error };
}
