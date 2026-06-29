import type { EChartsOption } from 'echarts';
import type {
  EnhancedGraphData,
  EnhancedGraphNode,
  EnhancedGraphEdge,
  EnhancedTriggerEdge,
  EnhancedConceptJump,
  GraphEdgeType,
} from '@/types/graph';
import {
  calculateNodeSize,
  calculateEdgeWidth,
  getClusterColor,
  EDGE_TYPE_COLORS,
  DEFAULT_FORCE_LAYOUT,
  calculateTimelineLayout,
  calculateGalaxyLayout,
} from '@/lib/graph-utils';

export const TRIGGER_COLOR = '#5eead4';
const JUMP_COLOR = '#c084fc';

export interface ForceGraphOptionParams {
  data: EnhancedGraphData;
  nodeMap: Map<number, EnhancedGraphNode>;
  maxDeg: number;
  showLabels: boolean;
  showEdges: boolean;
  matchedNodeIds: Set<number>;
  selectedNode: EnhancedGraphNode | null;
  hoveredNode: EnhancedGraphNode | null;
  neighborNodes: { nodes: EnhancedGraphNode[]; edges: EnhancedGraphEdge[] } | null;
  edgeTypeFilter: GraphEdgeType;
}

export interface TimelineOptionParams {
  data: EnhancedGraphData;
  nodeMap: Map<number, EnhancedGraphNode>;
  maxDeg: number;
  width: number;
  height: number;
}

export interface GalaxyOptionParams {
  data: EnhancedGraphData;
  nodeMap: Map<number, EnhancedGraphNode>;
  maxDeg: number;
  width: number;
  height: number;
  galaxyCenterId: number | null;
  showLabels: boolean;
  showEdges: boolean;
}

export function createForceGraphOption(params: ForceGraphOptionParams): EChartsOption {
  const { data, nodeMap, maxDeg, showLabels, showEdges, matchedNodeIds, selectedNode, hoveredNode, neighborNodes, edgeTypeFilter } = params;
  const targetNode = selectedNode || hoveredNode;

  const isHighlighted = (nodeId: number) => {
    if (!targetNode) return true;
    if (nodeId === targetNode.id) return true;
    return neighborNodes?.nodes.some(n => n.id === nodeId) || false;
  };

  const isDimmed = (nodeId: number) => {
    if (!targetNode) return false;
    return !isHighlighted(nodeId);
  };

  const isEdgeDimmed = (source: number, target: number) => {
    return isDimmed(source) || isDimmed(target);
  };

  const buildEdges = () => {
    const result: any[] = [];
    const isFiltered = edgeTypeFilter !== 'all';

    if (showEdges) {
      for (const e of data.edges) {
        if (isFiltered && e.type !== edgeTypeFilter) continue;
        const dimmed = isEdgeDimmed(e.source, e.target);
        result.push({
          source: e.source,
          target: e.target,
          weight: e.weight,
          edgeType: e.type,
          lineStyle: {
            color: isFiltered ? EDGE_FILTER_COLORS[e.type] : EDGE_NEUTRAL,
            width: calculateEdgeWidth(e.weight),
            opacity: dimmed ? 0.06 : isFiltered ? 0.55 : Math.min(e.weight * 1.2, 0.5),
            curveness: 0.15,
            type: 'solid',
          },
        });
      }

      for (const t of data.triggers) {
        const dimmed = isEdgeDimmed(t.source, t.target);
        result.push({
          source: t.source,
          target: t.target,
          weight: t.weight,
          edgeType: 'trigger',
          day_diff: t.day_diff,
          lineStyle: {
            color: TRIGGER_COLOR,
            width: 1.5,
            opacity: dimmed ? 0.05 : 0.45,
            curveness: 0.25,
            type: 'dashed',
          },
        });
      }

      for (const j of data.jumps) {
        const dimmed = isEdgeDimmed(j.source, j.target);
        result.push({
          source: j.source,
          target: j.target,
          weight: 0,
          edgeType: 'jump',
          from_type: j.from_type,
          to_type: j.to_type,
          lineStyle: {
            color: JUMP_COLOR,
            width: 1.5,
            opacity: dimmed ? 0.05 : 0.45,
            curveness: 0.3,
            type: 'dotted',
          },
        });
      }
    }

    return result;
  };

  return {
    backgroundColor: 'transparent',
    animationDuration: 500,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: (raw) => {
        const params = raw as unknown as { dataType: string; data: { name?: string; cluster_name?: string; energy?: number; degree?: number; edgeType?: string; weight?: number; day_diff?: number; from_type?: string; to_type?: string } };
        const d = params.data;
        if (params.dataType === 'node') {
          const node = nodeMap.get(Number(d.name));
          return `<strong>${d.name}</strong><br/>${d.cluster_name}<br/>能量 ${d.energy} · ${d.degree} 条关联`;
        }
        if (params.dataType === 'edge') {
          if (d.edgeType === 'trigger') {
            return `触发链: 内容相似 ${((d.weight || 0) * 100).toFixed(0)}% · ${d.day_diff} 天内`;
          }
          if (d.edgeType === 'jump') {
            return `概念跳跃: ${d.from_type} → ${d.to_type}`;
          }
          const typeLabel = d.edgeType === 'content' ? '内容相似'
            : d.edgeType === 'tags' ? '标签重叠' : '时间相邻';
          return `关联强度: ${(Number(d.weight) * 100).toFixed(0)}%<br/>类型: ${typeLabel}`;
        }
        return '';
      },
    },
    series: [{
      type: 'graph',
      layout: 'force',
      force: {
        repulsion: DEFAULT_FORCE_LAYOUT.repulsion,
        edgeLength: DEFAULT_FORCE_LAYOUT.edgeLength,
        layoutAnimation: true,
        friction: DEFAULT_FORCE_LAYOUT.friction,
      },
      roam: true,
      draggable: true,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 4],
      label: {
        show: showLabels,
        position: 'right',
        formatter: '{b}',
        fontSize: 11,
        color: '#F1F5F9',
      },
      data: data.nodes.map(n => {
        const dimmed = isDimmed(n.id);
        const isMatch = matchedNodeIds.has(n.id);
        const isTarget = targetNode?.id === n.id;
        return {
          id: String(n.id),
          name: n.topic.length > 15 ? n.topic.slice(0, 13) + '…' : n.topic,
          value: n.degree,
          energy: n.energy,
          cluster_name: n.cluster_name,
          degree: n.degree,
          symbolSize: isTarget ? calculateNodeSize(n.energy, n.degree, maxDeg) * 1.3 : calculateNodeSize(n.energy, n.degree, maxDeg),
          itemStyle: {
            color: getClusterColor(n.cluster_id),
            shadowBlur: isMatch ? 15 : isTarget ? 20 : n.is_surge ? 18 : 6,
            shadowColor: isMatch ? '#fbbf24' : isTarget ? '#fbbf24' : n.is_surge ? '#fbbf2480' : getClusterColor(n.cluster_id) + '60',
            opacity: dimmed ? 0.3 : 0.9,
            borderColor: isTarget ? '#fbbf24' : n.is_surge ? '#fbbf24' : 'transparent',
            borderWidth: isTarget ? 3 : n.is_surge ? 2 : 0,
          },
          emphasis: {
            focus: 'adjacency',
            itemStyle: {
              shadowBlur: 20,
              shadowColor: getClusterColor(n.cluster_id),
            },
          },
        };
      }),
      edges: buildEdges(),
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          opacity: 0.8,
        },
      },
    }],
  };
}

export function createTimelineOption(params: TimelineOptionParams): EChartsOption {
  const { data, nodeMap, maxDeg, width, height } = params;

  const sortedNodes = [...data.nodes].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const padding = 80;
  const positions = calculateTimelineLayout(sortedNodes, width, height, padding);

  const posMap = new Map<number, { x: number; y: number }>(
    Array.from(positions.entries()).map(([id, pos]) => [id, pos])
  );

  return {
    backgroundColor: 'transparent',
    animationDuration: 800,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: (raw) => {
        const params = raw as unknown as { dataType: string; data: { name?: string; timestamp?: string; cluster_name?: string; energy?: number } };
        if (params.dataType === 'node') {
          const d = params.data;
          return `<strong>${d.name}</strong><br/>${new Date(d.timestamp as string).toLocaleDateString('zh-CN')}<br/>聚类: ${d.cluster_name}<br/>能量 ${d.energy}`;
        }
        return '';
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
        rotate: 30,
      },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      show: false,
      min: 0,
      max: height,
    },
    grid: {
      left: padding,
      right: padding,
      top: 40,
      bottom: 80,
    },
    series: [
      {
        type: 'line',
        symbol: 'none',
        lineStyle: { color: '#334155', width: 2 },
        data: sortedNodes.map((n, i) => ({
          name: n.timestamp,
          value: [i, height / 2],
        })),
        animation: false,
      },
      {
        type: 'scatter',
        coordinateSystem: 'cartesian2d',
        symbolSize: (_value: number, params: { data: { energy?: number; degree?: number } }) => {
          return calculateNodeSize(params.data.energy as number, params.data.degree as number, maxDeg);
        },
        itemStyle: {
        },
        emphasis: {
          scale: 1.5,
        },
        data: sortedNodes.map((node, index) => {
          const pos = posMap.get(node.id);
          if (!pos) return null;
          return {
            id: node.id,
            name: node.topic,
            value: [index, pos.y],
            energy: node.energy,
            degree: node.degree,
            cluster_id: node.cluster_id,
            cluster_name: node.cluster_name,
            timestamp: node.timestamp,
            itemStyle: {
              color: getClusterColor(node.cluster_id),
              shadowBlur: 10,
              shadowColor: getClusterColor(node.cluster_id) + '60',
            },
          };
        }).filter(Boolean),
      },
    ],
  } as EChartsOption;
}

export function createGalaxyOption(params: GalaxyOptionParams): EChartsOption {
  const { data, nodeMap, maxDeg, width, height, galaxyCenterId, showLabels, showEdges } = params;

  const centerNodeId = galaxyCenterId || (data.nodes.reduce((max, n) => n.energy > max.energy ? n : max, data.nodes[0]).id);
  const centerNode = nodeMap.get(centerNodeId) || data.nodes[0];

  const positions = calculateGalaxyLayout(data.nodes, data.edges, centerNodeId, width, height, 4);

  return {
    backgroundColor: 'transparent',
    animationDuration: 600,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: (raw) => {
        const params = raw as unknown as { dataType: string; data: { name?: string; cluster_name?: string; energy?: number } };
        if (params.dataType === 'node') {
          const d = params.data;
          return `<strong>${d.name}</strong><br/>${d.cluster_name}<br/>能量 ${d.energy}<br/><small>右键设为焦点</small>`;
        }
        return '';
      },
    },
    series: [{
      type: 'graph',
      layout: 'none',
      roam: true,
      draggable: true,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 4],
      data: data.nodes.map(n => {
        const pos = positions.get(n.id);
        if (!pos) return null;
        const isCenter = n.id === centerNodeId;
        return {
          id: String(n.id),
          name: n.topic.length > 12 ? n.topic.slice(0, 10) + '…' : n.topic,
          x: pos.x,
          y: pos.y,
          value: n.degree,
          energy: n.energy,
          cluster_name: n.cluster_name,
          symbolSize: isCenter ? calculateNodeSize(n.energy, n.degree, maxDeg) * 1.5 : calculateNodeSize(n.energy, n.degree, maxDeg),
          itemStyle: {
            color: isCenter ? '#fbbf24' : getClusterColor(n.cluster_id),
            shadowBlur: isCenter ? 25 : 6,
            shadowColor: isCenter ? '#fbbf2480' : getClusterColor(n.cluster_id) + '60',
            borderColor: isCenter ? '#fbbf24' : 'transparent',
            borderWidth: isCenter ? 3 : 0,
          },
          label: {
            show: isCenter || showLabels,
            position: 'right' as const,
            formatter: '{b}',
            fontSize: isCenter ? 14 : 10,
            fontWeight: isCenter ? 'bold' : 'normal',
            color: '#F1F5F9',
          },
        };
      }).filter((x): x is NonNullable<typeof x> => x != null),
      edges: showEdges ? data.edges.map(e => ({
        source: e.source,
        target: e.target,
        lineStyle: {
          color: e.color || EDGE_TYPE_COLORS[e.type],
          width: calculateEdgeWidth(e.weight) * 0.5,
          opacity: Math.min(e.weight, 0.4),
          curveness: 0,
        },
      })) : [],
    }],
  } as EChartsOption;
}
