import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingButton } from '../../components/BookingButton';
import { LanguageProvider } from '../../contexts/LanguageContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('BookingButton', () => {
  const defaultProps = {
    spotsLeft: 5,
    hasBooking: false,
    isLoading: false,
    classStatus: 'upcoming' as const,
    onBook: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('shows Book Now when spots available', () => {
    render(<BookingButton {...defaultProps} />, { wrapper });
    expect(screen.getByText('Book Now')).toBeInTheDocument();
  });

  it('shows Join Waitlist when class is full', () => {
    render(<BookingButton {...defaultProps} classStatus="full" />, { wrapper });
    expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
  });

  it('shows Cancel when user has confirmed booking', () => {
    render(<BookingButton {...defaultProps} hasBooking bookingStatus="confirmed" />, { wrapper });
    expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
  });

  it('shows Cancel when user is waitlisted', () => {
    render(<BookingButton {...defaultProps} hasBooking bookingStatus="waitlisted" />, { wrapper });
    expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
  });

  it('calls onBook when Book Now clicked', () => {
    render(<BookingButton {...defaultProps} />, { wrapper });
    fireEvent.click(screen.getByText('Book Now'));
    expect(defaultProps.onBook).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel clicked', () => {
    render(<BookingButton {...defaultProps} hasBooking bookingStatus="confirmed" />, { wrapper });
    fireEvent.click(screen.getByText('Cancel Booking'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
