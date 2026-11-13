import { useCallback, useEffect, useState } from 'react';

export const useFetch = (serviceFn, { immediate = true, initialData = null } = {}) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(immediate));
  const [error, setError] = useState(null);
  const [isDegraded, setIsDegraded] = useState(false);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await serviceFn(...args);
        if (result && typeof result === 'object' && 'data' in result && 'isDegraded' in result) {
          setData(result.data);
          setIsDegraded(Boolean(result.isDegraded));
          return result.data;
        }
        setData(result);
        setIsDegraded(false);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [serviceFn]
  );

  useEffect(() => {
    if (immediate) {
      execute().catch(() => {});
    }
  }, [immediate, execute]);

  return {
    data,
    loading,
    error,
    isDegraded,
    execute,
    setData,
  };
};

