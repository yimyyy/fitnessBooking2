import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../hooks/useClasses';
import { useBooking } from '../hooks/useBooking';
import { ClassCard } from '../components/ClassCard';
import { CalendarView } from '../components/CalendarView';
import type { FitnessClass } from '../api/classes';
import { bookingsApi } from '../api/bookings';
import { apiClient } from '../api/client';

export function ClassesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [classView, setClassView] = useState<'upcoming' | 'past'>('upcoming');
  const [displayView, setDisplayView] = useState<'list' | 'calendar'>('list');
  const { classes, isLoading, error, refetch } = useClasses(classView);
  const { book, cancel, isLoading: isBookingLoading } = useBooking();
  const [userBookings, setUserBookings] = useState<Record<string, { id: string; status: 'confirmed' | 'waitlisted' | 'cancelled' }>>({});
  const [bookingWindowDays, setBookingWindowDays] = useState(7);

  useEffect(() => {
    apiClient.get<{ bookingWindowDays: number }>('/settings/public')
      .then(res => setBookingWindowDays(res.data.bookingWindowDays))
      .catch(() => {}); // fall back to default 7
  }, []);

  useEffect(() => {
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

  const displayClasses =
    user && user.role !== 'admin' && classView === 'past'
      ? classes.filter(cls => {
          const b = userBookings[cls.id];
          return b && b.status !== 'cancelled';
        })
      : classes;

  const isWithinBookingWindow = (cls: FitnessClass): boolean => {
    const msUntilClass = new Date(cls.startTime).getTime() - Date.now();
    return msUntilClass <= bookingWindowDays * 86400000;
  };

  const bookingOpensAt = (cls: FitnessClass): Date | undefined => {
    if (isWithinBookingWindow(cls)) return undefined;
    return new Date(new Date(cls.startTime).getTime() - bookingWindowDays * 86400000);
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.classes.title}</h1>
        <div className="flex gap-2">
          {/* Upcoming / Past toggle */}
          <div className="flex rounded border border-gray-300 overflow-hidden">
            <button
              onClick={() => setClassView('upcoming')}
              className={`px-3 py-1 text-sm ${classView === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {t.classes.upcoming}
            </button>
            <button
              onClick={() => setClassView('past')}
              className={`px-3 py-1 text-sm border-l border-gray-300 ${classView === 'past' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {t.classes.pastClasses}
            </button>
          </div>

          {/* List / Calendar toggle — only for upcoming */}
          {classView === 'upcoming' && (
            <div className="flex gap-1">
              <button onClick={() => setDisplayView('list')} className={`px-3 py-1 text-sm rounded ${displayView === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>List</button>
              <button onClick={() => setDisplayView('calendar')} className={`px-3 py-1 text-sm rounded ${displayView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Calendar</button>
            </div>
          )}
        </div>
      </div>

      {classView === 'upcoming' && displayView === 'calendar' ? (
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
          {displayClasses.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center">
              {classView === 'past' ? t.classes.noPastClasses : t.classes.noClasses}
            </p>
          ) : (
            displayClasses.map(cls => {
              const isNonAdminUpcoming = classView === 'upcoming' && !!user && user.role !== 'admin';
              const withinWindow = isNonAdminUpcoming && isWithinBookingWindow(cls);
              return (
                <ClassCard
                  key={cls.id}
                  fitnessClass={cls}
                  userBookingStatus={classView === 'upcoming' ? userBookings[cls.id]?.status : undefined}
                  onBook={withinWindow ? () => handleBook(cls.id) : undefined}
                  onCancel={withinWindow ? () => handleCancel(cls.id) : undefined}
                  bookingOpensAt={isNonAdminUpcoming && !withinWindow ? bookingOpensAt(cls) : undefined}
                  isBookingLoading={isBookingLoading}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
