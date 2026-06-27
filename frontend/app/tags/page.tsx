'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import { IconTag, IconHourglass, IconSearch } from '@/components/ui/Icons';
import type { AutoTag, Entry } from '@/types';

const TAG_COLORS = ['#34d399', '#38bdf8', '#f59e0b', '#818cf8', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa'];

export default function TagsPage() {
  const [tags, setTags] = useState<AutoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<AutoTag | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.tags.cloud().then(data => {
      setTags(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = search
    ? tags.filter(t => t.tag_name.toLowerCase().includes(search.toLowerCase()))
    : tags;

  const maxCount = Math.max(...tags.map(t => t.usage_count), 1);

  const openTag = async (tag: AutoTag) => {
    setSelectedTag(tag);
    setEntriesLoading(true);
    try {
      const data = await api.tags.entries(tag.tag_id);
      setEntries(data);
    } catch {
      setEntries([]);
    }
    setEntriesLoading(false);
  };

  return (
    <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader icon={<IconTag size={24} />} title="标签云">
        <Navigation />
      </PageHeader>

      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
            <IconSearch size={16} color="#64748b" />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索标签..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {loading ? (
            <div style={{ padding: '40px', color: 'var(--text-muted)' }}><IconHourglass size={24} /> 加载中...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', color: 'var(--text-muted)' }}>没有找到匹配的标签</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {filtered.map((tag, i) => {
                const size = 12 + (tag.usage_count / maxCount) * 28;
                const color = TAG_COLORS[i % TAG_COLORS.length];
                return (
                  <span
                    key={tag.tag_id}
                    onClick={() => openTag(tag)}
                    title={`${tag.tag_name} (${tag.usage_count} 条记录)`}
                    style={{
                      fontSize: `${size}px`, color, cursor: 'pointer', padding: '4px 8px',
                      borderRadius: '6px', transition: 'background 0.15s', lineHeight: 1.4,
                      border: '1px solid transparent', opacity: tag.usage_count / maxCount * 0.6 + 0.4,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {tag.tag_name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {selectedTag && (
          <div style={{ width: '320px', borderLeft: '1px solid var(--border-color)', overflow: 'auto', background: 'var(--bg-secondary)', flexShrink: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedTag.tag_name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedTag.usage_count} 条关联记录</div>
              <button onClick={() => { setSelectedTag(null); setEntries([]); }}
                style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: '4px 0' }}>× 关闭</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {entriesLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>加载中...</div>
              ) : entries.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>暂无关联记录</div>
              ) : (
                entries.map(en => (
                  <div key={en.id} onClick={() => setSelectedEntry(en)}
                    style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{en.topic}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(en.timestamp).toLocaleDateString('zh-CN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {selectedEntry && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedEntry(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto', background: 'var(--bg-primary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedEntry.topic}</div>
              <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {(selectedEntry.summary || selectedEntry.insight).slice(0, 500)}
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {new Date(selectedEntry.timestamp).toLocaleDateString('zh-CN')} · 能量 {selectedEntry.energy_level}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
