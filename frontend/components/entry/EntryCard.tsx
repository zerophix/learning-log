import EntryTags from '@/components/entry/EntryTags';
import InsightPreview from '@/components/entry/InsightPreview';
import { IconLightbulb } from '@/components/ui/Icons';
import type { Entry } from '@/types';

export default function EntryCard({ entry, onClick }: { entry: Entry; onClick: (e: Entry) => void }) {
  const date = new Date(entry.timestamp);
  const timeStr = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  return (
    <div
      onClick={() => onClick(entry)}
      style={{
        display: 'flex',
        gap: '24px',
        cursor: 'pointer',
        padding: '16px 0',
        transition: 'all 0.2s'
      }}
    >
      {/* 左侧：时间点 */}
      <div style={{
        width: '60px',
        textAlign: 'right',
        paddingTop: '12px',
        flexShrink: 0
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: entry.energy_level >= 4 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {timeStr}
        </span>
      </div>

      {/* 中间：时间线轴 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: entry.energy_level >= 4 ? '14px' : '10px',
          height: entry.energy_level >= 4 ? '14px' : '10px',
          borderRadius: '50%',
          background: entry.energy_level >= 4 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
          border: '3px solid var(--bg-primary)',
          boxShadow: `0 0 0 2px ${entry.energy_level >= 4 ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
          flexShrink: 0,
          zIndex: 2
        }} />
        {entry.aha_moment === 1 && (
          <IconLightbulb size={16} />
        )}
      </div>

      {/* 右侧：卡片内容 */}
      <div style={{
        flex: 1,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.2s',
        minWidth: 0
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
        <EntryTags entry={entry} showProject />

        {/* 标题 */}
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>
          {entry.topic}
        </h3>

        {/* 洞察摘要 */}
        <InsightPreview insight={entry.insight} />
      </div>
    </div>
  );
}
