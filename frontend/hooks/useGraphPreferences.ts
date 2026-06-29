'use client';

import { useEffect, useCallback, useRef } from 'react';
import type { EnhancedGraphViewType, EdgeTypeFilter } from '@/types/graph';
import type { EnhancedViewConfig, EnhancedGraphFilter } from '@/types/graph';

const STORAGE_KEY = 'graph-prefs';

interface GraphPreferences {
  viewType: EnhancedGraphViewType;
  showEdges: boolean;
  showLabels: boolean;
  edgeTypeFilter: EdgeTypeFilter;
  topK: number;
}

function loadPreferences(): GraphPreferences | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function savePreferences(prefs: GraphPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

export function useGraphPreferences() {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const init = useCallback((): Partial<GraphPreferences> => {
    return loadPreferences() || {};
  }, []);

  const persist = useCallback((prefs: Partial<GraphPreferences>) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const existing = loadPreferences() || {
        viewType: 'force',
        showEdges: true,
        showLabels: true,
        edgeTypeFilter: 'all',
        topK: 80,
      };
      savePreferences({ ...existing, ...prefs });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return { init, persist };
}
