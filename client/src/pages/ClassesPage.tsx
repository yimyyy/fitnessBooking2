import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../hooks/useClasses';
import { useBooking } from '../hooks/useBooking';
import { ClassCard } from '../components/ClassCard';
import { CalendarView } from '../components/CalendarView';
import type { FitnessClass } from '../api/classes';
import { bookingsApi } from '../api/bookings';

export function ClassesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { classes, isLoading, error, refetch } = useClasses();
  const { book, cancel, isLoading: isBookingLoading } = useBooking();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [userBookings, setUserBookings] = useState<Record<string, { id: string; status: 'confirmed' | 'waitlisted' | 'cancelled' }>>({});

  React.useEffect(() => {
    if (user) {
      bookingsApi.getMyBookings().then(res => {
        const map: Record<string, { id: string; status: 'confirmed' | 'waitlisted' | 'cancelled' }> = {};
        res.data.bookings.forEach((b) => {
          map[b.classId] = { id: b.id, status: b.status as 'confirmed' | 'waitlisted' | 'cancelled' };
        });
        setUserBookings(map);
      }).catch(console.error);
    }
  }, [user]);

  const handleBook = async (classId: string) => {
    const booking = await book(classId);
    if (booking) {
      setUserBookings(prev => ({
        ...prev,
        [classId]: { id: booking.id, status: booking.status as 'confirmed' | 'waitlisted' | 'cancelled' },
      }));
      refetch();
    }
  };

  const handleCancel = async (classId: string) => {
    const b = userBookings[classId];
    if (!b) return;
    const ok = await cancel(b.id);
    if (ok) {
      setUserBookings(prev => ({ ...prev, [classId]: { ...prev[classId], status: 'cancelled' } }));
      refetch();
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.classes.title}</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('list')} className={`px-3 py-1 text-sm rounded ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>List</button>
          <button onClick={() => setView('calendar')} className={`px-3 py-1 text-sm rounded ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Calendar</button>
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView
          classes={classes}
          onClassClick={(cls: FitnessClass) => {
            const b = userBookings[cls.id];
            if (b && (b.status === 'confirmed' || b.status === 'waitlisted')) handleCancel(cls.id);
            else handleBook(cls.id);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center">{t.classes.noClasses}</p>
          ) : (
            classes.map(cls => (
              <ClassCard
                key={cls.id}
                fitnessClass={cls}
                userBookingStatus={userBookings[cls.id]?.status}
                onBook={() => handleBook(cls.id)}
                onCancel={() => handleCancel(cls.id)}
                isBookingLoading={isBookingLoading}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
