import { useCallback } from "react";
import { handleApiError, withRetry } from "./apiErrorHandler";

/**
 * Hook for handling API errors consistently
 * Provides utilities for error handling in components
 */
export function useApiError() {
  const handleError = useCallback((error, options = {}) => {
    return handleApiError(error, options);
  }, []);

  const withErrorHandling = useCallback(async (apiCall, options = {}) => {
    try {
      return await apiCall();
    } catch (error) {
      handleError(error, options);
      if (options.rethrow) throw error;
      return null;
    }
  }, [handleError]);

  const withRetryAndErrorHandling = useCallback(async (apiCall, options = {}) => {
    try {
      return await withRetry(apiCall, options);
    } catch (error) {
      handleError(error, options);
      if (options.rethrow) throw error;
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    withErrorHandling,
    withRetry: withRetryAndErrorHandling
  };
}