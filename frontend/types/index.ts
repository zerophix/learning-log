/**
 * 统一类型定义
 * 基于后端 backend/main.py 的 Pydantic 模型，1:1 映射
 */

// --- Tag 类型 ---

export interface Tag {
  tag_id: string;
  tag_name: string;
  tag_category: string;
  tag_description?: string;
  parent_tag_id?: string;
  energy_level: number;
  is_active?: number;
}

export interface TagNode extends Tag {
  children: TagNode[];
}

export interface TagLink {
  source_tag_id: string;
  target_tag_id: string;
  link_type: string;
  link_description?: string;
}

// --- Learning Entry 类型 ---

export interface LearningEntryCreate {
  topic: string;
  insight: string;                          // 核心洞察/分析文章（可长文）
  summary?: string;                         // AI 提取摘要（预览用途）
  diagram?: string;                         // Mermaid 图示
  code_snippet?: string;                    // 代码实现片段
  star_situation: string;                   // STAR 情境
  star_task: string;                        // STAR 任务
  star_action: string;                      // STAR 行动
  star_result: string;                      // STAR 结果
  topic_tag_id?: string;                    // 主题标签 ID
  project_tag_id?: string;                  // 项目标签 ID
  research_type?: string;                   // "deep-research" | "topic-exploration" | "domain-mapping"
  related_tag_ids?: string[];               // 关联标签
  custom_tags?: string[];                   // 自定义标签
  analogy?: string;                         // 类比
  transfer_pattern?: string;                // 可迁移模式
  energy_level?: number;                    // 1-5
  aha_moment?: boolean;                     // 是否顿悟
  source?: string;                          // 来源
  confidence_rating?: number;               // 置信度
}

// 更新 Entry（PUT /api/entries/{id}）— 所有字段可选
export type LearningEntryUpdate = Partial<LearningEntryCreate>;

// 前端展示用 Entry（GET 返回）
export interface Entry {
  id: number;
  topic: string;
  insight: string;
  summary?: string;
  diagram?: string;
  code_snippet?: string;
  star_situation?: string;
  star_task?: string;
  star_action?: string;
  star_result?: string;
  topic_tag_id?: string;
  project_tag_id?: string;
  research_type?: string;
  related_tag_ids: string[];
  custom_tags: string[];
  analogy?: string;
  transfer_pattern?: string;
  energy_level: number;
  aha_moment: boolean;
  source: string;
  confidence_rating?: number;
  timestamp: string;
  content_hash?: string;
}

// --- Graph 类型 ---

export interface GraphNode {
  id: string;
  name: string;
  category: string;
  value: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// --- Auto Tag 类型 ---

export interface AutoTag {
  tag_id: string;
  tag_name: string;
  usage_count: number;
  created_at: string;
}

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

export interface TriggerEdge {
  source: number;
  target: number;
  weight: number;
  day_diff: number;
}

export interface ConceptJumpEdge {
  source: number;
  target: number;
  from_type: string;
  to_type: string;
}

export interface AttentionGraph {
  nodes: AttentionNode[];
  edges: AttentionEdge[];
  triggers: TriggerEdge[];
  jumps: ConceptJumpEdge[];
  clusters: string[];
  weights: { content: number; tags: number; temporal: number };
  entry_count: number;
}

// --- Mutation Response 类型 ---

export interface CreateEntryResponse {
  id: number;
  message: string;
  session_id: string;
  tags_added: number;
}

export interface UpdateEntryResponse {
  id: number;
  message: string;
  fields_updated: string[];
}

export interface DeleteEntryResponse {
  id: number;
  message: string;
}

export interface NeighborItem {
  id: number;
  topic: string;
  energy: number;
  timestamp: string;
  score: number;
  reasons: string[];
}

export interface EnergyShift {
  direction: string;
  type: string;
  from_entry: { id: number; topic: string };
  to_entry: { id: number; topic: string };
}

export interface NeighborsData {
  entry_id: number;
  topic: string;
  neighbors: {
    content: NeighborItem[];
    temporal: NeighborItem[];
    tags: NeighborItem[];
    energy_context: EnergyShift[];
  };
}

// --- Stats 类型 ---

export interface Stats {
  entries: number;
  tags: number;
  links: number;
}

// --- 周分页类型 ---

export interface WeekInfo {
  year: number;
  week: number;
  start: string;
  end: string;
  count: number;
}

export interface WeekResponse {
  data: Entry[];
  week: WeekInfo;
  has_more: boolean;
}

// --- API 参数类型 ---

export interface FeedParams {
  limit?: number;
  offset?: number;
  project_type?: string;
  discipline?: string;
  research_type?: string;
}

// --- Graph Stats 类型 ---

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  clusterCount: number;
  avgDegree: number;
  avgEnergy: number;
  density: number;
}

// --- 辅助类型 ---

export type ViewLevel = 'tags' | 'entries' | 'detail';

export type ResearchType = 'deep-research' | 'topic-exploration' | 'domain-mapping';

export type EntryFilter = {
  type: 'research' | 'project' | 'tag';
  id: string;
} | null;
