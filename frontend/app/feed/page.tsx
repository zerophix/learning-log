'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import Tag from '@/components/ui/Tag';
import type { Entry } from '@/types';

const researchTypeMap: Record<string, { label: string; color: string }> = {
  'deep-research': { label: '深度研究', color: '#fbbf24' },
  'topic-exploration': { label: '主题探索', color: '#34d399' },
  'domain-mapping': { label: '领域映射', color: '#a78bfa' }
};

export default function FeedPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = activeFilter ? { research_type: activeFilter } : {};
    api.entries.feed(params)
      .then(data => {
        setEntries(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, [activeFilter]);

  return (
    <div style={{ height: '100vh', background: '#0F172A', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #1E293B', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '17px', fontWeight: 600 }}>📰 Feed 流</span>
        </div>
        <Navigation />
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {/* 过滤器 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {Object.entries(researchTypeMap).map(([id, type]) => (
            <button
              key={id}
              onClick={() => setActiveFilter(activeFilter === id ? null : id)}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: activeFilter === id ? 'none' : '1px solid #334155',
                background: activeFilter === id ? type.color : 'transparent',
                color: activeFilter === id ? '#0F172A' : '#64748b',
                fontSize: '12px',
                fontWeight: activeFilter === id ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              {type.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#475569' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            加载中...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#475569' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌌</div>
            <p>暂无记录</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {entries.map(entry => {
              const rType = researchTypeMap[entry.research_type || ''] || { label: '', color: '#94a3b8' };
              return (
                <div
                  key={entry.id}
                  style={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#475569';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  {/* 标签 */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {entry.topic_tag_id && <Tag label={entry.topic_tag_id.split('.').pop() || ''} color="#38bdf8" />}
                    {entry.research_type && <Tag label={rType.label} color={rType.color} />}
                    <Tag label={`能量 ${entry.energy_level}`} color={entry.energy_level >= 4 ? '#34d399' : '#fb7185'} />
                    {entry.aha_moment === 1 && <span style={{ fontSize: '14px' }}>💡</span>}
                  </div>

                  {/* 标题 */}
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600, color: '#F1F5F9' }}>
                    {entry.topic}
                  </h3>

                  {/* 洞察预览 */}
                  <div style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#94A3B8',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {entry.insight.split('\n').filter(l => l.trim()).slice(0, 2).join(' ')}
                  </div>

                  {/* 时间 */}
                  <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b' }}>
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
