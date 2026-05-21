import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClassCard } from '../../components/ClassCard';
import { LanguageProvider } from '../../contexts/LanguageContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockClass = {
  id: 'c1',
  title: 'Morning Yoga',
  description: 'Start your day right',
  instructorId: 'i1',
  instructor: { id: 'i1', name: 'Jane Smith', email: 'jane@test.com' },
  startTime: '2026-06-01T09:00:00Z',
  endTime: '2026-06-01T10:00:00Z',
  capacity: 10,
  price: 20,
  location: 'Studio A',
  status: 'upcoming' as const,
  _count: { bookings: 5 },
};

describe('ClassCard', () => {
  it('renders class title', () => {
    render(<ClassCard fitnessClass={mockClass} onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />, { wrapper });
    expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
  });

  it('renders instructor name', () => {
    render(<ClassCard fitnessClass={mockClass} onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />, { wrapper });
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
  });

  it('renders location', () => {
    render(<ClassCard fitnessClass={mockClass} onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />, { wrapper });
    expect(screen.getByText('Studio A')).toBeInTheDocument();
  });

  it('handles missing description gracefully', () => {
    const cls = { ...mockClass, description: undefined };
    render(<ClassCard fitnessClass={cls} onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />, { wrapper });
    expect(screen.getByText('Morning Yoga')).toBeInTheDocument();
  });
});
