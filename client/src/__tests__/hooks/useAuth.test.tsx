import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth', () => {
  it('provides null user by default', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('handles login and stores user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login('token123', {
        id: '1', name: 'Alice', email: 'alice@test.com', role: 'student', language: 'en',
      });
    });
    expect(result.current.user?.email).toBe('alice@test.com');
    expect(result.current.token).toBe('token123');
  });

  it('handles logout and clears user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login('token123', {
        id: '1', name: 'Alice', email: 'alice@test.com', role: 'student', language: 'en',
      });
    });
    act(() => { result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
