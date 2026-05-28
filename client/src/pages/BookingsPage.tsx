import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';
import { bookingsApi } from '../api/bookings';
import type { Booking } from '../api/bookings';
import { PaymentBadge } from '../components/PaymentBadge';
import { useBooking } from '../hooks/useBooking';

export function BookingsPage() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { cancel, isLoading: isCancelling, error: cancelError, setError: setCancelError } = useBooking();

  useEffect(() => {
    bookingsApi.getMyBookings().then(res => {
      setBookings(res.data.bookings);
    }).finally(() => setIsLoading(false));
  }, []);

  const handleCancel = async (booking: Booking) => {
    if (!confirm(t.bookings.cancelConfirm)) return;
    setCancelError(null);
    const ok = await cancel(booking.id);
    if (ok) setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.bookings.myBookings}</h1>
      {cancelError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {cancelError}
        </div>
      )}
      {bookings.length === 0 ? (
        <p className="text-gray-500 text-center">{t.bookings.noBookings}</p>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.id} className="bg-white rounded-lg shadow p-5 flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{b.class?.title || 'Class'}</h3>
                <p className="text-sm text-gray-500">{b.class && format(new Date(b.class.startTime), 'PPP p')}</p>
                <p className="text-sm text-gray-500">{b.class?.location}</p>
                <div className="mt-2 flex gap-2 items-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    b.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {t.bookings[b.status as keyof typeof t.bookings]}
                  </span>
                  <PaymentBadge status={b.paymentStatus} />
                </div>
              </div>
              {b.status !== 'cancelled' && (
                <button
                  onClick={() => handleCancel(b)}
                  disabled={isCancelling}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  {t.bookings.cancelBooking}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
