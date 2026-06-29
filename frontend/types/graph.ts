/**
 * 图谱增强类型定义
 * 用于支持智能聚类、多视图切换和丰富交互
 * 
 * 注意：为避免与 types/index.ts 中的类型冲突，所有类型使用 Enhanced 前缀
 */

// ==================== 基础类型 ====================

/** 研究类型 */
export type ResearchType = 'deep-research' | 'topic-exploration' | 'domain-mapping';

// 重新导出 Entry 类型
export type { Entry } from '@/types';

// ==================== 后端返回的原始类型 ====================

/** 后端返回的原始节点数据 */
export interface AttentionNode {
  id: number;
  topic: string;
  summary: string;
  full_summary: string;
  energy: number;
  aha: boolean;
  research_type: string;
  cluster: number;
  cluster_name: string;
  timestamp: string;
  degree: number;
  tag_count: number;
  tags: string[];
  is_surge: boolean;
}

/** 后端返回的原始边数据 */
export interface AttentionEdge {
  source: number;
  target: number;
  weight: number;
  heads: {
    content: number;
    tags: number;
    temporal: number;
  };
}

/** 后端返回的触发链边 */
export interface TriggerEdge {
  source: number;
  target: number;
  weight: number;
  day_diff: number;
}

/** 后端返回的概念跳跃边 */
export interface ConceptJumpEdge {
  source: number;
  target: number;
  from_type: string;
  to_type: string;
}

/** 后端返回的原始图谱数据 */
export interface AttentionGraph {
  nodes: AttentionNode[];
  edges: AttentionEdge[];
  triggers: TriggerEdge[];
  jumps: ConceptJumpEdge[];
  clusters: string[];
  weights: { content: number; tags: number; temporal: number };
  entry_count: number;
}

// ==================== 基础类型 ====================

/** 图谱边类型（新体系，从"触发链优先"到"概念跃迁"再到"相似度为背景"） */
export type GraphEdgeType = 
  | 'trigger'       // 触发链：A 引出 B（有向，主线）
  | 'concept_jump'  // 概念跃迁：策略切换（有向，跨域）
  | 'content'       // 内容相似（无向，背景）
  | 'tags'          // 标签重叠（无向，背景）
  | 'temporal';     // 时间相邻（无向，背景）→ 被 trigger 取代，可废弃

/** 边筛选类型 */
export type EdgeTypeFilter = GraphEdgeType | 'all';

/** 视图类型 */
export type EnhancedGraphViewType = 'force' | 'timeline' | 'galaxy';

/** 布局类型 */
export type EnhancedLayoutType = 'force' | 'timeline' | 'galaxy';

// ==================== 节点类型 ====================

/** 图谱节点（增强版） */
export interface EnhancedGraphNode {
  /** 节点ID（对应 entry id） */
  id: number;
  /** 主题/标题 */
  topic: string;
  /** 摘要 */
  summary: string;
  /** 完整摘要（未截断） */
  full_summary: string;
  /** 能量等级 (1-5) */
  energy: number;
  /** 是否为顿悟/能量爆发点 */
  is_surge: boolean;
  /** 是否为顿悟时刻 */
  aha_moment: boolean;
  /** 时间戳 */
  timestamp: string;
  /** 研究类型 */
  research_type: ResearchType;
  /** 标签列表 */
  tags: string[];
  /** 所属聚类ID */
  cluster_id: number;
  /** 聚类名称 */
  cluster_name: string;
  /** 节点度数（关联数） */
  degree: number;
  /** 标签数量 */
  tag_count: number;
  
  // 布局相关（由前端计算）
  /** X坐标 */
  x?: number;
  /** Y坐标 */
  y?: number;
  /** 上一位置的X坐标（用于动画） */
  prevX?: number;
  /** 上一位置的Y坐标（用于动画） */
  prevY?: number;
  
  // 可视化相关
  /** 节点大小（根据 energy + degree 计算） */
  symbolSize?: number;
  /** 节点颜色 */
  color?: string;
  /** 是否被选中 */
  isSelected?: boolean;
  /** 是否被高亮 */
  isHighlighted?: boolean;
  /** 是否被淡化 */
  isDimmed?: boolean;
  /** 是否为搜索匹配 */
  isSearchMatch?: boolean;
}

/** 简化的节点信息（用于 tooltip 和列表） */
export interface EnhancedGraphNodeBrief {
  id: number;
  topic: string;
  energy: number;
  cluster_name: string;
  degree: number;
  timestamp: string;
}

// ==================== 边类型 ====================

/** 图谱边（增强版） */
export interface EnhancedGraphEdge {
  /** 源节点ID */
  source: number;
  /** 目标节点ID */
  target: number;
  /** 关联权重 (0-1) */
  weight: number;
  /** 关联类型（主要类型） */
  type: GraphEdgeType;
  /** 各维度的关联强度 */
  heads?: {
    /** 内容相似度 */
    content: number;
    /** 标签相似度 */
    tags: number;
    /** 时间相似度 */
    temporal: number;
  };
  
  // 可视化相关
  /** 边的颜色 */
  color?: string;
  /** 边的宽度 */
  width?: number;
  /** 是否被高亮 */
  isHighlighted?: boolean;
  /** 是否被淡化 */
  isDimmed?: boolean;
}

// ==================== 聚类类型 ====================

/** 聚类信息（增强版） */
export interface EnhancedGraphCluster {
  /** 聚类ID */
  id: number;
  /** 聚类标签（语义化标签） */
  label: string;
  /** 聚类颜色 */
  color: string;
  /** 包含的节点ID列表 */
  nodes: number[];
  /** 聚类中心坐标 */
  center?: {
    x: number;
    y: number;
  };
  /** 凸包坐标（用于绘制聚类区域） */
  hull?: number[][];
  /** 节点数量 */
  count?: number;
  /** 平均能量 */
  avgEnergy?: number;
  /** 主要研究类型 */
  dominantResearchType?: ResearchType;
}

// ==================== 图谱数据类型 ====================

/** 权重配置 */
export interface EnhancedGraphWeights {
  /** 内容相似度权重 */
  content: number;
  /** 标签相似度权重 */
  tags: number;
  /** 时间相似度权重 */
  temporal: number;
}

/** 增强触发链边 */
export interface EnhancedTriggerEdge {
  source: number;
  target: number;
  weight: number;
  day_diff: number;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

/** 增强概念跳跃边 */
export interface EnhancedConceptJump {
  source: number;
  target: number;
  from_type: string;
  to_type: string;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

/** 增强图谱数据 */
export interface EnhancedGraphData {
  /** 节点列表 */
  nodes: EnhancedGraphNode[];
  /** 边列表 */
  edges: EnhancedGraphEdge[];
  /** 触发链边 */
  triggers: EnhancedTriggerEdge[];
  /** 概念跳跃边 */
  jumps: EnhancedConceptJump[];
  /** 聚类列表 */
  clusters: EnhancedGraphCluster[];
  /** 权重配置 */
  weights: EnhancedGraphWeights;
  /** 总条目数 */
  entry_count: number;
}

// ==================== 筛选和查询类型 ====================

/** 时间范围预设 */
export type EnhancedTimeRangePreset = '7d' | '30d' | '90d' | 'all';

/** 时间范围 */
export interface EnhancedTimeRange {
  type: EnhancedTimeRangePreset;
  start?: Date;
  end?: Date;
  /** 天数（用于筛选） */
  days?: number;
}

/** 图谱筛选条件 */
export interface EnhancedGraphFilter {
  /** 研究类型筛选 */
  researchTypes?: ResearchType[];
  /** 能量等级范围 [min, max] */
  energyRange?: [number, number];
  /** 时间范围 */
  timeRange?: EnhancedTimeRange;
  /** 标签筛选 */
  tagIds?: string[];
  /** 聚类筛选 */
  clusterIds?: number[];
  /** 最小关联权重 */
  minEdgeWeight?: number;
}

/** 搜索条件 */
export interface EnhancedGraphSearch {
  /** 搜索关键词 */
  query: string;
  /** 是否搜索标题 */
  searchTitle?: boolean;
  /** 是否搜索摘要 */
  searchSummary?: boolean;
  /** 是否搜索标签 */
  searchTags?: boolean;
}

// ==================== 交互状态类型 ====================

/** 选中状态 */
export interface EnhancedSelectionState {
  /** 选中的节点ID */
  nodeId: number | null;
  /** 选中的边 */
  edges: EnhancedGraphEdge[];
  /** 一度关联节点ID */
  neighborIds: number[];
}

/** 悬停状态 */
export interface EnhancedHoverState {
  /** 悬停的节点ID */
  nodeId: number | null;
  /** 悬停的边 */
  edge: EnhancedGraphEdge | null;
}

/** 视图配置 */
export interface EnhancedViewConfig {
  /** 当前视图类型 */
  type?: EnhancedGraphViewType;
  /** 缩放级别 */
  zoom?: number;
  /** 视图中心 */
  center?: { x: number; y: number };
  /** 是否显示边 */
  showEdges: boolean;
  /** 是否显示标签 */
  showLabels: boolean;
  /** 是否显示聚类区域 */
  showClusters?: boolean;
}

// ==================== API 参数类型 ====================

/** 图谱查询参数 */
export interface EnhancedGraphQueryParams {
  /** 返回节点数量 */
  top_k?: number;
  /** 最小边权重 */
  min_weight?: number;
  /** 是否返回聚类信息 */
  clusters?: boolean;
  /** 布局类型 */
  layout?: EnhancedLayoutType;
  /** 权重配置 */
  w_content?: number;
  w_tags?: number;
  w_temporal?: number;
  /** 研究类型筛选 */
  research_type?: ResearchType;
}

// ==================== 常量 ====================

/** 默认视图配置 */
export const ENHANCED_DEFAULT_VIEW_CONFIG: EnhancedViewConfig = {
  type: 'force',
  zoom: 1,
  center: { x: 0, y: 0 },
  showEdges: true,
  showLabels: false,
  showClusters: true,
};

/** 默认筛选条件 */
export const ENHANCED_DEFAULT_FILTER: EnhancedGraphFilter = {
  researchTypes: undefined,
  energyRange: undefined,
  timeRange: undefined,
  tagIds: undefined,
  clusterIds: undefined,
  minEdgeWeight: 0.1,
};

/** 时间范围预设映射 */
export const ENHANCED_TIME_RANGE_PRESETS: Record<EnhancedTimeRangePreset, { label: string; days?: number }> = {
  '7d': { label: '最近7天', days: 7 },
  '30d': { label: '最近30天', days: 30 },
  '90d': { label: '最近90天', days: 90 },
  'all': { label: '全部', days: undefined },
};

/** 视图类型映射 */
export const ENHANCED_VIEW_TYPE_LABELS: Record<EnhancedGraphViewType, string> = {
  'force': '力导向图',
  'timeline': '时间线',
  'galaxy': '星系图',
};