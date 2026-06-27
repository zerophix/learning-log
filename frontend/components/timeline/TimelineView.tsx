import EntryCard from '@/components/entry/EntryCard';
import type { Entry } from '@/types';

export default function TimelineView({ 
  entries, 
  onSelect 
}: { 
  entries: Entry[];
  onSelect: (e: Entry) => void;
}) {
  // 按日期分组
  const groupedEntries: Record<string, Entry[]> = {};
  entries.forEach(e => {
    const d = new Date(e.timestamp);
    const key = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
    if (!groupedEntries[key]) groupedEntries[key] = [];
    groupedEntries[key].push(e);
  });

  return (
    <>
      {Object.entries(groupedEntries).map(([date, dayEntries]) => (
        <div key={date} style={{ marginBottom: '32px' }}>
          {/* 日期头 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '8px',
            paddingLeft: '84px'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.5px'
            }}>
              {date}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dayEntries.length} 条记录</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--border-color), transparent)' }} />
          </div>

          {/* 该日记录 */}
          <div style={{ position: 'relative', marginLeft: '60px', borderLeft: '2px solid var(--bg-secondary)', paddingLeft: '24px' }}>
            {dayEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onClick={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
