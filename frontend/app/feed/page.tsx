'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import EntryTags from '@/components/entry/EntryTags';
import { IconList, IconHourglass, IconEmpty } from '@/components/ui/Icons';
import { RESEARCH_TYPES } from '@/lib/constants';
import type { Entry } from '@/types';

export default function FeedPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = activeFilter ? { research_type: activeFilter } : {};
    api.entries.feed(params)
      .then(data => {
        setEntries(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        setError(err.message || '加载 Feed 失败');
        console.error('Feed load failed:', err);
      })
      .finally(() => setLoading(false));
  }, [activeFilter]);

  return (
    <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader icon={<IconList size={24} />} title="Feed 流">
        <Navigation />
      </PageHeader>

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {/* 过滤器 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {Object.entries(RESEARCH_TYPES).map(([id, type]) => (
            <button
              key={id}
              onClick={() => setActiveFilter(activeFilter === id ? null : id)}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: activeFilter === id ? 'none' : '1px solid var(--border-color)',
                background: activeFilter === id ? type.color : 'transparent',
                color: activeFilter === id ? 'var(--bg-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: activeFilter === id ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              {type.label}
            </button>
          ))}
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#ef4444' }}>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            <IconHourglass size={32} />
            加载中...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <IconEmpty size={64} />
            <p>暂无记录</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {entries.map(entry => {
              return (
                <div
                  key={entry.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-muted)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  <EntryTags entry={entry} showEnergy />

                  {/* 标题 */}
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {entry.topic}
                  </h3>

                  {/* 洞察预览 */}
                  <div style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {entry.insight.split('\n').filter(l => l.trim()).slice(0, 2).join(' ')}
                  </div>

                  {/* 时间 */}
                  <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
