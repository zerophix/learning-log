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
  calculateTimeSeparators,
  calculateTimeRings,
  getTimeRingLabel,
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
  edgeTypeFilter: GraphEdgeType | 'all';
}

export interface TimelineOptionParams {
  data: EnhancedGraphData;
  nodeMap: Map<number, EnhancedGraphNode>;
  maxDeg: number;
  width: number;
  height: number;
  showEdges: boolean;
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

  // v2 视觉权重配置
  const VISUAL_WEIGHTS: Record<GraphEdgeType, number> = {
    trigger: 1.0,       // 主线 - 最高权重
    concept_jump: 0.7,  // 次要线
    content: 0.3,       // 背景
    tags: 0.2,          // 背景
    temporal: 0.1,      // 背景 - 可废弃
  };

  const EDGE_FILTER_COLORS: Record<GraphEdgeType, string> = {
    trigger: '#5eead4',    // 青色 - 触发链
    concept_jump: '#c084fc', // 紫色 - 概念跃迁
    content: '#38bdf8',     // 蓝色 - 内容相似
    tags: '#34d399',        // 绿色 - 标签重叠
    temporal: '#fbbf24',    // 橙色 - 时间相邻
  };

  const buildEdges = () => {
    const result: any[] = [];
    const isFiltered = edgeTypeFilter !== 'all';

    if (!showEdges) return result;

    // 收集所有边，按视觉权重排序
    const allEdges: Array<{ edge: any; visualWeight: number; edgeType: GraphEdgeType }> = [];

    // 1. 内容/标签/时间相似边 (从 data.edges)
    for (const e of data.edges) {
      if (isFiltered && e.type !== edgeTypeFilter) continue;
      allEdges.push({
        edge: e,
        visualWeight: VISUAL_WEIGHTS[e.type as GraphEdgeType],
        edgeType: e.type as GraphEdgeType,
      });
    }

    // 2. 触发链边
    for (const t of data.triggers) {
      if (isFiltered && 'trigger' !== edgeTypeFilter) continue;
      allEdges.push({
        edge: t,
        visualWeight: VISUAL_WEIGHTS.trigger,
        edgeType: 'trigger',
      });
    }

    // 3. 概念跃迁边
    for (const j of data.jumps) {
      if (isFiltered && 'concept_jump' !== edgeTypeFilter) continue;
      allEdges.push({
        edge: j,
        visualWeight: VISUAL_WEIGHTS.concept_jump,
        edgeType: 'concept_jump',
      });
    }

    // 按视觉权重降序排序，高权重后渲染（在上层）
    allEdges.sort((a, b) => a.visualWeight - b.visualWeight);

    // 渲染所有边
    for (const { edge, edgeType, visualWeight } of allEdges) {
      const isTrigger = edgeType === 'trigger';
      const isJump = edgeType === 'concept_jump';
      const isTraditional = !isTrigger && !isJump;

      const dimmed = isEdgeDimmed(edge.source, edge.target);
      const isFilteredByType = isFiltered && edgeType !== edgeTypeFilter;

      if (isFilteredByType) continue;

      const baseOpacity = dimmed ? 0.05 : 0.5;
      const baseWidth = visualWeight * 2.5;
      const color = EDGE_FILTER_COLORS[edgeType];

      if (isTrigger) {
        // 触发链：实线箭头，渐变蓝，最粗
        result.push({
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
          edgeType: 'trigger',
          day_diff: edge.day_diff,
          lineStyle: {
            color,
            width: Math.max(baseWidth, 2.5),
            opacity: dimmed ? 0.1 : 0.7,
            curveness: 0.2,
            type: 'solid',
            shadowColor: color,
            shadowBlur: 4,
          },
          symbol: ['none', 'arrow'],
          symbolSize: [0, 8],
        });
      } else if (isJump) {
        // 概念跃迁：虚线箭头，紫色，中等
        result.push({
          source: edge.source,
          target: edge.target,
          weight: edge.weight || 0,
          edgeType: 'concept_jump',
          from_type: edge.from_type,
          to_type: edge.to_type,
          lineStyle: {
            color,
            width: Math.max(baseWidth, 1.5),
            opacity: dimmed ? 0.08 : 0.55,
            curveness: 0.25,
            type: 'dashed',
          },
          symbol: ['none', 'arrow'],
          symbolSize: [0, 6],
        });
      } else if (isTraditional) {
        // 传统相似边：细线，半透明，鼠标悬停才显示
        result.push({
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
          edgeType: edge.type,
          lineStyle: {
            color,
            width: Math.max(baseWidth * 0.5, 0.8),
            opacity: dimmed ? 0.03 : 0.18,
            curveness: 0.15,
            type: 'solid',
          },
        });
      }
    }

    return result;
  };

  return {
    backgroundColor: 'transparent',
    animationDuration: 500,
    animationDurationUpdate: 500,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: (raw) => {
        const params = raw as unknown as { dataType: string; data: { name?: string; cluster_name?: string; energy?: number; degree?: number; edgeType?: string; weight?: number; day_diff?: number; from_type?: string; to_type?: string } };
        const d = params.data;
        if (params.dataType === 'node') {
          const node = nodeMap.get(Number(d.name));
          return `<strong>${d.name}</strong><br/>${d.cluster_name}<br/>能量 ${d.energy} · ${d.degree} 条关联<br/><small style="color:#64748b">右键设为焦点</small>`;
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
  const { data, nodeMap, maxDeg, width, height, showEdges } = params;

  const sortedNodes = [...data.nodes].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const padding = 80;
  const positions = calculateTimelineLayout(sortedNodes, width, height, padding);

  const posMap = new Map<number, { x: number; y: number }>(
    Array.from(positions.entries()).map(([id, pos]) => [id, pos])
  );

  const timeData = sortedNodes.map((node, index) => {
    const pos = posMap.get(node.id);
    if (!pos) return null;
    return {
      id: node.id,
      name: node.topic.length > 15 ? node.topic.slice(0, 13) + '…' : node.topic,
      value: [pos.x, pos.y],
      energy: node.energy,
      degree: node.degree,
      cluster_id: node.cluster_id,
      cluster_name: node.cluster_name,
      timestamp: node.timestamp,
    };
  }).filter(Boolean);

  // 触发链边（贝塞尔曲线）
  const triggerEdges = data.triggers
    .map(t => {
      const sourcePos = posMap.get(t.source);
      const targetPos = posMap.get(t.target);
      if (!sourcePos || !targetPos) return null;
      const dx = targetPos.x - sourcePos.x;
      const cpY = (sourcePos.y + targetPos.y) / 2 + (dx > 0 ? -1 : 1) * 40;
      return {
        source: [sourcePos.x, sourcePos.y],
        target: [targetPos.x, targetPos.y],
        sourceId: t.source,
        targetId: t.target,
        day_diff: t.day_diff,
        cp: [(sourcePos.x + targetPos.x) / 2, cpY],
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  // 概念跃迁边（虚线桥）
  const jumpEdges = data.jumps
    .map(j => {
      const sourcePos = posMap.get(j.source);
      const targetPos = posMap.get(j.target);
      if (!sourcePos || !targetPos) return null;
      return {
        x1: sourcePos.x, y1: sourcePos.y,
        x2: targetPos.x, y2: targetPos.y,
        from_type: j.from_type,
        to_type: j.to_type,
        sourceId: j.source,
        targetId: j.target,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  // 时间段分隔线
  const separators = calculateTimeSeparators(sortedNodes, width, padding);

  return {
    backgroundColor: 'transparent',
    animationDuration: 800,
    animationDurationUpdate: 500,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
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
      type: 'value',
      show: true,
      min: padding,
      max: width - padding,
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: (_val: number, index: number) => {
          return index > 0 && index < sortedNodes.length
            ? `${new Date(sortedNodes[index].timestamp).getMonth() + 1}/${new Date(sortedNodes[index].timestamp).getDate()}`
            : '';
        },
        rotate: 30,
      },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      show: true,
      min: 0.5,
      max: 5.5,
      interval: 1,
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: (v: number) => ['', '⚡1', '⚡2', '⚡3', '⚡4', '⚡5'][v] || '',
      },
      axisLine: { show: false },
      splitLine: {
        lineStyle: { color: '#1e293b', type: 'dashed' },
      },
    },
    grid: {
      left: padding,
      right: padding,
      top: 40,
      bottom: 80,
    },
    series: [
      // 时间段分隔线（用 markLine）
      {
        type: 'scatter',
        data: [],
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { color: '#1e293b', type: 'dashed', width: 1 },
          label: {
            color: '#475569',
            fontSize: 9,
            position: 'insideStartTop',
            formatter: (p: { dataIndex?: number }) => {
              const idx = p.dataIndex ?? 0;
              return separators[idx]?.label || '';
            },
          },
          data: separators.map(s => ({
            xAxis: s.x,
            label: { formatter: s.label },
          })),
        },
      },
      // 概念跃迁边（虚线桥）
      ...(showEdges && jumpEdges.length > 0 ? [{
        type: 'lines',
        coordinateSystem: 'cartesian2d',
        data: jumpEdges.map(je => ({
          coords: [[je.x1, je.y1], [je.x2, je.y2]],
        })),
        lineStyle: {
          color: '#c084fc',
          width: 1.5,
          opacity: 0.5,
          curveness: 0.2,
          type: 'dashed',
        },
        effect: {
          show: true,
          period: 8,
          trailLength: 0.2,
          symbol: 'arrow',
          symbolSize: 4,
          color: '#c084fc',
        },
        z: 5,
      }] : []),
      // 触发链边（贝塞尔曲线）
      ...(showEdges && triggerEdges.length > 0 ? [{
        type: 'lines',
        coordinateSystem: 'cartesian2d',
        data: triggerEdges.map(te => ({
          coords: [[te.source[0], te.source[1]], te.cp, [te.target[0], te.target[1]]],
          lineStyle: {
            color: '#5eead4',
            opacity: 0.6,
          },
        })),
        polyline: true,
        lineStyle: {
          width: 2,
          curveness: 0.3,
          color: '#5eead4',
          opacity: 0.6,
        },
        effect: {
          show: true,
          period: 6,
          trailLength: 0.3,
          symbol: 'arrow',
          symbolSize: 5,
          color: '#5eead4',
        },
        z: 10,
      }] : []),
      // 主散点
      {
        type: 'scatter',
        coordinateSystem: 'cartesian2d',
        symbolSize: (val: number, params: { data: { energy?: number; degree?: number; is_surge?: boolean } }) => {
          const node = params.data;
          const size = calculateNodeSize(node.energy as number, node.degree as number, maxDeg);
          return node.is_surge ? size * 1.3 : size;
        },
        itemStyle: {},
        emphasis: {
          scale: 1.5,
        },
        data: timeData.map(d => {
          if (!d) return null;
          const node = nodeMap.get(d.id as number);
          const isSurge = node?.is_surge;
          return {
            id: d.id,
            name: d.name,
            value: d.value,
            energy: d.energy,
            degree: d.degree,
            cluster_id: d.cluster_id,
            cluster_name: d.cluster_name,
            timestamp: d.timestamp,
            is_surge: isSurge,
            itemStyle: {
              color: getClusterColor(d.cluster_id as number),
              shadowBlur: isSurge ? 25 : 10,
              shadowColor: isSurge ? '#fbbf2480' : getClusterColor(d.cluster_id as number) + '60',
              borderColor: isSurge ? '#fbbf24' : 'transparent',
              borderWidth: isSurge ? 2 : 0,
            },
          };
        }).filter(Boolean),
        z: 15,
      },
    ],
  } as EChartsOption;
}

export function createGalaxyOption(params: GalaxyOptionParams): EChartsOption {
  const { data, nodeMap, maxDeg, width, height, galaxyCenterId, showLabels, showEdges } = params;

  const centerNodeId = galaxyCenterId || (data.nodes.reduce((max, n) => n.energy > max.energy ? n : max, data.nodes[0]).id);
  const centerNode = nodeMap.get(centerNodeId) || data.nodes[0];

  // 使用时间环布局（取代 BFS 距离环）
  const timeRings = calculateTimeRings(data.nodes, centerNodeId, 7);
  const positions = calculateGalaxyLayout(data.nodes, data.edges, centerNodeId, width, height, 4);

  // 覆盖 layout 使用时间环
  const timeBasedPositions = new Map<number, { x: number; y: number }>();
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.4;

  // 获取最大 ring 层级
  const maxRing = Math.max(...Array.from(timeRings.values()), 1);

  data.nodes.forEach(node => {
    const ring = timeRings.get(node.id) ?? 1;
    if (node.id === centerNodeId) {
      timeBasedPositions.set(node.id, { x: centerX, y: centerY });
      return;
    }
    const radius = (ring / maxRing) * maxRadius;
    const angle = Math.sin(node.id * 9301 + 49297) * Math.PI * 2;
    timeBasedPositions.set(node.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });

  // 构建 trigger/jump 边
  const edges: any[] = [];

  if (showEdges) {
    // trigger 边
    for (const t of data.triggers) {
      const sourcePos = timeBasedPositions.get(t.source);
      const targetPos = timeBasedPositions.get(t.target);
      if (!sourcePos || !targetPos) continue;
      edges.push({
        source: t.source,
        target: t.target,
        lineStyle: {
          color: '#5eead4',
          width: 2,
          opacity: 0.6,
          curveness: 0.3,
          shadowColor: '#5eead4',
          shadowBlur: 3,
        },
        symbol: ['none', 'arrow'],
        symbolSize: [0, 6],
      });
    }

    // jump 边
    for (const j of data.jumps) {
      const sourcePos = timeBasedPositions.get(j.source);
      const targetPos = timeBasedPositions.get(j.target);
      if (!sourcePos || !targetPos) continue;
      edges.push({
        source: j.source,
        target: j.target,
        lineStyle: {
          color: '#c084fc',
          width: 1.5,
          opacity: 0.4,
          curveness: 0.2,
          type: 'dashed',
        },
        symbol: ['none', 'arrow'],
        symbolSize: [0, 4],
      });
    }

    // 传统相似边（背景）
    for (const e of data.edges) {
      const sourcePos = timeBasedPositions.get(e.source);
      const targetPos = timeBasedPositions.get(e.target);
      if (!sourcePos || !targetPos) continue;
      edges.push({
        source: e.source,
        target: e.target,
        lineStyle: {
          color: (e.color || EDGE_TYPE_COLORS[e.type]) + '40',
          width: calculateEdgeWidth(e.weight) * 0.4,
          opacity: 0.15,
          curveness: 0.1,
        },
      });
    }
  }

  const centerTime = new Date(centerNode.timestamp);

  return {
    backgroundColor: 'transparent',
    animationDuration: 600,
    animationDurationUpdate: 500,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: (raw) => {
        const params = raw as unknown as { dataType: string; data: { name?: string; cluster_name?: string; energy?: number; ring?: number } };
        if (params.dataType === 'node') {
          const d = params.data;
          const ringLabel = getTimeRingLabel(d.ring || 0, centerTime, 7);
          return `<strong>${d.name}</strong><br/>${d.cluster_name}<br/>能量 ${d.energy}<br/>时间环: ${ringLabel}<br/><small>右键设为焦点</small>`;
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
        const pos = timeBasedPositions.get(n.id);
        if (!pos) return null;
        const isCenter = n.id === centerNodeId;
        const ring = timeRings.get(n.id) ?? 1;
        return {
          id: String(n.id),
          name: n.topic.length > 12 ? n.topic.slice(0, 10) + '…' : n.topic,
          x: pos.x,
          y: pos.y,
          value: n.degree,
          energy: n.energy,
          cluster_name: n.cluster_name,
          ring,
          symbolSize: isCenter
            ? calculateNodeSize(n.energy, n.degree, maxDeg) * 1.5
            : n.is_surge
              ? calculateNodeSize(n.energy, n.degree, maxDeg) * 1.3
              : calculateNodeSize(n.energy, n.degree, maxDeg),
          itemStyle: {
            color: isCenter ? '#fbbf24' : getClusterColor(n.cluster_id),
            shadowBlur: isCenter ? 25 : n.is_surge ? 20 : 6,
            shadowColor: isCenter ? '#fbbf2480' : n.is_surge ? '#fbbf2480' : getClusterColor(n.cluster_id) + '60',
            borderColor: isCenter || n.is_surge ? '#fbbf24' : 'transparent',
            borderWidth: isCenter ? 3 : n.is_surge ? 2 : 0,
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
      edges,
    }],
  } as EChartsOption;
}
