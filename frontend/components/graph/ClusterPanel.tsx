'use client';

interface ClusterItem {
  id: number;
  label: string;
  count: number;
  color: string;
}

interface ClusterPanelProps {
  clusters: ClusterItem[];
  selectedIds: number[] | undefined;
  onToggle: (id: number) => void;
}

export default function ClusterPanel({ clusters, selectedIds, onToggle }: ClusterPanelProps) {
  return (
    <div style={{
      width: '220px',
      borderRight: '1px solid var(--border-color)',
      background: 'var(--bg-primary)',
      overflow: 'auto',
      flexShrink: 0,
      animation: 'slideInLeft 0.2s ease',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}>
        聚类 ({clusters.length})
      </div>
      {clusters.map(cluster => (
        <div
          key={cluster.id}
          onClick={() => onToggle(cluster.id)}
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color)',
            cursor: 'pointer',
            background: selectedIds?.includes(cluster.id) ? `${cluster.color}15` : 'transparent',
            borderLeft: selectedIds?.includes(cluster.id) ? `3px solid ${cluster.color}` : '3px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: cluster.color,
              flexShrink: 0,
            }} />
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {cluster.label}
            </div>
          </div>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            marginLeft: '16px',
          }}>
            {cluster.count} 个节点
          </div>
        </div>
      ))}
    </div>
  );
}
