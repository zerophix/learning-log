'use client';

import { getClusterColor } from '@/lib/graph-utils';

interface GraphLegendProps {
  clusterCounts: [number, number][];
  nodeCount: number;
  edgeCount: number;
  clusterCount: number;
  matchedCount: number;
}

export default function GraphLegend({
  clusterCounts, nodeCount, edgeCount, clusterCount, matchedCount,
}: GraphLegendProps) {
  return (
    <>
      {/* 聚类图例 */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '10px',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        maxWidth: 'calc(100% - 24px)',
      }}>
        {clusterCounts.map(([cluster, count]) => {
          const color = getClusterColor(cluster);
          return (
            <span key={cluster} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>{count}</span>
            </span>
          );
        })}
        <span style={{ width: '1px', height: '10px', background: 'var(--border-color)' }} />
        <span>{nodeCount} 节点 · {edgeCount} 关联 · {clusterCount} 聚类</span>
        {matchedCount > 0 && (
          <>
            <span style={{ width: '1px', height: '10px', background: 'var(--border-color)' }} />
            <span style={{ color: '#fbbf24' }}>✓ {matchedCount} 匹配</span>
          </>
        )}
      </div>


    </>
  );
}
