import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPage } from '../../pages/AdminPage';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { adminApi } from '../../api/admin';

vi.mock('../../api/classes', () => ({
  classesApi: {
    getAll: vi.fn().mockResolvedValue({ data: { classes: [] } }),
    cancel: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn((path: string) => {
      if (path === '/admin/stats') return Promise.resolve({ data: { totalBookings: 0, totalRevenue: 0, classCount: 0 } });
      if (path === '/admin/users') return Promise.resolve({ data: { users: [] } });
      return Promise.resolve({ data: {} });
    }),
  },
}));

vi.mock('../../api/admin', () => ({
  adminApi: {
    getSettings: vi.fn().mockResolvedValue({ data: { settings: { cancellationWindowHours: '24' } } }),
    getLogs: vi.fn(),
    getUserBookings: vi.fn(),
    bookForUser: vi.fn(),
    updatePayment: vi.fn(),
    updateUserRole: vi.fn(),
  },
}));

const mockLogs = [
  { id: 'log-1', timestamp: '2026-05-30T10:00:00Z', type: 'email' as const, message: 'Booking confirmation sent', details: 'To: alice@test.com' },
  { id: 'log-2', timestamp: '2026-05-30T11:00:00Z', type: 'error' as const, message: 'Internal server error', details: 'Error: DB connection\n  at server.ts:10' },
  { id: 'log-3', timestamp: '2026-05-30T12:00:00Z', type: 'email' as const, message: 'Reminder sent', details: undefined },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

async function openLogsTab() {
  render(<AdminPage />, { wrapper });
  fireEvent.click(screen.getByRole('button', { name: 'Logs' }));
  await waitFor(() => expect(screen.getByText('Booking confirmation sent')).toBeInTheDocument());
}

describe('Admin Logs tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getLogs).mockResolvedValue({ data: { logs: mockLogs } } as never);
  });

  it('shows all logs by default', async () => {
    await openLogsTab();
    expect(screen.getByText('Booking confirmation sent')).toBeInTheDocument();
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
    expect(screen.getByText('Reminder sent')).toBeInTheDocument();
  });

  it('filters to email logs when Email pill is clicked', async () => {
    await openLogsTab();
    fireEvent.click(screen.getByRole('button', { name: /email/i }));
    expect(screen.getByText('Booking confirmation sent')).toBeInTheDocument();
    expect(screen.getByText('Reminder sent')).toBeInTheDocument();
    expect(screen.queryByText('Internal server error')).not.toBeInTheDocument();
  });

  it('filters to error logs when Error pill is clicked', async () => {
    await openLogsTab();
    fireEvent.click(screen.getByRole('button', { name: /error/i }));
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
    expect(screen.queryByText('Booking confirmation sent')).not.toBeInTheDocument();
  });

  it('shows all logs again when All pill is clicked after filtering', async () => {
    await openLogsTab();
    fireEvent.click(screen.getByRole('button', { name: /error/i }));
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(screen.getByText('Booking confirmation sent')).toBeInTheDocument();
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
  });

  it('expands details when Details button is clicked', async () => {
    await openLogsTab();
    expect(screen.queryByText('To: alice@test.com')).not.toBeInTheDocument();
    const detailsButtons = screen.getAllByRole('button', { name: 'Details' });
    fireEvent.click(detailsButtons[0]);
    expect(screen.getByText('To: alice@test.com')).toBeInTheDocument();
  });

  it('collapses details when Hide is clicked', async () => {
    await openLogsTab();
    const detailsButtons = screen.getAllByRole('button', { name: 'Details' });
    fireEvent.click(detailsButtons[0]);
    expect(screen.getByText('To: alice@test.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('To: alice@test.com')).not.toBeInTheDocument();
  });

  it('does not show Details button for logs without details', async () => {
    await openLogsTab();
    // log-1 and log-2 have details; log-3 does not
    expect(screen.getAllByRole('button', { name: 'Details' })).toHaveLength(2);
  });
});
