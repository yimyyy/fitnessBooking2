import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type PaymentStatus = 'pending' | 'paid' | 'refunded';

interface Props {
  status: PaymentStatus;
}

const statusConfig: Record<PaymentStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100 text-yellow-800', text: 'paymentPending' },
  paid:    { bg: 'bg-green-100 text-green-800',  text: 'paymentPaid' },
  refunded:{ bg: 'bg-gray-100 text-gray-800',    text: 'paymentRefunded' },
};

/**
 * Badge showing booking payment status with color coding.
 */
export function PaymentBadge({ status }: Props) {
  const { t } = useLanguage();
  const cfg = statusConfig[status];

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}>
      {t.bookings[cfg.text as keyof typeof t.bookings]}
    </span>
  );
}
