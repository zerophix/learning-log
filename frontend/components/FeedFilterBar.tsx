'use client';

interface FeedFilterBarProps {
  activeProjectType: string | null;
  activeDiscipline: string | null;
  activeResearchType: string | null;
  viewMode: 'feed' | 'graph';
  onProjectTypeChange: (type: string | null) => void;
  onDisciplineChange: (discipline: string | null) => void;
  onResearchTypeChange: (type: string | null) => void;
  onViewModeChange: (mode: 'feed' | 'graph') => void;
}

const PROJECT_TYPES = [
  { key: 'business', label: '业务项目', color: '#34d399' },
  { key: 'source-code', label: '源码项目', color: '#818cf8' },
  { key: 'component', label: '组件项目', color: '#fbbf24' },
];

const DISCIPLINES = [
  { key: 'cs', label: '计科' },
  { key: 'math', label: '数学' },
  { key: 'physics', label: '物理' },
  { key: 'finance', label: '金融' },
  { key: 'law', label: '法学' },
];

const RESEARCH_TYPES = [
  { key: 'deep-research', label: '小题深研' },
  { key: 'topic-exploration', label: '专题探索' },
  { key: 'domain-mapping', label: '领域映射' },
];

export default function FeedFilterBar({
  activeProjectType,
  activeDiscipline,
  activeResearchType,
  viewMode,
  onProjectTypeChange,
  onDisciplineChange,
  onResearchTypeChange,
  onViewModeChange,
}: FeedFilterBarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 20px',
      background: 'rgba(255,255,255,0.03)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexWrap: 'wrap',
    }}>
      {/* 视图切换 */}
      <div style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
        <button
          onClick={() => onViewModeChange('feed')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: viewMode === 'feed' ? 600 : 400,
            background: viewMode === 'feed' ? 'rgba(56,189,248,0.2)' : 'transparent',
            color: viewMode === 'feed' ? '#38bdf8' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📋 Feed
        </button>
        <button
          onClick={() => onViewModeChange('graph')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: viewMode === 'graph' ? 600 : 400,
            background: viewMode === 'graph' ? 'rgba(56,189,248,0.2)' : 'transparent',
            color: viewMode === 'graph' ? '#38bdf8' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🕸️ 图谱
        </button>
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

      {/* 项目类型筛选 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>项目</span>
        {PROJECT_TYPES.map(pt => (
          <button
            key={pt.key}
            onClick={() => onProjectTypeChange(activeProjectType === pt.key ? null : pt.key)}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeProjectType === pt.key ? pt.color : 'rgba(255,255,255,0.15)',
              background: activeProjectType === pt.key ? `${pt.color}20` : 'transparent',
              color: activeProjectType === pt.key ? pt.color : 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

      {/* 学科筛选 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>学科</span>
        {DISCIPLINES.map(d => (
          <button
            key={d.key}
            onClick={() => onDisciplineChange(activeDiscipline === d.key ? null : d.key)}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeDiscipline === d.key ? '#34d399' : 'rgba(255,255,255,0.15)',
              background: activeDiscipline === d.key ? 'rgba(52,211,153,0.2)' : 'transparent',
              color: activeDiscipline === d.key ? '#34d399' : 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

      {/* 研究类型筛选 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>视角</span>
        {RESEARCH_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => onResearchTypeChange(activeResearchType === rt.key ? null : rt.key)}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeResearchType === rt.key ? '#a78bfa' : 'rgba(255,255,255,0.15)',
              background: activeResearchType === rt.key ? 'rgba(167,139,250,0.2)' : 'transparent',
              color: activeResearchType === rt.key ? '#a78bfa' : 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* 清空筛选 */}
      {(activeProjectType || activeDiscipline || activeResearchType) && (
        <>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <button
            onClick={() => {
              onProjectTypeChange(null);
              onDisciplineChange(null);
              onResearchTypeChange(null);
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            清空
          </button>
        </>
      )}
    </div>
  );
}
