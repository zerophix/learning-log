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
import { IconBook, IconHourglass, IconEmpty, IconLoader } from '@/components/ui/Icons';
import { useToast } from '@/hooks/useToast';
import type { Entry, LearningEntryCreate } from '@/types';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 30;
  const offsetRef = useRef(0);

  const mainRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadEntries(true);
    }
  }, []);

  const loadEntriesRef = useRef<(reset?: boolean) => void>();
  const { addToast } = useToast();

  const handleCreate = async (data: LearningEntryCreate) => {
    try {
      await api.entries.create(data);
      addToast('记录创建成功', 'success');
      setIsCreating(false);
      loadEntries(true);
    } catch (err) {
      addToast('创建失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      console.error('Create failed:', err);
    }
  };

  const loadEntries = (reset = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(reset);

    const currentOffset = reset ? 0 : offsetRef.current;
    api.entries.list(limit, currentOffset)
      .then(data => {
        setError(null);
        const newEntries = Array.isArray(data) ? data : [];
        const newIds = new Set(newEntries.map(e => e.id));
        setEntries(prev => {
          const filtered = prev.filter(e => !newIds.has(e.id));
          return reset ? newEntries : [...filtered, ...newEntries];
        });
        offsetRef.current = reset ? limit : offsetRef.current + limit;
        if (newEntries.length < limit) hasMoreRef.current = false;
      })
      .catch(err => {
        setError(err.message || '加载失败');
        console.error('Load entries failed:', err);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
      });
  };

  loadEntriesRef.current = loadEntries;

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 400 && hasMoreRef.current && !isLoadingRef.current) {
        setLoadingMore(true);
        loadEntriesRef.current?.();
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // 按日期分组 + 过滤 + 搜索
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      // 搜索过滤
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inTopic = e.topic.toLowerCase().includes(q);
        const inInsight = e.insight.toLowerCase().includes(q);
        const inTags = e.custom_tags?.some(t => t.toLowerCase().includes(q));
        if (!inTopic && !inInsight && !inTags) return false;
      }
      // 类型过滤
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
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent-sky)',
            color: 'var(--bg-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#7dd3fc'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-sky)'; }}
        >
          + 新建
        </button>
      </PageHeader>

      {/* 统计面板 */}
      <div style={{ padding: '12px 28px 0', borderBottom: '1px solid var(--bg-secondary)', flexShrink: 0 }}>
        <StatsPanel />
      </div>

      {/* 时间线内容 */}
      <main
        ref={mainRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px 28px 40px',
          minHeight: 0
        }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#ef4444' }}>
            <p>{error}</p>
            <button onClick={() => loadEntries(true)} style={{ marginTop: '12px', padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>重试</button>
          </div>
        ) : loading && entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            <IconHourglass size={32} />
            正在加载学习记录...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <IconEmpty size={64} />
            <p>暂无灵感记录</p>
          </div>
        ) : (
          <>
            <TimelineView entries={filteredEntries} onSelect={setSelected} />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <IconLoader size={20} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                {' '}加载中...
              </div>
            )}
            {!hasMoreRef.current && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                — 已加载全部 {entries.length} 条记录 —
              </div>
            )}
          </>
        )}
      </main>

      <EntryDetail entry={selected} onClose={() => setSelected(null)} onRefresh={() => loadEntries(true)} />
      {isCreating && <EntryForm onSave={handleCreate} onCancel={() => setIsCreating(false)} />}
    </div>
  );
}
