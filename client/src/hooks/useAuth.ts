import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';

/**
 * Hook for authentication actions (login, register, logout).
 * Wraps AuthContext and API calls with loading/error state.
 */
export function useAuthActions() {
  const { login, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      const { token, user } = res.data as { token: string; user: { id: string; name: string; email: string; role: 'admin' | 'instructor' | 'student'; language: string } };
      login(token, user);
      return true;
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Login failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.register({ name, email, password });
      return true;
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Registration failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { handleLogin, handleRegister, logout, isLoading, error, setError };
}
