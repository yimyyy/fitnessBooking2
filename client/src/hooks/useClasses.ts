import { useState, useEffect, useCallback } from 'react';
import { classesApi } from '../api/classes';
import type { FitnessClass } from '../api/classes';

export function useClasses(view: 'upcoming' | 'past' = 'upcoming') {
  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await classesApi.getAll(view);
      setClasses(res.data.classes);
    } catch {
      setError('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { classes, isLoading, error, refetch: fetchClasses };
}
