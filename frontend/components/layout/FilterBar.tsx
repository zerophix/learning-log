const RESEARCH_TYPES = [
  { id: 'deep-research', label: '深度研究', color: '#fbbf24' },
  { id: 'topic-exploration', label: '主题探索', color: '#34d399' },
  { id: 'domain-mapping', label: '领域映射', color: '#a78bfa' }
];

export default function FilterBar({ 
  activeFilter, 
  onFilterChange 
}: { 
  activeFilter: { type: string; id: string } | null;
  onFilterChange: (filter: { type: string; id: string } | null) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {RESEARCH_TYPES.map(type => (
        <button
          key={type.id}
          onClick={() => onFilterChange(activeFilter?.id === type.id ? null : { type: 'research', id: type.id })}
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            border: activeFilter?.id === type.id ? 'none' : '1px solid #334155',
            background: activeFilter?.id === type.id ? type.color : 'transparent',
            color: activeFilter?.id === type.id ? '#0F172A' : '#64748b',
            fontSize: '12px',
            fontWeight: activeFilter?.id === type.id ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: activeFilter?.id === type.id ? '#0F172A' : type.color }}></span>
          {type.label}
        </button>
      ))}
      {activeFilter && (
        <button onClick={() => onFilterChange(null)} style={{ fontSize: '11px', color: '#475569', cursor: 'pointer', background: 'none', border: 'none', padding: '4px 8px' }}>
          清除
        </button>
      )}
    </div>
  );
}
