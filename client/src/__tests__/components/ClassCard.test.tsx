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

  it('shows Book Now when spots are available', () => {
    render(<ClassCard fitnessClass={mockClass} onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />, { wrapper });
    expect(screen.getByRole('button', { name: 'Book Now' })).toBeInTheDocument();
  });

  it('shows Join Waitlist when class status is full', () => {
    const cls = { ...mockClass, status: 'full' as const, _count: { bookings: 10 } };
    render(<ClassCard fitnessClass={cls} onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />, { wrapper });
    expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument();
  });

  it('shows Join Waitlist when spotsLeft reaches 0 even if status is upcoming', () => {
    const cls = { ...mockClass, status: 'upcoming' as const, capacity: 5, _count: { bookings: 5 } };
    render(<ClassCard fitnessClass={cls} onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />, { wrapper });
    expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument();
  });

  it('shows Cancel Booking when user has a confirmed booking', () => {
    render(
      <ClassCard fitnessClass={mockClass} userBookingStatus="confirmed" onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />,
      { wrapper }
    );
    expect(screen.getByRole('button', { name: 'Cancel Booking' })).toBeInTheDocument();
  });

  it('shows Cancel Booking when user is waitlisted', () => {
    const cls = { ...mockClass, status: 'full' as const, _count: { bookings: 10 } };
    render(
      <ClassCard fitnessClass={cls} userBookingStatus="waitlisted" onBook={vi.fn()} onCancel={vi.fn()} isBookingLoading={false} />,
      { wrapper }
    );
    expect(screen.getByRole('button', { name: 'Cancel Booking' })).toBeInTheDocument();
  });
});
