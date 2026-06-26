'use client';

import { useState } from 'react';

interface FeedCardProps {
  entry: {
    id: number;
    topic: string;
    insight: string;
    diagram?: string;
    topic_tag_id: string;
    project_tag_id?: string;
    research_type: string;
    energy_level: number;
    aha_moment: number;
    timestamp: string;
    code_example?: string;
    related_tag_ids: string[];
    custom_tags: string[];
    source: string;
  };
  onClick: (entry: FeedCardProps['entry']) => void;
}

// 学科代码转中文
const DISCIPLINE_NAMES: Record<string, string> = {
  'cs': '计科', 'math': '数学', 'physics': '物理',
  'finance': '金融', 'law': '法学', 'chemistry': '化学',
  'biology': '生物', 'psychology': '心理'
};

// 研究类型转中文
const RESEARCH_TYPE_NAMES: Record<string, string> = {
  'deep-research': '小题深研',
  'topic-exploration': '专题探索',
  'domain-mapping': '领域映射'
};

// 从标签 ID 提取学科名称
function extractDisciplineName(tagId: string): string {
  const match = tagId.match(/\.discipline\.([a-z]+)/);
  if (match) {
    return DISCIPLINE_NAMES[match[1]] || match[1];
  }
  return '未分类';
}

// 从项目标签 ID 提取项目名称
function extractProjectName(tagId?: string): string | null {
  if (!tagId) return null;
  const parts = tagId.split('.');
  return parts[parts.length - 1]?.replace(/-/g, ' ');
}

export default function FeedCard({ entry, onClick }: FeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const discipline = extractDisciplineName(entry.topic_tag_id);
  const project = extractProjectName(entry.project_tag_id);
  const researchType = RESEARCH_TYPE_NAMES[entry.research_type] || entry.research_type;
  
  // 格式化时间
  const formatDate = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div 
      className="feed-card"
      onClick={() => onClick(entry)}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* 顶部元信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontSize: '13px' }}>
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          background: 'rgba(52,211,153,0.15)', 
          color: '#34d399',
          fontWeight: 500 
        }}>
          {discipline}
        </span>
        {project && (
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '20px', 
            background: 'rgba(129,140,248,0.15)', 
            color: '#818cf8',
            fontWeight: 500 
          }}>
            {project}
          </span>
        )}
        <span style={{ color: 'var(--text-muted)' }}>{researchType}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatDate(entry.timestamp)}</span>
      </div>

      {/* 标题 */}
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        color: 'var(--text-primary)', 
        marginBottom: '8px',
        margin: '0 0 8px 0'
      }}>
        {entry.topic}
      </h3>

      {/* 洞察摘要 */}
      <p style={{ 
        fontSize: '14px', 
        lineHeight: '1.6', 
        color: 'var(--text-secondary)',
        margin: '0 0 12px 0',
        display: expanded ? 'block' : '-webkit-box',
        WebkitLineClamp: expanded ? 'unset' : 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {entry.insight}
      </p>

      {entry.insight.length > 150 && (
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--accent-sky)', 
            fontSize: '13px', 
            cursor: 'pointer',
            padding: 0,
            marginBottom: '12px'
          }}
        >
          {expanded ? '收起' : '展开更多'}
        </button>
      )}

      {/* Mermaid 图表预览 */}
      {entry.diagram && (
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '8px', 
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          maxHeight: expanded ? '300px' : '100px',
          transition: 'max-height 0.3s'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>
            📊 Mermaid 图表
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {entry.diagram}
          </pre>
        </div>
      )}

      {/* 底部指标 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginTop: '12px', 
        paddingTop: '12px', 
        borderTop: '1px solid rgba(255,255,255,0.06)' 
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          精力值：<span style={{ 
            color: entry.energy_level >= 4 ? '#34d399' : '#fbbf24',
            fontWeight: 600
          }}>{entry.energy_level}</span>
        </span>
        {entry.aha_moment && (
          <span style={{ fontSize: '13px', color: '#34d399' }}>💡 顿悟时刻</span>
        )}
      </div>
    </div>
  );
}
