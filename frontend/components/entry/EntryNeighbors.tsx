'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { NeighborItem, NeighborsData } from '@/types';

type TabId = 'content' | 'tags' | 'temporal';

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'content', label: '内容邻居', hint: '语义嵌入最相似' },
  { id: 'tags',   label: '标签桥',   hint: '通过共享标签关联' },
  { id: 'temporal', label: '时间邻居', hint: '附近时间的学习记录' },
];

export default function EntryNeighbors({ entryId, onNavigate }: {
  entryId: number;
  onNavigate: (id: number) => void;
}) {
  const [data, setData] = useState<NeighborsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('content');

  useEffect(() => {
    setLoading(true);
    setActiveTab('content');
    api.entries.neighbors(entryId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [entryId]);

  if (loading) return (
    <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px 28px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>计算关联中...</div>
    </div>
  );
  if (!data) return null;

  const { neighbors } = data;
  const activeEntries = neighbors[activeTab as keyof typeof neighbors] as NeighborItem[];
  const activeInfo = TABS.find(t => t.id === activeTab)!;

  return (
    <div style={{ borderTop: '1px solid var(--border-color)' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        padding: '0 28px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        {TABS.map(tab => {
          const count = (neighbors[tab.id as keyof typeof neighbors] as NeighborItem[]).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="tab-btn"
              style={{
                borderBottom: isActive ? '2px solid var(--accent-sky)' : '2px solid transparent',
                color: isActive ? 'var(--accent-sky)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  marginLeft: '6px',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: isActive ? 'var(--accent-sky)' : 'var(--text-muted)',
                  background: 'transparent',
                  padding: '0',
                  lineHeight: '14px',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: '20px 28px 28px' }}>
        {/* Energy shifts */}
        {neighbors.energy_context.length > 0 && (
          <div style={{
            marginBottom: '20px',
            padding: '14px 16px',
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '10px',
              fontWeight: 600,
            }}>能量波动</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {neighbors.energy_context.map((s, i) => (
                <div key={i} className="energy-context-item">
                  <span style={{
                    color: s.direction === '↑' ? '#34d399' : '#f87171',
                    fontWeight: 700,
                    fontSize: '13px',
                    minWidth: '16px',
                    textAlign: 'center',
                  }}>{s.direction}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.type}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>from</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(s.from_entry.id); }}
                    className="link-accent"
                    style={{ flex: 1, fontSize: '12px', padding: '2px 4px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {s.from_entry.topic}
                  </button>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(s.to_entry.id); }}
                    className="link-accent"
                    style={{ flex: 1, fontSize: '12px', padding: '2px 4px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {s.to_entry.topic}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active tab entries */}
        {activeEntries.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeEntries.map(item => (
              <NeighborRow key={item.id} entry={item} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
            borderRadius: '10px',
            background: 'rgba(30,41,59,0.3)',
            border: '1px dashed var(--border-color)',
          }}>
            暂无{activeInfo.label}关联数据
          </div>
        )}
      </div>
    </div>
  );
}

function NeighborRow({ entry, onNavigate }: { entry: NeighborItem; onNavigate: (id: number) => void }) {
  return (
    <div
      onClick={() => onNavigate(entry.id)}
      className="neighbor-row"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: '6px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: '1.4',
        }}>
          {entry.topic}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {entry.reasons.map((r, i) => (
            <span key={i} style={{
              background: 'var(--bg-primary)',
              padding: '2px 8px',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}>{r}</span>
          ))}
        </div>
      </div>
      <div style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--accent-sky)',
        flexShrink: 0,
        marginLeft: '8px',
        fontVariantNumeric: 'tabular-nums',
        padding: '4px 8px',
        borderRadius: '6px',
        minWidth: '48px',
        textAlign: 'center',
      }}>
        {(entry.score * 100).toFixed(0)}%
      </div>
    </div>
  );
}
