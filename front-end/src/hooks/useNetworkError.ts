import { useState, useCallback } from 'react';
import { analyzeError, NetworkError } from '../utils/networkUtils';

export const useNetworkError = () => {
  const [networkError, setNetworkError] = useState<NetworkError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback(async (error: any) => {
    const analyzedError = await analyzeError(error);
    setNetworkError(analyzedError);
    return analyzedError;
  }, []);

  const clearError = useCallback(() => {
    setNetworkError(null);
  }, []);

  const retryWithErrorHandling = useCallback(async (retryFunction: () => Promise<any>) => {
    setIsRetrying(true);
    try {
      const result = await retryFunction();
      clearError();
      return result;
    } catch (error) {
      await handleError(error);
      throw error;
    } finally {
      setIsRetrying(false);
    }
  }, [handleError, clearError]);

  return {
    networkError,
    isRetrying,
    handleError,
    clearError,
    retryWithErrorHandling
  };
};