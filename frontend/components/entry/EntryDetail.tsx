'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import EntryTags from '@/components/entry/EntryTags';
import EntryDetailContent from '@/components/entry/EntryDetailContent';
import EntryNeighbors from '@/components/entry/EntryNeighbors';
import EntryForm from '@/components/entry/EntryForm';
import DeleteConfirm from '@/components/entry/DeleteConfirm';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { IconEdit, IconDelete, IconClose } from '@/components/ui/Icons';
import type { Entry, LearningEntryCreate } from '@/types';

export default function EntryDetail({ entry, onClose, onRefresh, showNeighborsPanel = true }: { entry: Entry | null; onClose: () => void; onRefresh?: () => void; showNeighborsPanel?: boolean }) {
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
        className="sidebar-detail"
        style={{ padding: '0 16px' }}
      >
        {/* 顶部栏 */}
        <div style={{
          padding: '12px 28px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          gap: '16px',
        }}>
          <div style={{ minWidth: 0, flex: 1, marginRight: '8px' }}>
            <h2 style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {activeEntry.topic}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {dateStr} {timeStr}
              </span>
              <span style={{ color: 'var(--border-color)', fontSize: '10px' }}>·</span>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '1px 6px', lineHeight: 1, background: 'none', border: 'none' }}
              >
                编辑
              </button>
              <span style={{ color: 'var(--border-color)', fontSize: '10px' }}>·</span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="btn btn-danger"
                style={{ fontSize: '11px', padding: '1px 6px', lineHeight: 1, background: 'none', border: 'none' }}
              >
                删除
              </button>
            </div>
          </div>

          <button
            onClick={() => { if (navigateEntry) { setNavigateEntry(null); setNavigateId(null); } else onClose(); }}
            aria-label="关闭"
            className="icon-btn"
          >
            <IconClose size={12} />
          </button>

        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '16px 0', height: '100%' }}>
          <EntryDetailContent entry={activeEntry} markdownContent={markdownContent} />
          {showNeighborsPanel && <EntryNeighbors entryId={activeEntry.id} onNavigate={navigateTo} />}
        </div>

        {showDeleteConfirm && (
          <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />
        )}
      </div>
  );
}
