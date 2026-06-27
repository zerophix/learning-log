import { RESEARCH_TYPES } from '@/lib/constants';

export default function FilterBar({ 
  activeFilter, 
  onFilterChange 
}: { 
  activeFilter: { type: string; id: string } | null;
  onFilterChange: (filter: { type: string; id: string } | null) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {Object.entries(RESEARCH_TYPES).map(([id, type]) => (
        <button
          key={id}
          onClick={() => onFilterChange(activeFilter?.id === id ? null : { type: 'research', id })}
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            border: activeFilter?.id === id ? 'none' : '1px solid #334155',
            background: activeFilter?.id === id ? type.color : 'transparent',
            color: activeFilter?.id === id ? 'var(--bg-primary)' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: activeFilter?.id === id ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: activeFilter?.id === id ? 'var(--bg-primary)' : type.color }}></span>
          {type.label}
        </button>
      ))}
      {activeFilter && (
        <button onClick={() => onFilterChange(null)} style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px 8px' }}>
          清除
        </button>
      )}
    </div>
  );
}
