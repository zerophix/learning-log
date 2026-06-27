/**
 * 常量定义 — RESEARCH_TYPES, COLORS, ENERGY_LEVELS
 */

export const RESEARCH_TYPES = {
  'deep-research':      { label: '深度研究', color: '#fbbf24' },
  'topic-exploration':  { label: '主题探索', color: '#34d399' },
  'domain-mapping':     { label: '领域映射', color: '#a78bfa' },
} as const;

// --- Energy Level Colors ---

export const ENERGY_LEVEL_COLORS: Record<number, string> = {
  5: '#34d399', // 高能量 → emerald
  4: '#34d399',
  3: '#9ca3af', // 中能量 → gray
  2: '#fb7185', // 低能量 → rose
  1: '#fb7185',
};

// --- Tag Colors by Category ---

export const TAG_CATEGORY_COLORS: Record<string, string> = {
  framework:        '#38bdf8',  // sky
  database:         '#818cf8',  // indigo
  middleware:       '#a78bfa',  // purple
  language:         '#c084fc',  // violet
  tool:             '#fb7185',  // rose
  project:          '#34d399',  // emerald
  methodology:      '#fbbf24',  // amber
  default:          '#64748b',  // slate
};

// --- Research Type Colors (lookup by type string) ---

export const RESEARCH_TYPE_COLORS: Record<string, string> = {
  'deep-research':      '#fbbf24',
  'topic-exploration':  '#34d399',
  'domain-mapping':     '#a78bfa',
} as const;

// --- Research Type Labels ---

export const RESEARCH_TYPE_LABELS: Record<string, string> = {
  'deep-research':      '深度研究',
  'topic-exploration':  '主题探索',
  'domain-mapping':     '领域映射',
} as const;

// --- Date Format Patterns ---

export const DATE_FORMAT = {
  ISO: 'YYYY-MM-DDTHH:mm:ss',
  SHORT: 'YYYY/MM/DD',
  TIME: 'HH:mm',
} as const;

export const getResearchTypeInfo = (type: string) =>
  RESEARCH_TYPES[type as keyof typeof RESEARCH_TYPES] ?? { label: '', color: '#94a3b8' };
