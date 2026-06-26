'use client';

import { LearningEntry, Tag } from '@/types';

interface DataTableProps {
  entries: LearningEntry[];
  onRowClick?: (entry: LearningEntry) => void;
}

const tagClassMap: Record<Tag['type'], string> = {
  design: 'tag-design',
  visual: 'tag-visual',
  arch: 'tag-arch',
  tech: 'tag-tech',
};

const energyBadgeClass = (energy: number): string => {
  if (energy >= 4) return 'energy-badge energy-high';
  return 'energy-badge energy-mid';
};

export default function DataTable({ entries, onRowClick }: DataTableProps) {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>主题 (TOPIC)</th>
            <th>标签 (TAGS)</th>
            <th className="center">精力 (ENERGY)</th>
            <th className="center">顿悟 (AHA)</th>
            <th className="right">操作 (ACTION)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr 
              key={entry.id} 
              className="table-row"
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onClick={() => onRowClick?.(entry)}
            >
              <td>
                <div className="component-name">{entry.topic}</div>
                <div className="component-path">{entry.path}</div>
              </td>
              <td>
                <div className="tag-group">
                  {entry.tags.map((tag, idx) => (
                    <span key={idx} className={`tag ${tagClassMap[tag.type]}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="center">
                <span className={energyBadgeClass(entry.energy)}>{entry.energy}</span>
              </td>
              <td className="center">
                {entry.ahaMoment ? (
                  <span className="aha-check">✓</span>
                ) : (
                  <span className="aha-empty">—</span>
                )}
              </td>
              <td className="right">
                <button className="action-btn">查看详情</button>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                📭 暂无学习记录，双击图谱节点下钻查看
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
