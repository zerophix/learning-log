import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface NeighborItem {
  id: number;
  topic: string;
  energy: number;
  timestamp: string;
  score: number;
  reasons: string[];
}

interface EnergyShift {
  direction: string;
  type: string;
  from_entry: { id: number; topic: string };
  to_entry: { id: number; topic: string };
}

interface NeighborsData {
  entry_id: number;
  topic: string;
  neighbors: {
    content: NeighborItem[];
    temporal: NeighborItem[];
    tags: NeighborItem[];
    energy_context: EnergyShift[];
  };
}

export default function EntryNeighbors({ entryId, onNavigate }: { entryId: number; onNavigate: (id: number) => void }) {
  const [data, setData] = useState<NeighborsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.entries.neighbors(entryId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [entryId]);

  if (loading) return <div style={{ padding: '16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>计算关联中...</div>;
  if (!data) return null;

  const { neighbors } = data;

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px 28px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        关联探索
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 内容邻居 */}
        {neighbors.content.length > 0 && (
          <Section title="内容邻居" hint="语义嵌入最相似" entries={neighbors.content} onNavigate={onNavigate} />
        )}

        {/* 标签桥 */}
        {neighbors.tags.length > 0 && (
          <Section title="标签桥" hint="通过共享标签关联" entries={neighbors.tags} onNavigate={onNavigate} />
        )}

        {/* 时间邻居 */}
        {neighbors.temporal.length > 0 && (
          <Section title="时间邻居" hint="附近时间的学习记录" entries={neighbors.temporal} onNavigate={onNavigate} />
        )}

        {/* 能量异动 */}
        {neighbors.energy_context.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>能量变化</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>学习强度波动</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {neighbors.energy_context.map((s, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: s.direction === '↑' ? '#34d399' : '#f87171' }}>{s.direction}</span>
                  <span>{s.type}</span>
                  <button onClick={() => onNavigate(s.from_entry.id)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}>{s.from_entry.topic.slice(0, 20)}</button>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <button onClick={() => onNavigate(s.to_entry.id)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}>{s.to_entry.topic.slice(0, 20)}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {neighbors.content.length === 0 && neighbors.tags.length === 0 && neighbors.temporal.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>暂无关联记录</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, entries, onNavigate }: {
  title: string; hint: string; entries: NeighborItem[]; onNavigate: (id: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map(e => (
          <div key={e.id} onClick={() => onNavigate(e.id)}
            style={{
              padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
              background: 'var(--bg-primary)', transition: 'background 0.15s',
              border: '1px solid transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.topic}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {e.reasons.map((r, i) => (
                  <span key={i} style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px' }}>{r}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', flexShrink: 0, marginLeft: '8px' }}>
              {(e.score * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
