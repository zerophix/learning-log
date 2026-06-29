/**
 * 图谱工具函数
 * 包含布局计算、视觉映射、筛选逻辑等
 */

import type {
  EnhancedGraphNode,
  EnhancedGraphEdge,
  EnhancedGraphCluster,
  EnhancedGraphData,
  EnhancedTriggerEdge,
  EnhancedConceptJump,
  AttentionGraph,
  AttentionNode,
  AttentionEdge,
  EnhancedGraphFilter,
  EnhancedGraphSearch,
  EnhancedViewConfig,
  GraphEdgeType,
  EnhancedTimeRange,
  ResearchType,
} from '@/types/graph';

// ==================== 颜色系统 ====================

/** 聚类颜色调色板 */
export const CLUSTER_COLORS = [
  '#38bdf8', // 天空蓝
  '#34d399', // 翡翠绿
  '#fbbf24', // 琥珀黄
  '#a78bfa', // 紫色
  '#f472b6', // 粉色
  '#fb923c', // 橙色
  '#2dd4bf', // 青色
  '#c084fc', // 淡紫
  '#60a5fa', // 蓝色
  '#4ade80', // 绿色
];

/** 关联类型颜色 */
export const EDGE_TYPE_COLORS: Record<GraphEdgeType, string> = {
  content: '#38bdf8', // 蓝色 - 内容相似
  tags: '#34d399',    // 绿色 - 标签重叠
  temporal: '#fbbf24', // 橙色 - 时间相邻
  trigger: '#5eead4', // 青色 - 触发链
  concept_jump: '#c084fc', // 紫色 - 概念跃迁
};

/** 研究类型颜色 */
export const RESEARCH_TYPE_COLORS: Record<ResearchType, string> = {
  'deep-research': '#fbbf24',
  'topic-exploration': '#34d399',
  'domain-mapping': '#a78bfa',
};

/** 获取聚类颜色 */
export function getClusterColor(clusterId: number): string {
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

/** 获取边的颜色（根据主要关联类型） */
export function getEdgeColor(edge: EnhancedGraphEdge | AttentionEdge): string {
  if ('type' in edge && edge.type) {
    return EDGE_TYPE_COLORS[edge.type as GraphEdgeType] || '#334155';
  }
  
  // 根据 heads 判断主要类型
  if ('heads' in edge && edge.heads) {
    const { content, tags, temporal } = edge.heads;
    const max = Math.max(content, tags, temporal);
    if (max === content) return EDGE_TYPE_COLORS.content;
    if (max === tags) return EDGE_TYPE_COLORS.tags;
    return EDGE_TYPE_COLORS.temporal;
  }
  
  return '#334155';
}

// ==================== 节点大小计算 ====================

/** 计算节点大小 */
export function calculateNodeSize(
  energy: number,
  degree: number,
  maxDegree: number,
  minSize: number = 12,
  maxSize: number = 40
): number {
  // 基础大小 + 能量加成 + 度数加成
  const energyFactor = energy / 5; // 0-1
  const degreeFactor = maxDegree > 0 ? degree / maxDegree : 0;
  
  return minSize + (maxSize - minSize) * (energyFactor * 0.4 + degreeFactor * 0.6);
}

/** 计算边的宽度 */
export function calculateEdgeWidth(
  weight: number,
  minWidth: number = 0.5,
  maxWidth: number = 6
): number {
  return minWidth + (maxWidth - minWidth) * weight;
}

// ==================== 数据转换 ====================

/** 将后端返回的 AttentionGraph 转换为 EnhancedGraphData */
export function transformAttentionGraph(data: AttentionGraph): EnhancedGraphData {
  const nodes = data.nodes.map((node): EnhancedGraphNode => ({
    id: node.id,
    topic: node.topic,
    summary: node.summary || '',
    full_summary: node.full_summary || '',
    energy: node.energy,
    is_surge: node.is_surge ?? false,
    aha_moment: node.aha ?? false,
    timestamp: node.timestamp,
    research_type: node.research_type as ResearchType,
    tags: node.tags || [],
    cluster_id: node.cluster,
    cluster_name: node.cluster_name,
    degree: node.degree,
    tag_count: node.tag_count,
  }));

  const edges = data.edges.map((edge): EnhancedGraphEdge => {
    const type = getEdgeTypeFromHeads(edge.heads);
    return {
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      type,
      heads: edge.heads,
      color: getEdgeColor(edge),
      width: calculateEdgeWidth(edge.weight),
    };
  });

  const triggers = (data.triggers || []).map((t): EnhancedTriggerEdge => ({
    source: t.source,
    target: t.target,
    weight: t.weight,
    day_diff: t.day_diff,
  }));

  const jumps = (data.jumps || []).map((j): EnhancedConceptJump => ({
    source: j.source,
    target: j.target,
    from_type: j.from_type,
    to_type: j.to_type,
  }));

  // 从 nodes 中提取聚类信息
  const clusterMap = new Map<number, EnhancedGraphCluster>();
  nodes.forEach(node => {
    if (!clusterMap.has(node.cluster_id)) {
      clusterMap.set(node.cluster_id, {
        id: node.cluster_id,
        label: node.cluster_name,
        color: getClusterColor(node.cluster_id),
        nodes: [],
      });
    }
    clusterMap.get(node.cluster_id)!.nodes.push(node.id);
  });

  const clusters = Array.from(clusterMap.values()).map(cluster => ({
    ...cluster,
    count: cluster.nodes.length,
  }));

  return {
    nodes,
    edges,
    triggers,
    jumps,
    clusters,
    weights: data.weights,
    entry_count: data.entry_count,
  };
}

/** 根据 heads 判断边的主要类型 */
function getEdgeTypeFromHeads(heads: { content: number; tags: number; temporal: number }): GraphEdgeType {
  const { content, tags, temporal } = heads;
  const max = Math.max(content, tags, temporal);
  if (max === content) return 'content';
  if (max === tags) return 'tags';
  return 'temporal';
}

// ==================== 筛选逻辑 ====================

/** 应用筛选条件 */
export function applyFilter(
  nodes: EnhancedGraphNode[],
  edges: EnhancedGraphEdge[],
  filter: EnhancedGraphFilter
): { nodes: EnhancedGraphNode[]; edges: EnhancedGraphEdge[] } {
  let filteredNodes = [...nodes];
  let filteredEdges = [...edges];

  // 研究类型筛选
  if (filter.researchTypes && filter.researchTypes.length > 0) {
    filteredNodes = filteredNodes.filter(n => 
      filter.researchTypes!.includes(n.research_type)
    );
  }

  // 能量等级筛选
  if (filter.energyRange) {
    const [minEnergy, maxEnergy] = filter.energyRange;
    filteredNodes = filteredNodes.filter(n => 
      n.energy >= minEnergy && n.energy <= maxEnergy
    );
  }

  // 时间范围筛选
  if (filter.timeRange && filter.timeRange.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.timeRange.days!);
    filteredNodes = filteredNodes.filter(n => 
      new Date(n.timestamp) >= cutoff
    );
  }

  // 标签筛选
  if (filter.tagIds && filter.tagIds.length > 0) {
    filteredNodes = filteredNodes.filter(n => 
      n.tags.some(tag => filter.tagIds!.includes(tag))
    );
  }

  // 聚类筛选
  if (filter.clusterIds && filter.clusterIds.length > 0) {
    filteredNodes = filteredNodes.filter(n => 
      filter.clusterIds!.includes(n.cluster_id)
    );
  }

  // 根据筛选后的节点过滤边
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  filteredEdges = filteredEdges.filter(e => 
    nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  // 最小权重筛选
  if (filter.minEdgeWeight !== undefined) {
    filteredEdges = filteredEdges.filter(e => 
      e.weight >= filter.minEdgeWeight!
    );
  }

  return { nodes: filteredNodes, edges: filteredEdges };
}

/** 搜索节点 */
export function searchNodes(
  nodes: EnhancedGraphNode[],
  search: EnhancedGraphSearch
): Set<number> {
  const matchedIds = new Set<number>();
  const query = search.query.toLowerCase().trim();
  
  if (!query) return matchedIds;

  nodes.forEach(node => {
    let matched = false;

    if (search.searchTitle !== false && node.topic.toLowerCase().includes(query)) {
      matched = true;
    }

    if (search.searchSummary !== false && node.summary.toLowerCase().includes(query)) {
      matched = true;
    }

    if (search.searchTags !== false && node.tags.some(tag => tag.toLowerCase().includes(query))) {
      matched = true;
    }

    if (matched) {
      matchedIds.add(node.id);
    }
  });

  return matchedIds;
}

/** 获取节点的关联节点 */
export function getNeighborNodes(
  nodeId: number,
  nodes: EnhancedGraphNode[],
  edges: EnhancedGraphEdge[],
  maxDepth: number = 1
): { nodes: EnhancedGraphNode[]; edges: EnhancedGraphEdge[] } {
  const visited = new Set<number>([nodeId]);
  const neighborIds = new Set<number>();
  const neighborEdges: EnhancedGraphEdge[] = [];

  // BFS 查找关联节点
  const queue: { id: number; depth: number }[] = [{ id: nodeId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    edges.forEach(edge => {
      let neighborId: number | null = null;
      if (edge.source === id && !visited.has(edge.target)) {
        neighborId = edge.target;
      } else if (edge.target === id && !visited.has(edge.source)) {
        neighborId = edge.source;
      }

      if (neighborId !== null) {
        visited.add(neighborId);
        neighborIds.add(neighborId);
        neighborEdges.push(edge);
        queue.push({ id: neighborId, depth: depth + 1 });
      }
    });
  }

  const neighborNodes = nodes.filter(n => neighborIds.has(n.id));
  return { nodes: neighborNodes, edges: neighborEdges };
}

// ==================== 布局计算 ====================

/** 力导向图配置 */
export interface ForceLayoutConfig {
  repulsion: number;
  attraction: number;
  edgeLength: [number, number];
  friction: number;
  gravity: number;
}

/** 默认力导向图配置 */
export const DEFAULT_FORCE_LAYOUT: ForceLayoutConfig = {
  repulsion: 800,      // 斥力
  attraction: 0.1,      // 引力系数
  edgeLength: [100, 300], // 边长度范围
  friction: 0.1,        // 摩擦系数
  gravity: 0.1,         // 重力系数（向中心聚集）
};

/** 计算节点的目标位置（用于动画） */
export function calculateTargetPositions(
  nodes: EnhancedGraphNode[],
  edges: EnhancedGraphEdge[],
  width: number,
  height: number,
  config: ForceLayoutConfig = DEFAULT_FORCE_LAYOUT
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // 简单的力导向算法实现
  const centerX = width / 2;
  const centerY = height / 2;

  nodes.forEach((node, index) => {
    // 初始位置：圆形分布
    const angle = (index / nodes.length) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.35;
    positions.set(node.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });

  // 简单的迭代优化（实际应用中应该使用更复杂的算法或库）
  // 这里只是提供一个基础实现
  return positions;
}

// ==================== 聚类计算 ====================

/** 计算聚类中心 */
export function calculateClusterCenters(
  nodes: EnhancedGraphNode[],
  clusters: EnhancedGraphCluster[]
): EnhancedGraphCluster[] {
  return clusters.map(cluster => {
    const clusterNodes = nodes.filter(n => cluster.nodes.includes(n.id));
    if (clusterNodes.length === 0) return cluster;

    const avgX = clusterNodes.reduce((sum, n) => sum + (n.x || 0), 0) / clusterNodes.length;
    const avgY = clusterNodes.reduce((sum, n) => sum + (n.y || 0), 0) / clusterNodes.length;
    const avgEnergy = clusterNodes.reduce((sum, n) => sum + n.energy, 0) / clusterNodes.length;

    return {
      ...cluster,
      center: { x: avgX, y: avgY },
      avgEnergy,
    };
  });
}

/** 计算凸包（简化版） */
export function calculateConvexHull(
  nodes: EnhancedGraphNode[],
  clusterNodes: number[]
): number[][] {
  const points = nodes
    .filter(n => clusterNodes.includes(n.id) && n.x !== undefined && n.y !== undefined)
    .map(n => [n.x!, n.y!] as number[]);

  if (points.length < 3) return points.map(p => [...p]);

  // Graham scan 算法
  const sorted = points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower: number[][] = [];
  const upper: number[][] = [];

  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);

    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** 叉积计算 */
function cross(o: number[], a: number[], b: number[]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

// ==================== 统计计算 ====================

/** 计算图谱统计信息 */
export function calculateGraphStats(
  nodes: EnhancedGraphNode[],
  edges: EnhancedGraphEdge[],
  clusters: EnhancedGraphCluster[]
) {
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    clusterCount: clusters.length,
    avgDegree: edges.length > 0 ? (edges.length * 2) / nodes.length : 0,
    avgEnergy: nodes.length > 0 ? nodes.reduce((sum, n) => sum + n.energy, 0) / nodes.length : 0,
    density: nodes.length > 1 ? (edges.length * 2) / (nodes.length * (nodes.length - 1)) : 0,
  };
}

// ==================== 时间线布局 ====================

/** 计算时间线布局 — Y 轴绑定 energy_level */
export function calculateTimelineLayout(
  nodes: EnhancedGraphNode[],
  width: number,
  height: number,
  padding: number = 80
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  
  // 按时间排序
  const sorted = [...nodes].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const timelineWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Y 轴映射：energy 1~5 → chart 底部到顶部
  sorted.forEach((node, index) => {
    const x = padding + (index / Math.max(sorted.length - 1, 1)) * timelineWidth;
    const energyFraction = (node.energy - 1) / 4; // 0~1
    const y = padding + chartHeight * (1 - energyFraction); // 顶部 = energy 5

    positions.set(node.id, { x, y });
  });

  return positions;
}

// ==================== 时间环工具（v2 Galaxy） ====================

/** 计算时间环：根据与中心节点的时间差确定环层级 */
export function calculateTimeRings(
  nodes: EnhancedGraphNode[],
  centerId: number,
  daysPerRing: number = 7
): Map<number, number> {
  const rings = new Map<number, number>();
  const centerNode = nodes.find(n => n.id === centerId);
  if (!centerNode) return rings;

  const centerTime = new Date(centerNode.timestamp).getTime();

  nodes.forEach(node => {
    if (node.id === centerId) {
      rings.set(node.id, 0);
      return;
    }
    const diffDays = Math.abs(new Date(node.timestamp).getTime() - centerTime) / (1000 * 60 * 60 * 24);
    const ring = Math.min(Math.floor(diffDays / daysPerRing) + 1, 10);
    rings.set(node.id, ring);
  });

  return rings;
}

/** 计算时间线分隔线（按周） */
export function calculateTimeSeparators(
  nodes: EnhancedGraphNode[],
  width: number,
  padding: number = 80
): Array<{ x: number; label: string }> {
  if (nodes.length < 2) return [];

  const sorted = [...nodes].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const timelineWidth = width - padding * 2;

  // 收集所有周边界
  const weeks = new Set<string>();
  const separators: Array<{ x: number; label: string }> = [];

  sorted.forEach((node, index) => {
    const d = new Date(node.timestamp);
    const weekKey = `${d.getFullYear()}-W${Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + d.getDay() + 1) / 7)}`;

    if (!weeks.has(weekKey)) {
      if (weeks.size > 0) {
        const x = padding + (index / Math.max(sorted.length - 1, 1)) * timelineWidth;
        const fmt = `${d.getMonth() + 1}/${d.getDate()}`;
        separators.push({ x, label: fmt });
      }
      weeks.add(weekKey);
    }
  });

  return separators;
}

/** 获取时间段标签 */
export function getTimeRingLabel(ring: number, centerTime: Date, daysPerRing: number = 7): string {
  if (ring === 0) return '中心';
  const start = new Date(centerTime.getTime() - ring * daysPerRing * 24 * 60 * 60 * 1000);
  const end = new Date(centerTime.getTime() + ring * daysPerRing * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)}-${fmt(end)}`;
}

// ==================== 星系图布局 ====================

/** 计算星系图布局 */
export function calculateGalaxyLayout(
  nodes: EnhancedGraphNode[],
  edges: EnhancedGraphEdge[],
  centerNodeId: number,
  width: number,
  height: number,
  maxRings: number = 3
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  const centerX = width / 2;
  const centerY = height / 2;

  // 设置中心节点位置
  positions.set(centerNodeId, { x: centerX, y: centerY });

  // 计算各层节点
  const visited = new Set<number>([centerNodeId]);
  const rings: number[][] = [[]]; // 每层的节点ID

  // BFS 分层
  let currentRing = [centerNodeId];
  for (let ring = 1; ring <= maxRings && currentRing.length > 0; ring++) {
    const nextRing: number[] = [];
    currentRing.forEach(nodeId => {
      edges.forEach(edge => {
        let neighborId: number | null = null;
        if (edge.source === nodeId && !visited.has(edge.target)) {
          neighborId = edge.target;
        } else if (edge.target === nodeId && !visited.has(edge.source)) {
          neighborId = edge.source;
        }
        if (neighborId !== null) {
          visited.add(neighborId);
          nextRing.push(neighborId);
        }
      });
    });
    if (nextRing.length > 0) {
      rings.push(nextRing);
      currentRing = nextRing;
    } else {
      break;
    }
  }

  // 计算各层位置
  const maxRadius = Math.min(width, height) * 0.4;
  rings.forEach((ring, ringIndex) => {
    if (ringIndex === 0) return;
    const radius = (ringIndex / rings.length) * maxRadius;
    const angleStep = (Math.PI * 2) / ring.length;

    ring.forEach((nodeId, nodeIndex) => {
      const jitter = (Math.sin(nodeId * 9301 + 49297) * 0.5 + 0.5) * 0.3;
      const angle = nodeIndex * angleStep + jitter * angleStep;
      positions.set(nodeId, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });
  });

  return positions;
}