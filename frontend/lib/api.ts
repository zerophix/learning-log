/**
 * API 客户端 — 统一请求层
 * Base URL: http://localhost:8002
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

import type {
  Entry,
  LearningEntryCreate,
  LearningEntryUpdate,
  Tag,
  TagNode,
  TagLink,
  GraphData,
  Stats,
  WeekInfo,
  WeekResponse,
  AutoTag,
  AttentionGraph,
  CreateEntryResponse,
  UpdateEntryResponse,
  DeleteEntryResponse,
  NeighborsData,
  FeedParams,
} from '@/types';

export function fetchWithTimeout(url: string, timeout = 10000, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort());
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

function checkResponse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    return r.json().then(e => Promise.reject(new Error(e.detail || `HTTP ${r.status}`)));
  }
  return r.json().then(transformEntry as any) as Promise<T>;
}

function transformEntry(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(transformEntry);
  }
  if (data && typeof data === 'object' && 'aha_moment' in data) {
    const entry = data as Record<string, unknown>;
    if (typeof entry.aha_moment === 'number') {
      entry.aha_moment = entry.aha_moment === 1;
    }
    if ('neighbors' in entry) {
      transformEntry(entry.neighbors);
    }
  }
  return data;
}

// ── 轻量内存缓存 ──

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 30_000; // 30s

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

function cacheKey(url: string, params?: Record<string, unknown>): string {
  return params ? `${url}?${JSON.stringify(params)}` : url;
}

function cachedFetch<T>(url: string, key: string, timeout = 10000, signal?: AbortSignal): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return Promise.resolve(cached);
  return fetchWithTimeout(url, timeout, signal).then(r => checkResponse<T>(r)).then(data => {
    setCache(key, data);
    return data;
  });
}

function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// ── API 客户端 ──

export const api = {
  entries: {
    list: (limit = 50, offset = 0, signal?: AbortSignal) => {
      const url = `${BASE_URL}/api/entries?limit=${limit}&offset=${offset}`;
      return cachedFetch<Entry[]>(url, cacheKey(url), 10000, signal);
    },

    get: (id: number, signal?: AbortSignal) => {
      const url = `${BASE_URL}/api/entries/${id}`;
      return cachedFetch<Entry>(url, cacheKey(url), 10000, signal);
    },

    neighbors: (id: number, signal?: AbortSignal) => {
      const url = `${BASE_URL}/api/entries/${id}/neighbors`;
      return cachedFetch<NeighborsData>(url, cacheKey(url), 15000, signal);
    },

    create: (data: LearningEntryCreate) =>
      fetch(`${BASE_URL}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => checkResponse<CreateEntryResponse>(r)).then(res => {
        invalidateCache('/api/entries');
        invalidateCache('/api/stats');
        invalidateCache('/api/graph/attention');
        return res;
      }),

    update: (id: number, data: LearningEntryUpdate) =>
      fetch(`${BASE_URL}/api/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => checkResponse<UpdateEntryResponse>(r)).then(res => {
        invalidateCache('/api/entries');
        invalidateCache('/api/stats');
        invalidateCache('/api/graph');
        invalidateCache('/api/graph/attention');
        return res;
      }),

    delete: (id: number) =>
      fetch(`${BASE_URL}/api/entries/${id}`, { method: 'DELETE' }).then(r => checkResponse<DeleteEntryResponse>(r)).then(res => {
        invalidateCache('/api/entries');
        invalidateCache('/api/stats');
        invalidateCache('/api/graph');
        invalidateCache('/api/graph/attention');
        return res;
      }),

    batch: (ids: number[]) =>
      fetch(`${BASE_URL}/api/entries/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }).then(r => checkResponse<Entry[]>(r)),

    byWeek: (year: number, week: number, limit = 50) => {
      const url = `${BASE_URL}/api/entries/week?year=${year}&week=${week}&limit=${limit}`;
      return cachedFetch<WeekResponse>(url, cacheKey(url));
    },

    weekIndex: () => {
      const url = `${BASE_URL}/api/entries/week-index`;
      return cachedFetch<WeekInfo[]>(url, cacheKey(url));
    },

    feed: (params?: FeedParams, signal?: AbortSignal) => {
      const url = !params || Object.keys(params).length === 0
        ? `${BASE_URL}/api/entries/feed`
        : `${BASE_URL}/api/entries/feed?${new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
          ).toString()}`;
      return cachedFetch<Entry[]>(url, cacheKey(url), 10000, signal);
    },
  },

  tags: {
    list: (category?: string, signal?: AbortSignal) => {
      const url = `${BASE_URL}/api/tags${category ? `?category=${category}` : ''}`;
      return cachedFetch<Tag[]>(url, cacheKey(url), 10000, signal);
    },

    tree: (signal?: AbortSignal) => {
      const url = `${BASE_URL}/api/tags/tree`;
      return cachedFetch<TagNode[]>(url, cacheKey(url), 10000, signal);
    },

    cloud: (signal?: AbortSignal) => {
      const url = `${BASE_URL}/api/tags/cloud`;
      return cachedFetch<AutoTag[]>(url, cacheKey(url), 10000, signal);
    },

    autoComplete: (prefix: string, signal?: AbortSignal) => {
      const url = `${BASE_URL}/api/tags/auto?prefix=${encodeURIComponent(prefix)}`;
      return cachedFetch<AutoTag[]>(url, cacheKey(url), 10000, signal);
    },

    entries: (tagId: string, researchType?: string, signal?: AbortSignal) => {
      const qs = researchType ? `?research_type=${researchType}` : '';
      const url = `${BASE_URL}/api/tags/${tagId}/entries${qs}`;
      return cachedFetch<Entry[]>(url, cacheKey(url), 10000, signal);
    },
  },

  tagLinks: {
    list: (sourceTagId?: string, signal?: AbortSignal) => {
      const qs = sourceTagId ? `?source_tag_id=${sourceTagId}` : '';
      const url = `${BASE_URL}/api/tag-links${qs}`;
      return cachedFetch<TagLink[]>(url, cacheKey(url), 10000, signal);
    },
  },

  graph: (signal?: AbortSignal) => {
    const url = `${BASE_URL}/api/graph`;
    return cachedFetch<GraphData>(url, cacheKey(url), 10000, signal);
  },

  attention: (params?: { w_content?: number; w_tags?: number; w_temporal?: number; top_k?: number; research_type?: string | null }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params?.w_content != null) query.set('w_content', String(params.w_content));
    if (params?.w_tags != null) query.set('w_tags', String(params.w_tags));
    if (params?.w_temporal != null) query.set('w_temporal', String(params.w_temporal));
    if (params?.top_k != null) query.set('top_k', String(params.top_k));
    if (params?.research_type != null && params.research_type !== '') query.set('research_type', params.research_type);
    const qs = query.toString();
    const url = `${BASE_URL}/api/graph/attention${qs ? '?' + qs : ''}`;
    return cachedFetch<AttentionGraph>(url, cacheKey(url, params as Record<string, unknown>), 60000, signal);
  },

  stats: (signal?: AbortSignal) => {
    const url = `${BASE_URL}/api/stats`;
    return cachedFetch<Stats>(url, cacheKey(url), 10000, signal);
  },

  projects: {
    list: (projectType?: string, signal?: AbortSignal) => {
      const qs = projectType ? `?project_type=${projectType}` : '';
      const url = `${BASE_URL}/api/projects${qs}`;
      return cachedFetch<Tag[]>(url, cacheKey(url), 10000, signal);
    },

    entries: (projectId: string, researchType?: string, signal?: AbortSignal) => {
      const qs = researchType ? `?research_type=${researchType}` : '';
      const url = `${BASE_URL}/api/projects/${projectId}/entries${qs}`;
      return cachedFetch<Entry[]>(url, cacheKey(url), 10000, signal);
    },
  },
};
