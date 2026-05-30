import React from 'react';
import { format } from 'date-fns';
import { MapPin, Clock, Users, DollarSign } from 'lucide-react';
import type { FitnessClass } from '../api/classes';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  fitnessClass: FitnessClass;
  userBookingStatus?: 'confirmed' | 'waitlisted' | 'cancelled';
  onBook?: () => void;
  onCancel?: () => void;
  isBookingLoading: boolean;
}

/**
 * Card component displaying fitness class information.
 * Shows title, instructor, date/time, location, capacity, and booking button.
 */
export function ClassCard({ fitnessClass, userBookingStatus, onBook, onCancel, isBookingLoading }: Props) {
  const { t } = useLanguage();
  const confirmedCount = fitnessClass._count?.bookings ?? 0;
  const spotsLeft = fitnessClass.capacity - confirmedCount;
  const hasBooking = userBookingStatus === 'confirmed' || userBookingStatus === 'waitlisted';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col gap-3 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-gray-900">{fitnessClass.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${
          fitnessClass.status === 'full' ? 'bg-red-100 text-red-700' :
          fitnessClass.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
          'bg-green-100 text-green-700'
        }`}>
          {fitnessClass.status === 'full' ? t.classes.full :
           fitnessClass.status === 'cancelled' ? t.classes.cancelled : `${spotsLeft} ${t.classes.spotsLeft}`}
        </span>
      </div>

      {fitnessClass.description && (
        <p className="text-sm text-gray-600">{fitnessClass.description}</p>
      )}

      <div className="text-sm text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{format(new Date(fitnessClass.startTime), 'PPP p')}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{fitnessClass.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{t.classes.instructor}: {fitnessClass.instructor?.name || 'TBD'}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          <span>${fitnessClass.price}</span>
        </div>
      </div>

      {(onBook || onCancel) && (
        <div className="mt-auto pt-2 flex justify-end">
          <button
            onClick={hasBooking ? onCancel : onBook}
            disabled={isBookingLoading || fitnessClass.status === 'cancelled'}
            className={`px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50 ${
              hasBooking
                ? 'bg-red-500 text-white hover:bg-red-600'
                : (fitnessClass.status === 'full' || spotsLeft <= 0)
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isBookingLoading ? '...' :
             hasBooking ? t.classes.cancel :
             (fitnessClass.status === 'full' || spotsLeft <= 0) ? t.classes.joinWaitlist :
             t.classes.book}
          </button>
        </div>
      )}
    </div>
  );
}
