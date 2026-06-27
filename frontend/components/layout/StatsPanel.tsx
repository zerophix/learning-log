'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Stats } from '@/types';

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stats()
      .then(data => setStats(data))
      .catch(err => {
        setError(err.message || '加载统计失败');
        console.error('Stats load failed:', err);
      });
  }, []);

  if (error) return <div style={{ padding: '12px 0', fontSize: '12px', color: '#ef4444' }}>{error}</div>;
  if (!stats) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '12px 0'
    }}>
      <div style={{
        flex: 1,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '12px 16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8' }}>{stats.entries}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>条目总数</div>
      </div>
      <div style={{
        flex: 1,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '12px 16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#34d399' }}>{stats.tags}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>标签总数</div>
      </div>
      <div style={{
        flex: 1,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '12px 16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>{stats.links}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>关联总数</div>
      </div>
    </div>
  );
}
