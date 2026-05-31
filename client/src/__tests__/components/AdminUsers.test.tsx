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
      if (path === '/admin/users') return Promise.resolve({
        data: {
          users: [
            { id: 'u1', name: 'Alice Smith', email: 'alice@test.com', role: 'student', _count: { bookings: 2 } },
            { id: 'u2', name: 'Bob Jones', email: 'bob@example.com', role: 'instructor', _count: { bookings: 0 } },
            { id: 'u3', name: 'Carol White', email: 'carol@test.com', role: 'student', _count: { bookings: 1 } },
          ],
        },
      });
      return Promise.resolve({ data: {} });
    }),
  },
}));

vi.mock('../../api/admin', () => ({
  adminApi: {
    getSettings: vi.fn().mockResolvedValue({ data: { settings: { cancellationWindowHours: '24' } } }),
    getLocations: vi.fn().mockResolvedValue({ data: { locations: [] } }),
    getLogs: vi.fn(),
    getUserBookings: vi.fn(),
    bookForUser: vi.fn(),
    updatePayment: vi.fn(),
    updateUserRole: vi.fn(),
    createLocation: vi.fn(),
    deleteLocation: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

async function openUsersTab() {
  render(<AdminPage />, { wrapper });
  fireEvent.click(screen.getByRole('button', { name: 'Users' }));
  await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
}

describe('Admin Users tab – search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getLogs).mockResolvedValue({ data: { logs: [] } } as never);
  });

  it('shows all users by default', async () => {
    await openUsersTab();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
  });

  it('filters users by name (case-insensitive)', async () => {
    await openUsersTab();
    fireEvent.change(screen.getByRole('textbox', { name: /search users/i }), { target: { value: 'alice' } });
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
  });

  it('filters users by email', async () => {
    await openUsersTab();
    fireEvent.change(screen.getByRole('textbox', { name: /search users/i }), { target: { value: 'example.com' } });
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
  });

  it('shows all users again when search is cleared', async () => {
    await openUsersTab();
    const input = screen.getByRole('textbox', { name: /search users/i });
    fireEvent.change(input, { target: { value: 'alice' } });
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
  });

  it('shows no rows when search matches nothing', async () => {
    await openUsersTab();
    fireEvent.change(screen.getByRole('textbox', { name: /search users/i }), { target: { value: 'zzznomatch' } });
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
  });

  it('matches partial name across multiple users', async () => {
    await openUsersTab();
    fireEvent.change(screen.getByRole('textbox', { name: /search users/i }), { target: { value: 'test.com' } });
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
  });
});
