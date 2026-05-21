import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClasses } from '../../hooks/useClasses';

vi.mock('../../api/classes', () => ({
  classesApi: {
    getAll: vi.fn(),
  },
}));

import { classesApi } from '../../api/classes';

const mockClasses = [{ id: 'c1', title: 'Yoga', status: 'upcoming' }];

describe('useClasses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and returns class list', async () => {
    (classesApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { classes: mockClasses } });

    const { result } = renderHook(() => useClasses());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.classes).toHaveLength(1);
    expect(result.current.classes[0].title).toBe('Yoga');
  });

  it('handles error state', async () => {
    (classesApi.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useClasses());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to load classes');
  });
});
