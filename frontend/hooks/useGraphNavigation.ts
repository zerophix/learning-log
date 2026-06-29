'use client';

import { useState, useCallback } from 'react';
import type { EnhancedGraphViewType } from '@/types/graph';

interface NavigationEntry {
  nodeId: number | null;
  viewType: EnhancedGraphViewType;
  galaxyCenterId: number | null;
}

export function useGraphNavigation() {
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const push = useCallback((entry: NavigationEntry) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, currentIndex + 1);
      return [...trimmed, entry];
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const back = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const forward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  return {
    push,
    back,
    forward,
    canGoBack,
    canGoForward,
    currentEntry: history[currentIndex] || null,
  };
}
