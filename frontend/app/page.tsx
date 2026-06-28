'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import StatsPanel from '@/components/layout/StatsPanel';
import TimelineView from '@/components/timeline/TimelineView';
import EntryDetail from '@/components/entry/EntryDetail';
import EntryForm from '@/components/entry/EntryForm';
import { IconBook, IconHourglass, IconEmpty } from '@/components/ui/Icons';
import { useWeekNavigation } from '@/hooks/useWeekNavigation';
import { useEntryFilter } from '@/hooks/useEntryFilter';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { Entry, LearningEntryCreate } from '@/types';

export default function Home() {
  const [selected, setSelected] = useState<Entry | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  const {
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
  } = useWeekNavigation();

  const { searchQuery, activeFilter, setSearchQuery, filteredEntries } = useEntryFilter();
  const { handleError, handleAsyncError } = useErrorHandler();

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    initialize();
  }, [initialize]);

  const handleCreate = async (data: LearningEntryCreate) => {
    const result = await handleAsyncError(
      () => api.entries.create(data),
      '创建记录'
    );
    if (result !== null) {
      setIsCreating(false);
      refreshCurrentWeek();
    }
  };

  const displayEntries = filteredEntries(entries);

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: '100vh',
        maxWidth: '100%',
        margin: '0 auto',
        padding: '0 16px',
      }}
    >
      <PageHeader icon={<IconBook size={24} />} title="学习日志" badge="时间线">
        <SearchBar onSearch={setSearchQuery} />
        <Navigation />
        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary"
          style={{ padding: '8px 16px' }}
        >
          + 新建
        </button>
      </PageHeader>

      <div style={{ padding: '12px 0 0', borderBottom: '1px solid var(--bg-secondary)', flexShrink: 0 }}>
        <StatsPanel />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <main
          ref={mainRef}
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'auto',
            padding: '24px 0 40px', minHeight: 0, display: 'flex', flexDirection: 'column'
          }}
        >
          {error ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#ef4444' }}>
              <p>{error}</p>
              <button onClick={() => currentWeek ? refreshCurrentWeek() : initialize()}
                style={{ marginTop: '12px', padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>重试</button>
            </div>
          ) : loading && entries.length === 0 && !currentWeek ? (
            <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
              <IconHourglass size={32} />
              正在加载学习记录...
            </div>
          ) : !currentWeek && !loading ? (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
              <IconEmpty size={64} />
              <p>暂无灵感记录</p>
            </div>
          ) : currentWeek && (
            <TimelineView
              entries={displayEntries}
              weekInfo={weekInfo}
              weekIndex={weekIndex}
              currentWeek={currentWeek}
              onPrevWeek={goToPrevWeek}
              onNextWeek={goToNextWeek}
              onSelectWeek={navigateToWeek}
              onSelect={setSelected}
            />
          )}
        </main>

        {selected && (
          <EntryDetail entry={selected} onClose={() => setSelected(null)} onRefresh={refreshCurrentWeek} />
        )}
      </div>
      {isCreating && <EntryForm onSave={handleCreate} onCancel={() => setIsCreating(false)} />}
    </div>
  );
}
