'use client';
import { useMemo } from 'react';
import Tag from '@/components/ui/Tag';
import MarkdownRenderer from '@/components/renderers/MarkdownRenderer';
import type { Entry } from '@/types';

const researchTypeMap: Record<string, { label: string; color: string }> = {
  'deep-research': { label: '深度研究', color: '#fbbf24' },
  'topic-exploration': { label: '主题探索', color: '#34d399' },
  'domain-mapping': { label: '领域映射', color: '#a78bfa' }
};

export default function EntryDetail({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const markdownContent = useMemo(() => {
    if (!entry) return '';
    let md = `### 💡 核心洞察\n\n${entry.insight}\n\n`;
    if (entry.diagram) md += `### 📊 架构图表\n\n\`\`\`mermaid\n${entry.diagram}\n\`\`\`\n\n`;
    if (entry.star_situation) md += `### 📌 情境\n\n${entry.star_situation}\n\n`;
    if (entry.star_task) md += `### 🎯 任务\n\n${entry.star_task}\n\n`;
    if (entry.star_action) md += `### ⚡ 行动\n\n${entry.star_action}\n\n`;
    if (entry.star_result) md += `### ✅ 结果\n\n${entry.star_result}\n\n`;
    if (entry.code_snippet) md += `### 💻 代码实现\n\n\`\`\`json\n${entry.code_snippet}\n\`\`\`\n\n`;
    return md;
  }, [entry]);

  if (!entry) return null;

  const rType = researchTypeMap[entry.research_type || ''] || { label: '', color: '#94a3b8' };
  const dateTime = new Date(entry.timestamp);
  const dateStr = `${dateTime.getFullYear()}/${dateTime.getMonth()+1}/${dateTime.getDate()}`;
  const timeStr = `${String(dateTime.getHours()).padStart(2,'0')}:${String(dateTime.getMinutes()).padStart(2,'0')}:${String(dateTime.getSeconds()).padStart(2,'0')}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: '16px',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部栏 */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {entry.topic_tag_id && <Tag label={entry.topic_tag_id.split('.').pop() || ''} color="#38bdf8" />}
              {entry.research_type && <Tag label={rType.label} color={rType.color} />}
              <Tag label={`能量 ${entry.energy_level}`} color={entry.energy_level >= 4 ? '#34d399' : '#fb7185'} />
              {entry.aha_moment === 1 && <span style={{ fontSize: '14px' }}>💡</span>}
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', lineHeight: '1.3' }}>
              {entry.topic}
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {dateStr} {timeStr}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#334155',
              border: 'none',
              color: '#94A3B8',
              fontSize: '18px',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#475569'; e.currentTarget.style.color = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            ×
          </button>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
          <MarkdownRenderer content={markdownContent} />

          {/* 自定义标签 */}
          {entry.custom_tags && entry.custom_tags.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>🏷️ 标签</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {entry.custom_tags.map((t, i) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: '16px', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', fontSize: '12px' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
