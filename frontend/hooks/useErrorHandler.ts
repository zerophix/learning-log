'use client';
import { useCallback } from 'react';
import { useToast } from './useToast';

type ErrorSeverity = 'error' | 'info' | 'success';

interface UseErrorHandlerReturn {
  handleError: (error: unknown, context?: string, severity?: ErrorSeverity) => void;
  handleAsyncError: <T>(fn: () => Promise<T>, context?: string) => Promise<T | null>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const { addToast } = useToast();

  const handleError = useCallback((error: unknown, context?: string, severity: ErrorSeverity = 'error') => {
    const message = error instanceof Error ? error.message : '未知错误';
    const fullMessage = context ? `${context}: ${message}` : message;

    console.error(fullMessage, error);
    addToast(fullMessage, severity);
  }, [addToast]);

  const handleAsyncError = useCallback(async <T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
}
