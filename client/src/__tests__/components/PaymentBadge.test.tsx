import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PaymentBadge } from '../../components/PaymentBadge';
import { LanguageProvider } from '../../contexts/LanguageContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe('PaymentBadge', () => {
  it('shows pending label with yellow styling', () => {
    const { container } = render(<PaymentBadge status="pending" />, { wrapper });
    expect(screen.getByText('Payment Pending')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-yellow-100');
  });

  it('shows paid label with green styling', () => {
    const { container } = render(<PaymentBadge status="paid" />, { wrapper });
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-green-100');
  });

  it('shows refunded label with gray styling', () => {
    const { container } = render(<PaymentBadge status="refunded" />, { wrapper });
    expect(screen.getByText('Refunded')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-gray-100');
  });
});
