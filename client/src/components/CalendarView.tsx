import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import type { FitnessClass } from '../api/classes';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  classes: FitnessClass[];
  onClassClick: (cls: FitnessClass) => void;
}

/**
 * Monthly and weekly calendar view showing fitness classes.
 * Allows switching between month and week views.
 */
export function CalendarView({ classes, onClassClick }: Props) {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const getClassesForDay = (date: Date) => {
    return classes.filter(c => isSameDay(new Date(c.startTime), date));
  };

  const renderMonthView = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 text-center text-xs font-medium text-gray-500 py-2">{day}</div>
        ))}
        {days.map((day, i) => {
          const dayClasses = getClassesForDay(day);
          return (
            <div key={i} className={`bg-white min-h-[80px] p-1 ${!isSameMonth(day, currentDate) ? 'opacity-40' : ''}`}>
              <span className="text-xs text-gray-500">{format(day, 'd')}</span>
              {dayClasses.slice(0, 3).map(cls => (
                <button
                  key={cls.id}
                  onClick={() => onClassClick(cls)}
                  className="w-full text-left text-xs bg-blue-100 text-blue-800 rounded px-1 mt-0.5 truncate hover:bg-blue-200"
                >
                  {format(new Date(cls.startTime), 'HH:mm')} {cls.title}
                </button>
              ))}
              {dayClasses.length > 3 && (
                <span className="text-xs text-gray-400">+{dayClasses.length - 3} more</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const dayClasses = getClassesForDay(day);
          return (
            <div key={i} className="bg-white rounded border min-h-[200px] p-2">
              <div className="text-xs font-medium text-gray-500 mb-2">
                {format(day, 'EEE d')}
              </div>
              {dayClasses.length === 0 ? (
                <p className="text-xs text-gray-300">{t.classes.noClasses}</p>
              ) : (
                dayClasses.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => onClassClick(cls)}
                    className="w-full text-left text-xs bg-blue-50 rounded p-1 mb-1 hover:bg-blue-100"
                  >
                    <div className="font-medium truncate">{cls.title}</div>
                    <div className="text-gray-500">{format(new Date(cls.startTime), 'HH:mm')}</div>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(d => addDays(d, view === 'month' ? -30 : -7))}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          ‹
        </button>
        <div className="flex gap-2 items-center">
          <span className="font-medium">{format(currentDate, 'MMMM yyyy')}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setView('month')}
              className={`px-2 py-1 text-xs rounded ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-2 py-1 text-xs rounded ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Week
            </button>
          </div>
        </div>
        <button
          onClick={() => setCurrentDate(d => addDays(d, view === 'month' ? 30 : 7))}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          ›
        </button>
      </div>
      {view === 'month' ? renderMonthView() : renderWeekView()}
    </div>
  );
}
