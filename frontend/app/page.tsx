'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import StatsPanel from '@/components/layout/StatsPanel';
import TimelineView from '@/components/timeline/TimelineView';
import EntryDetail from '@/components/entry/EntryDetail';
import EntryForm from '@/components/entry/EntryForm';
import { IconBook, IconHourglass, IconEmpty } from '@/components/ui/Icons';
import { useToast } from '@/hooks/useToast';
import type { Entry, LearningEntryCreate, WeekInfo } from '@/types';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<{ year: number; week: number } | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [weekIndex, setWeekIndex] = useState<WeekInfo[]>([]);

  const mainRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    initialize();
  }, []);

  const initialize = async () => {
    setLoading(true);
    try {
      const weeks = await api.entries.weekIndex();
      setWeekIndex(weeks);
      if (weeks.length > 0) {
        const latest = weeks[0];
        setCurrentWeek({ year: latest.year, week: latest.week });
        loadWeek(latest.year, latest.week);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setLoading(false);
    }
  };

  const loadWeek = async (year: number, week: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.entries.byWeek(year, week);
      setEntries(res.data);
      setWeekInfo(res.week);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const navigateToWeek = (year: number, week: number) => {
    setCurrentWeek({ year, week });
    loadWeek(year, week);
  };

  const handlePrevWeek = () => {
    if (!currentWeek) return;
    const idx = weekIndex.findIndex(w => w.year === currentWeek.year && w.week === currentWeek.week);
    if (idx < weekIndex.length - 1) {
      const prev = weekIndex[idx + 1];
      navigateToWeek(prev.year, prev.week);
    }
  };

  const handleNextWeek = () => {
    if (!currentWeek) return;
    const idx = weekIndex.findIndex(w => w.year === currentWeek.year && w.week === currentWeek.week);
    if (idx > 0) {
      const next = weekIndex[idx - 1];
      navigateToWeek(next.year, next.week);
    }
  };

  const handleCreate = async (data: LearningEntryCreate) => {
    try {
      await api.entries.create(data);
      addToast('记录创建成功', 'success');
      setIsCreating(false);
      if (currentWeek) loadWeek(currentWeek.year, currentWeek.week);
    } catch (err) {
      addToast('创建失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      console.error('Create failed:', err);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inTopic = e.topic.toLowerCase().includes(q);
        const inInsight = e.insight.toLowerCase().includes(q);
        const inSummary = e.summary?.toLowerCase().includes(q);
        const inTags = e.custom_tags?.some(t => t.toLowerCase().includes(q));
        if (!inTopic && !inInsight && !inSummary && !inTags) return false;
      }
      if (!activeFilter) return true;
      if (activeFilter.type === 'research') return e.research_type === activeFilter.id;
      if (activeFilter.type === 'project') return e.project_tag_id === activeFilter.id;
      if (activeFilter.type === 'tag') return e.topic_tag_id === activeFilter.id || e.related_tag_ids?.includes(activeFilter.id);
      return true;
    });
  }, [entries, activeFilter, searchQuery]);

  return (
    <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader icon={<IconBook size={24} />} title="学习日志" badge="时间线">
        <SearchBar onSearch={setSearchQuery} />
        <Navigation />
        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: 'var(--accent-sky)', color: 'var(--bg-primary)',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#7dd3fc'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-sky)'; }}
        >
          + 新建
        </button>
      </PageHeader>

      <div style={{ padding: '12px 28px 0', borderBottom: '1px solid var(--bg-secondary)', flexShrink: 0 }}>
        <StatsPanel />
      </div>

      <main
        ref={mainRef}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '24px 28px 40px', minHeight: 0
        }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#ef4444' }}>
            <p>{error}</p>
            <button onClick={() => currentWeek ? loadWeek(currentWeek.year, currentWeek.week) : initialize()}
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
            entries={filteredEntries}
            weekInfo={weekInfo}
            weekIndex={weekIndex}
            currentWeek={currentWeek}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onSelectWeek={navigateToWeek}
            onSelect={setSelected}
          />
        )}
      </main>

      <EntryDetail entry={selected} onClose={() => setSelected(null)} onRefresh={() => currentWeek && loadWeek(currentWeek.year, currentWeek.week)} />
      {isCreating && <EntryForm onSave={handleCreate} onCancel={() => setIsCreating(false)} />}
    </div>
  );
}
