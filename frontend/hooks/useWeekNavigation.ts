'use client';
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Entry, WeekInfo, WeekResponse } from '@/types';

interface UseWeekNavigationReturn {
  currentWeek: { year: number; week: number } | null;
  weekInfo: WeekInfo | null;
  weekIndex: WeekInfo[];
  entries: Entry[];
  loading: boolean;
  error: string | null;
  hasPrev: boolean;
  hasNext: boolean;
  initialize: () => Promise<void>;
  navigateToWeek: (year: number, week: number) => Promise<void>;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  refreshCurrentWeek: () => Promise<void>;
}

export function useWeekNavigation(): UseWeekNavigationReturn {
  const [currentWeek, setCurrentWeek] = useState<{ year: number; week: number } | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [weekIndex, setWeekIndex] = useState<WeekInfo[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeek = useCallback(async (year: number, week: number) => {
    setLoading(true);
    setError(null);
    try {
      const res: WeekResponse = await api.entries.byWeek(year, week);
      setEntries(res.data);
      setWeekInfo(res.week);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const weeks = await api.entries.weekIndex();
      setWeekIndex(weeks);
      if (weeks.length > 0) {
        const latest = weeks[0];
        setCurrentWeek({ year: latest.year, week: latest.week });
        await loadWeek(latest.year, latest.week);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setLoading(false);
    }
  }, [loadWeek]);

  const navigateToWeek = useCallback(async (year: number, week: number) => {
    setCurrentWeek({ year, week });
    await loadWeek(year, week);
  }, [loadWeek]);

  const currentIdx = weekIndex.findIndex(
    w => currentWeek && w.year === currentWeek.year && w.week === currentWeek.week
  );
  const hasPrev = currentIdx < weekIndex.length - 1;
  const hasNext = currentIdx > 0;

  const goToPrevWeek = useCallback(() => {
    if (!currentWeek || !hasPrev) return;
    const prev = weekIndex[currentIdx + 1];
    navigateToWeek(prev.year, prev.week);
  }, [currentWeek, hasPrev, currentIdx, weekIndex, navigateToWeek]);

  const goToNextWeek = useCallback(() => {
    if (!currentWeek || !hasNext) return;
    const next = weekIndex[currentIdx - 1];
    navigateToWeek(next.year, next.week);
  }, [currentWeek, hasNext, currentIdx, weekIndex, navigateToWeek]);

  const refreshCurrentWeek = useCallback(async () => {
    if (currentWeek) {
      await loadWeek(currentWeek.year, currentWeek.week);
    }
  }, [currentWeek, loadWeek]);

  return {
    currentWeek,
    weekInfo,
    weekIndex,
    entries,
    loading,
    error,
    hasPrev,
    hasNext,
    initialize,
    navigateToWeek,
    goToPrevWeek,
    goToNextWeek,
    refreshCurrentWeek,
  };
}
