'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import FilterBar from '@/components/layout/FilterBar';
import TimelineView from '@/components/timeline/TimelineView';
import EntryDetail from '@/components/entry/EntryDetail';
import type { Entry } from '@/types';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; id: string } | null>(null);
  const [offset, setOffset] = useState(0);
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

  const loadEntries = (reset = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(reset);

    const currentOffset = reset ? 0 : offsetRef.current;
    api.entries.list(limit, currentOffset)
      .then(data => {
        const newEntries = Array.isArray(data) ? data : [];
        const newIds = new Set(newEntries.map(e => e.id));
        setEntries(prev => {
          const filtered = prev.filter(e => !newIds.has(e.id));
          return reset ? newEntries : [...filtered, ...newEntries];
        });
        const nextOffset = reset ? limit : offsetRef.current + limit;
        setOffset(nextOffset);
        offsetRef.current = nextOffset;
        if (newEntries.length < limit) hasMoreRef.current = false;
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

  // 按日期分组 + 过滤
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (!activeFilter) return true;
      if (activeFilter.type === 'research') return e.research_type === activeFilter.id;
      if (activeFilter.type === 'project') return e.project_tag_id === activeFilter.id;
      if (activeFilter.type === 'tag') return e.topic_tag_id === activeFilter.id || e.related_tag_ids?.includes(activeFilter.id);
      return true;
    });
  }, [entries, activeFilter]);

  return (
    <div style={{ height: '100vh', background: '#0F172A', color: '#F8FAFC', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部导航栏 */}
      <header style={{ borderBottom: '1px solid #1E293B', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.5px' }}>📚 学习日志</span>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#1E293B', color: '#64748b' }}>时间线</span>
        </div>
        <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </header>

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
        {loading && entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#475569' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            正在加载学习记录...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#475569' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌌</div>
            <p>暂无灵感记录</p>
          </div>
        ) : (
          <>
            <TimelineView entries={filteredEntries} onSelect={setSelected} />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                {' '}加载中...
              </div>
            )}
            {!hasMoreRef.current && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#475569', fontSize: '12px' }}>
                — 已加载全部 {entries.length} 条记录 —
              </div>
            )}
          </>
        )}
      </main>

      <EntryDetail entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
