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
  aha_moment: number;  // 注意：后端返回 0/1，非 boolean
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
  energy: number;
  aha: boolean;
  cluster: number;
  cluster_name: string;
  timestamp: string;
  degree: number;
  tag_count: number;
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

export interface AttentionGraph {
  nodes: AttentionNode[];
  edges: AttentionEdge[];
  clusters: string[];
  weights: { content: number; tags: number; temporal: number };
  entry_count: number;
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

// --- 辅助类型 ---

export type ViewLevel = 'tags' | 'entries' | 'detail';

export type ResearchType = keyof typeof import('@/lib/constants').RESEARCH_TYPES;

export type EntryFilter = {
  type: 'research' | 'project' | 'tag';
  id: string;
} | null;
