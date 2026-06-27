'use client';
import EntryCard from '@/components/entry/EntryCard';
import type { Entry, WeekInfo } from '@/types';

export default function TimelineView({
  entries,
  weekInfo,
  weekIndex,
  currentWeek,
  onPrevWeek,
  onNextWeek,
  onSelectWeek,
  onSelect
}: {
  entries: Entry[];
  weekInfo: WeekInfo | null;
  weekIndex: WeekInfo[];
  currentWeek: { year: number; week: number };
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectWeek: (year: number, week: number) => void;
  onSelect: (e: Entry) => void;
}) {
  const currentIdx = weekIndex.findIndex(w => w.year === currentWeek.year && w.week === currentWeek.week);
  const hasPrev = currentIdx < weekIndex.length - 1;
  const hasNext = currentIdx > 0;

  const grouped: Record<string, Entry[]> = {};
  entries.forEach(e => {
    const d = new Date(e.timestamp);
    const key = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const weekLabel = currentWeek.week === 0 ? '年初' : `第 ${currentWeek.week} 周`;

  return (
    <div>
      {/* Week Navigation */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <button onClick={onPrevWeek} disabled={!hasPrev} aria-label="上一周"
            style={{
              background: 'var(--border-color)', border: 'none', borderRadius: '6px',
              color: hasPrev ? 'var(--text-secondary)' : 'var(--text-muted)',
              cursor: hasPrev ? 'pointer' : 'not-allowed', padding: '6px 14px', fontSize: '13px'
            }}>
            ← {weekIndex[currentIdx + 1] ? `W${weekIndex[currentIdx + 1].week}` : ''}
          </button>

          <div>
            <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {weekLabel} · {currentWeek.year}
            </span>
            {weekInfo && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {weekInfo.start} ~ {weekInfo.end} · {weekInfo.count} 条
              </div>
            )}
          </div>

          <button onClick={onNextWeek} disabled={!hasNext} aria-label="下一周"
            style={{
              background: 'var(--border-color)', border: 'none', borderRadius: '6px',
              color: hasNext ? 'var(--text-secondary)' : 'var(--text-muted)',
              cursor: hasNext ? 'pointer' : 'not-allowed', padding: '6px 14px', fontSize: '13px'
            }}>
            {weekIndex[currentIdx - 1] ? `W${weekIndex[currentIdx - 1].week}` : ''} →
          </button>
        </div>

        {/* Week dropdown selector */}
        <select
          value={`${currentWeek.year}-W${String(currentWeek.week).padStart(2, '0')}`}
          onChange={e => { const [y, w] = e.target.value.split('-W'); onSelectWeek(parseInt(y), parseInt(w)); }}
          style={{
            marginTop: '10px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)', borderRadius: '6px',
            padding: '4px 10px', fontSize: '12px'
          }}
        >
          {weekIndex.map(w => (
            <option key={`${w.year}-W${String(w.week).padStart(2,'0')}`} value={`${w.year}-W${String(w.week).padStart(2,'0')}`}>
              {w.year} 年第 {w.week} 周 ({w.count} 条)
            </option>
          ))}
        </select>
      </div>

      {/* Daily Groups */}
      {Object.entries(grouped).map(([date, dayEntries]) => (
        <div key={date} style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '8px', paddingLeft: '84px'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              {date}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dayEntries.length} 条记录</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--border-color), transparent)' }} />
          </div>

          <div style={{ position: 'relative', marginLeft: '60px', borderLeft: '2px solid var(--bg-secondary)', paddingLeft: '24px' }}>
            {dayEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onClick={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
