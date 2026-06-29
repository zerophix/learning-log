'use client';

import { getClusterColor } from '@/lib/graph-utils';
import type { EnhancedGraphNode, EnhancedGraphEdge } from '@/types/graph';

interface NodeDetailPanelProps {
  node: EnhancedGraphNode;
  neighbors: EnhancedGraphNode[];
  neighborEdges: EnhancedGraphEdge[];
  onClose: () => void;
  onViewDetail: (id: number) => void;
  onGalaxyFocus: (id: number) => void;
}

export default function NodeDetailPanel({
  node, neighbors, neighborEdges,
  onClose, onViewDetail, onGalaxyFocus,
}: NodeDetailPanelProps) {
  return (
    <div style={{
      width: '280px',
      borderLeft: '1px solid var(--border-color)',
      overflow: 'auto',
      background: 'var(--bg-secondary)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.2s ease',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--text-primary)',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.topic}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '1px 5px',
              borderRadius: '4px',
              background: getClusterColor(node.cluster_id) + '20',
              color: getClusterColor(node.cluster_id),
              fontSize: '10px',
            }}>
              {node.cluster_name}
            </span>
            <span>⚡{node.energy}</span>
            <span>↔{node.degree}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '2px 4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <button
          onClick={() => onViewDetail(node.id)}
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          查看详情
        </button>
        <button
          onClick={() => onGalaxyFocus(node.id)}
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          星系聚焦
        </button>
      </div>

      {node.summary && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>摘要</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {node.summary}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        <div style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          marginBottom: '8px',
          letterSpacing: '0.5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>关联 ({neighbors.length})</span>
        </div>
        {neighbors.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>
            无关联节点
          </div>
        ) : (
          neighbors
            .sort((a, b) => {
              const edgeA = neighborEdges.find(e =>
                (e.source === node.id && e.target === a.id) ||
                (e.target === node.id && e.source === a.id)
              );
              const edgeB = neighborEdges.find(e =>
                (e.source === node.id && e.target === b.id) ||
                (e.target === node.id && e.source === b.id)
              );
              return (edgeB?.weight || 0) - (edgeA?.weight || 0);
            })
            .map(neighbor => {
              const edge = neighborEdges.find(e =>
                (e.source === node.id && e.target === neighbor.id) ||
                (e.target === node.id && e.source === neighbor.id)
              );
              return (
                <div
                  key={neighbor.id}
                  onClick={() => onViewDetail(neighbor.id)}
                  style={{
                    padding: '8px 10px',
                    marginBottom: '6px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '3px',
                  }}>
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: getClusterColor(neighbor.cluster_id),
                      flexShrink: 0,
                    }} />
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {neighbor.topic}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                  }}>
                    <span>{new Date(neighbor.timestamp).toLocaleDateString('zh-CN')}</span>
                    {edge && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: (edge.color || '#334155') + '20',
                        color: edge.color || '#334155',
                        fontSize: '9px',
                      }}>
                        ↕ {(edge.weight * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
