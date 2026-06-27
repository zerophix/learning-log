'use client';
import { useState, useMemo } from 'react';
import Tag from '@/components/ui/Tag';
import MarkdownRenderer from '@/components/renderers/MarkdownRenderer';
import MermaidDiagram from '@/components/renderers/MermaidDiagram';
import EntryForm from '@/components/entry/EntryForm';
import DeleteConfirm from '@/components/entry/DeleteConfirm';
import { IconLightbulb, IconTag } from '@/components/ui/Icons';
import { api } from '@/lib/api';
import { getResearchTypeInfo } from '@/lib/constants';
import { useToast } from '@/hooks/useToast';
import type { Entry, LearningEntryCreate } from '@/types';

export default function EntryDetail({ entry, onClose, onRefresh }: { entry: Entry | null; onClose: () => void; onRefresh?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { addToast } = useToast();
  const markdownContent = useMemo(() => {
    if (!entry) return '';
    let md = `### 核心洞察\n\n${entry.insight}\n\n`;
    if (entry.star_situation) md += `### 情境\n\n${entry.star_situation}\n\n`;
    if (entry.star_task) md += `### 任务\n\n${entry.star_task}\n\n`;
    if (entry.star_action) md += `### 行动\n\n${entry.star_action}\n\n`;
    if (entry.star_result) md += `### 结果\n\n${entry.star_result}\n\n`;
    if (entry.code_snippet) md += `### 代码实现\n\n\`\`\`json\n${entry.code_snippet}\n\`\`\`\n\n`;
    return md;
  }, [entry]);

  if (!entry) return null;

  const rType = getResearchTypeInfo(entry.research_type || '');
  const dateTime = new Date(entry.timestamp);
  const dateStr = `${dateTime.getFullYear()}/${dateTime.getMonth()+1}/${dateTime.getDate()}`;
  const timeStr = `${String(dateTime.getHours()).padStart(2,'0')}:${String(dateTime.getMinutes()).padStart(2,'0')}:${String(dateTime.getSeconds()).padStart(2,'0')}`;

  const handleDelete = async () => {
    if (!entry) return;
    try {
      await api.entries.delete(entry.id);
      addToast('已删除', 'success');
      onRefresh?.();
      onClose();
    } catch (err) {
      addToast('删除失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      console.error('Delete failed:', err);
    }
  };

  const handleUpdate = async (data: LearningEntryCreate) => {
    if (!entry) return;
    try {
      await api.entries.update(entry.id, data);
      addToast('更新成功', 'success');
      setIsEditing(false);
      onRefresh?.();
      onClose();
    } catch (err) {
      addToast('更新失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      console.error('Update failed:', err);
    }
  };

  if (isEditing && entry) {
    return <EntryForm entry={entry} onSave={handleUpdate} onCancel={() => setIsEditing(false)} />;
  }

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
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
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
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {entry.topic_tag_id && <Tag label={entry.topic_tag_id.split('.').pop() || ''} color="var(--accent-sky)" />}
              {entry.research_type && <Tag label={rType.label} color={rType.color} />}
              <Tag label={`能量 ${entry.energy_level}`} color={entry.energy_level >= 4 ? 'var(--accent-emerald)' : '#fb7185'} />
              {entry.aha_moment === 1 && (
                <IconLightbulb size={16} />
              )}
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.3' }}>
              {entry.topic}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {dateStr} {timeStr}
            </div>
          </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'var(--border-color)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                编辑
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  background: '#7f1d1d',
                  border: 'none',
                  color: '#fca5a5',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#991b1b'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#7f1d1d'; }}
              >
                删除
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--border-color)',
                  border: 'none',
                  color: 'var(--text-secondary)',
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
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                ×
              </button>
            </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
          <MarkdownRenderer content={markdownContent} />

          {entry.diagram && (
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '28px 0 14px 0',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)',
                letterSpacing: '-0.01em'
              }}>架构图表</h3>
              <MermaidDiagram chart={entry.diagram} />
            </div>
          )}

          {/* 自定义标签 */}
          {entry.custom_tags && entry.custom_tags.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconTag size={12} />
                标签
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {entry.custom_tags.map((t, i) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: '16px', background: 'rgba(56,189,248,0.12)', color: 'var(--accent-sky)', fontSize: '12px' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {showDeleteConfirm && (
          <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />
        )}
      </div>
    </div>
  );
}
