'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import EntryTags from '@/components/entry/EntryTags';
import EntryDetailContent from '@/components/entry/EntryDetailContent';
import EntryNeighbors from '@/components/entry/EntryNeighbors';
import EntryForm from '@/components/entry/EntryForm';
import DeleteConfirm from '@/components/entry/DeleteConfirm';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import type { Entry, LearningEntryCreate } from '@/types';

export default function EntryDetail({ entry, onClose, onRefresh }: { entry: Entry | null; onClose: () => void; onRefresh?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [navigateId, setNavigateId] = useState<number | null>(null);
  const [navigateEntry, setNavigateEntry] = useState<Entry | null>(null);
  const { addToast } = useToast();

  const displayEntry = navigateEntry || entry;

  const markdownContent = useMemo(() => {
    if (!displayEntry) return '';
    let md = '';
    if (displayEntry.summary) md += `### 摘要\n\n${displayEntry.summary}\n\n`;
    md += `### 核心洞察\n\n${displayEntry.insight}\n\n`;
    if (displayEntry.star_situation) md += `### 情境\n\n${displayEntry.star_situation}\n\n`;
    if (displayEntry.star_task) md += `### 任务\n\n${displayEntry.star_task}\n\n`;
    if (displayEntry.star_action) md += `### 行动\n\n${displayEntry.star_action}\n\n`;
    if (displayEntry.star_result) md += `### 结果\n\n${displayEntry.star_result}\n\n`;
    if (displayEntry.code_snippet) md += `### 代码实现\n\n\`\`\`json\n${displayEntry.code_snippet}\n\`\`\`\n\n`;
    return md;
  }, [displayEntry]);

  const navigateTo = useCallback(async (id: number) => {
    if (id === entry?.id) { setNavigateEntry(null); setNavigateId(null); return; }
    setNavigateId(id);
    try {
      const e = await api.entries.get(id);
      setNavigateEntry(e);
    } catch {
      setNavigateEntry(null);
    }
  }, [entry]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (navigateEntry) { setNavigateEntry(null); setNavigateId(null); }
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, navigateEntry]);

  if (!entry) return null;

  const dateTime = new Date((navigateEntry || entry).timestamp);
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

  const activeEntry = displayEntry;
  if (!activeEntry) return null;

  if (isEditing && entry) {
    return <EntryForm entry={entry} onSave={handleUpdate} onCancel={() => setIsEditing(false)} />;
  }

  return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={activeEntry.topic}
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
        onClick={() => { if (navigateEntry) { setNavigateEntry(null); setNavigateId(null); } else onClose(); }}
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
            <EntryTags entry={activeEntry} showEnergy />
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.3' }}>
              {activeEntry.topic}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', display: 'flex', gap: '12px' }}>
              <span>{dateStr} {timeStr}</span>
              {navigateEntry && (
                <button onClick={(e) => { e.preventDefault(); setNavigateEntry(null); setNavigateId(null); }} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                  ← 返回 {entry.topic.slice(0, 24)}
                </button>
              )}
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
                onClick={() => { if (navigateEntry) { setNavigateEntry(null); setNavigateId(null); } else onClose(); }}
                aria-label="关闭"
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

        <div style={{ overflow: 'auto', flex: 1 }}>
          <EntryDetailContent entry={activeEntry} markdownContent={markdownContent} />
          <EntryNeighbors entryId={activeEntry.id} onNavigate={navigateTo} />
        </div>

        {showDeleteConfirm && (
          <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />
        )}
      </div>
    </div>
  );
}
