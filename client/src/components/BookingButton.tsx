import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  spotsLeft: number;
  hasBooking: boolean;
  bookingStatus?: 'confirmed' | 'waitlisted' | 'cancelled';
  isLoading: boolean;
  classStatus: 'upcoming' | 'full' | 'cancelled';
  onBook: () => void;
  onCancel: () => void;
}

/**
 * Smart booking button that shows correct action based on state:
 * - Cancel (if user has confirmed/waitlisted booking)
 * - Join Waitlist (if class is full and user not booked)
 * - Book Now (if spots available)
 * - Class Full (disabled if full and no waitlist)
 */
export function BookingButton({ spotsLeft, hasBooking, bookingStatus, isLoading, classStatus, onBook, onCancel }: Props) {
  const { t } = useLanguage();

  if (classStatus === 'cancelled') {
    return (
      <button disabled className="px-4 py-2 bg-gray-200 text-gray-500 rounded cursor-not-allowed">
        {t.classes.cancelled}
      </button>
    );
  }

  if (hasBooking && (bookingStatus === 'confirmed' || bookingStatus === 'waitlisted')) {
    return (
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition"
      >
        {isLoading ? '...' : t.classes.cancel}
      </button>
    );
  }

  if (classStatus === 'full' || spotsLeft <= 0) {
    return (
      <button
        onClick={onBook}
        disabled={isLoading}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 transition"
      >
        {isLoading ? '...' : t.classes.joinWaitlist}
      </button>
    );
  }

  return (
    <button
      onClick={onBook}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
    >
      {isLoading ? '...' : t.classes.book}
    </button>
  );
}
