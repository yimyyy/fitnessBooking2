import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CalendarView } from '../../components/CalendarView';
import { LanguageProvider } from '../../contexts/LanguageContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const futureDate = new Date(Date.now() + 5 * 24 * 3600000).toISOString();

const mockClasses = [
  {
    id: 'c1',
    title: 'Morning Yoga',
    description: 'Yoga',
    instructorId: 'i1',
    instructor: { id: 'i1', name: 'Jane', email: 'jane@test.com' },
    startTime: futureDate,
    endTime: futureDate,
    capacity: 10,
    price: 20,
    location: 'Room A',
    status: 'upcoming' as const,
  },
];

describe('CalendarView', () => {
  it('renders without crashing with empty classes', () => {
    render(<CalendarView classes={[]} onClassClick={vi.fn()} />, { wrapper });
    expect(screen.getByText('Month')).toBeInTheDocument();
  });

  it('renders classes on correct date', () => {
    render(<CalendarView classes={mockClasses} onClassClick={vi.fn()} />, { wrapper });
    expect(screen.getByText(/Morning Yoga/)).toBeInTheDocument();
  });
});
