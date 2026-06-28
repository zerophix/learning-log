'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import FilterBar from '@/components/layout/FilterBar';
import SearchBar from '@/components/ui/SearchBar';
import EntryDetail from '@/components/entry/EntryDetail';
import InsightPreview from '@/components/entry/InsightPreview';
import EntryTags from '@/components/entry/EntryTags';
import { IconList, IconHourglass, IconEmpty, IconChevronDown, IconCluster } from '@/components/ui/Icons';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { Entry, AttentionGraph, FeedParams } from '@/types';

const PAGE_SIZE = 20;
const CLUSTER_COLORS = ['#34d399', '#38bdf8', '#f59e0b', '#818cf8', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa', '#f87171', '#10b981'];

export default function FeedPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [attention, setAttention] = useState<AttentionGraph | null>(null);
  const [clusterFilter, setClusterFilter] = useState<number | null>(null);
  const loadKeyRef = useRef(0);
  const { handleAsyncError } = useErrorHandler();

  useEffect(() => {
    api.attention({ top_k: 5 }).then(setAttention).catch(() => {});
  }, []);

  const loadEntries = async (reset: boolean) => {
    const key = ++loadKeyRef.current;
    const currentOffset = reset ? 0 : offset;
    const setLoad = reset ? setLoading : setLoadingMore;
    setLoad(true);
    setError(null);
    try {
      const params: FeedParams = { limit: PAGE_SIZE, offset: currentOffset };
      if (activeFilter) params.research_type = activeFilter.id;
      const data = await api.entries.feed(params);
      if (key !== loadKeyRef.current) return;
      if (reset) {
        setEntries(Array.isArray(data) ? data : []);
      } else {
        setEntries(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
      }
      setHasMore(Array.isArray(data) && data.length === PAGE_SIZE);
      if (!reset) setOffset(currentOffset + PAGE_SIZE);
      else setOffset(PAGE_SIZE);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setError(msg);
    } finally {
      if (key === loadKeyRef.current) {
        (reset ? setLoading : setLoadingMore)(false);
      }
    }
  };

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    loadEntries(true);
  }, [activeFilter]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadEntries(false);
  };

  const clusterMap = new Map<number, number>();
  if (attention) {
    attention.nodes.forEach(n => clusterMap.set(n.id, n.cluster));
  }

  const filteredEntries = entries.filter(e => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = e.topic.toLowerCase().includes(q)
        || (e.summary || '').toLowerCase().includes(q)
        || e.insight.toLowerCase().includes(q)
        || e.custom_tags?.some(t => t.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    if (clusterFilter !== null) {
      const entryCluster = clusterMap.get(e.id);
      if (entryCluster === undefined || entryCluster !== clusterFilter) return false;
    }
    return true;
  });

  return (
    <div className="page-shell">
      <PageHeader icon={<IconList size={24} />} title="Feed 流">
        <SearchBar onSearch={setSearchQuery} />
        <Navigation />
      </PageHeader>

      <main className="main-scroll" style={{ padding: '24px 28px' }}>
        <div className="flex-wrap" style={{ marginBottom: '24px', alignItems: 'center' }}>
          <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          {attention && attention.clusters.length > 0 && (
            <select
              value={clusterFilter === null ? '' : clusterFilter}
              onChange={e => setClusterFilter(e.target.value === '' ? null : Number(e.target.value))}
              className="text-xs"
              style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none',
              }}
            >
              <option value="">全部聚类</option>
              {attention.clusters.map((name, i) => (
                <option key={i} value={i}>{name.slice(0, 30)}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-between text-xs" style={{ marginBottom: '16px' }}>
          <span>
            共 {filteredEntries.length} / {entries.length} 条记录
            {searchQuery && `（搜索"${searchQuery}"）`}
            {clusterFilter !== null && ` · ${attention?.clusters[clusterFilter]?.slice(0, 24) || ''}`}
          </span>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#ef4444' }}>
            <p>{error}</p>
            <button onClick={() => { setOffset(0); loadEntries(true); }}
              className="btn btn-ghost" style={{ marginTop: '12px', padding: '8px 16px' }}>
              重试
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            <IconHourglass size={32} /> 加载中...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <IconEmpty size={64} />
            <p>{searchQuery || clusterFilter !== null ? '没有匹配的记录' : '暂无记录'}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filteredEntries.map(entry => {
                const entryCluster = clusterMap.get(entry.id);
                return (
                  <div key={entry.id} role="button" tabIndex={0}
                    onClick={() => setSelectedEntry(entry)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEntry(entry); } }}
                    className="card"
                    style={{ padding: '20px', position: 'relative' }}
                  >
                    <EntryTags entry={entry} showEnergy />
                    {attention && entryCluster !== undefined && (
                      <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                        background: CLUSTER_COLORS[entryCluster % CLUSTER_COLORS.length] + '30',
                        color: CLUSTER_COLORS[entryCluster % CLUSTER_COLORS.length],
                        border: '1px solid ' + CLUSTER_COLORS[entryCluster % CLUSTER_COLORS.length] + '40'
                      }}>
                        {attention.clusters[entryCluster]?.slice(0, 14) || ''}
                      </div>
                    )}
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', paddingRight: '60px' }}>
                      {entry.topic}
                    </h3>
                    <InsightPreview insight={entry.insight} summary={entry.summary} />
                    <div className="text-xs" style={{ marginTop: '12px', color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <button onClick={handleLoadMore} disabled={loadingMore}
                  className="btn btn-ghost"
                  style={{ padding: '10px 24px' }}
                >
                  <IconChevronDown size={14} />
                  {loadingMore ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedEntry && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setSelectedEntry(null)} />
          <div style={{
            position: 'fixed', top: 0, right: 0, zIndex: 100,
            width: '540px', height: '100dvh'
          }}>
            <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
          </div>
        </>
      )}
    </div>
  );
}
