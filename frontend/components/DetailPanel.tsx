'use client';

import { LearningEntry } from '@/types';

interface DetailPanelProps {
  entry: LearningEntry;
  onBack: () => void;
  relatedEntries: LearningEntry[];
}

export default function DetailPanel({ entry, onBack, relatedEntries }: DetailPanelProps) {
  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div className="detail-title-group">
          <span className={`detail-type-badge type-${entry.tags[0]?.type || 'tech'}`}>
            {entry.tags[0]?.label || '标签'}
          </span>
          <h2 className="detail-title">{entry.topic}</h2>
        </div>
        <button className="detail-close" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="detail-path">{entry.path}</div>

      <div className="detail-metrics">
        <div className="metric-item">
          <span className="metric-label">精力</span>
          <span className={`energy-badge energy-${entry.energy >= 4 ? 'high' : 'mid'}`}>{entry.energy}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">顿悟</span>
          <span className={entry.ahaMoment ? 'aha-check' : 'aha-empty'}>{entry.ahaMoment ? '✓' : '—'}</span>
        </div>
      </div>

      {relatedEntries.length > 0 && (
        <div className="detail-section">
          <h3 className="detail-section-title">关联知识点</h3>
          <div className="related-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {relatedEntries.map((rel, idx) => (
              <span 
                key={idx} 
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                {rel.topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
