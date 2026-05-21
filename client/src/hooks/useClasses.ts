import { useState, useEffect } from 'react';
import { classesApi } from '../api/classes';
import type { FitnessClass } from '../api/classes';

/**
 * Hook for fetching and caching fitness classes.
 */
export function useClasses() {
  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await classesApi.getAll();
      setClasses(res.data.classes);
    } catch {
      setError('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return { classes, isLoading, error, refetch: fetchClasses };
}
