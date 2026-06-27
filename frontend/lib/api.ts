/**
 * API 客户端 — 统一请求层
 * Base URL: http://localhost:8002
 */

const BASE_URL = 'http://localhost:8002';

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
  return r.json() as Promise<T>;
}

// --- Types for Feed Params ---
export interface FeedParams {
  limit?: number;
  offset?: number;
  project_type?: string;
  discipline?: string;
  research_type?: string;
}

export const api = {
  entries: {
    list: (limit = 50, offset = 0, signal?: AbortSignal) =>
      fetchWithTimeout(`${BASE_URL}/api/entries?limit=${limit}&offset=${offset}`, 10000, signal).then(r => checkResponse<Entry[]>(r)),

    get: (id: number, signal?: AbortSignal) =>
      fetchWithTimeout(`${BASE_URL}/api/entries/${id}`, 10000, signal).then(r => checkResponse<Entry>(r)),

    neighbors: (id: number, signal?: AbortSignal) =>
      fetchWithTimeout(`${BASE_URL}/api/entries/${id}/neighbors`, 15000, signal).then(r => checkResponse<any>(r)),

    create: (data: LearningEntryCreate) =>
      fetch(`${BASE_URL}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => checkResponse<any>(r)),

    update: (id: number, data: LearningEntryUpdate) =>
      fetch(`${BASE_URL}/api/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => checkResponse<any>(r)),

    delete: (id: number) =>
      fetch(`${BASE_URL}/api/entries/${id}`, { method: 'DELETE' }).then(r => checkResponse<any>(r)),

    byWeek: (year: number, week: number, limit = 50) =>
      fetchWithTimeout(`${BASE_URL}/api/entries/week?year=${year}&week=${week}&limit=${limit}`)
        .then(r => checkResponse<WeekResponse>(r)),

    weekIndex: () =>
      fetchWithTimeout(`${BASE_URL}/api/entries/week-index`)
        .then(r => checkResponse<WeekInfo[]>(r)),

    feed: (params?: FeedParams, signal?: AbortSignal) => {
      if (!params || Object.keys(params).length === 0) {
        return fetchWithTimeout(`${BASE_URL}/api/entries/feed`, 10000, signal).then(r => checkResponse<Entry[]>(r));
      }
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
      ).toString();
      return fetchWithTimeout(`${BASE_URL}/api/entries/feed?${qs}`, 10000, signal).then(r => checkResponse<Entry[]>(r));
    },
  },

  tags: {
    list: (category?: string, signal?: AbortSignal) => {
      const qs = category ? `?category=${category}` : '';
      return fetchWithTimeout(`${BASE_URL}/api/tags${qs}`, 10000, signal).then(r => checkResponse<Tag[]>(r));
    },

    tree: (signal?: AbortSignal) =>
      fetchWithTimeout(`${BASE_URL}/api/tags/tree`, 10000, signal).then(r => checkResponse<TagNode[]>(r)),

    cloud: (signal?: AbortSignal) =>
      fetchWithTimeout(`${BASE_URL}/api/tags/cloud`, 10000, signal).then(r => checkResponse<AutoTag[]>(r)),

    autoComplete: (prefix: string, signal?: AbortSignal) =>
      fetchWithTimeout(`${BASE_URL}/api/tags/auto?prefix=${encodeURIComponent(prefix)}`, 10000, signal).then(r => checkResponse<AutoTag[]>(r)),

    entries: (tagId: string, researchType?: string, signal?: AbortSignal) => {
      const qs = researchType ? `?research_type=${researchType}` : '';
      return fetchWithTimeout(`${BASE_URL}/api/tags/${tagId}/entries${qs}`, 10000, signal).then(r => checkResponse<Entry[]>(r));
    },
  },

  tagLinks: {
    list: (sourceTagId?: string, signal?: AbortSignal) => {
      const qs = sourceTagId ? `?source_tag_id=${sourceTagId}` : '';
      return fetchWithTimeout(`${BASE_URL}/api/tag-links${qs}`, 10000, signal).then(r => checkResponse<TagLink[]>(r));
    },
  },

  graph: (signal?: AbortSignal) =>
    fetchWithTimeout(`${BASE_URL}/api/graph`, 10000, signal).then(r => checkResponse<GraphData>(r)),

  attention: (params?: { w_content?: number; w_tags?: number; w_temporal?: number; top_k?: number }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params?.w_content != null) query.set('w_content', String(params.w_content));
    if (params?.w_tags != null) query.set('w_tags', String(params.w_tags));
    if (params?.w_temporal != null) query.set('w_temporal', String(params.w_temporal));
    if (params?.top_k != null) query.set('top_k', String(params.top_k));
    const qs = query.toString();
    return fetchWithTimeout(`${BASE_URL}/api/graph/attention${qs ? '?' + qs : ''}`, 60000, signal).then(r => checkResponse<AttentionGraph>(r));
  },

  stats: (signal?: AbortSignal) =>
    fetchWithTimeout(`${BASE_URL}/api/stats`, 10000, signal).then(r => checkResponse<Stats>(r)),

  projects: {
    list: (projectType?: string, signal?: AbortSignal) => {
      const qs = projectType ? `?project_type=${projectType}` : '';
      return fetchWithTimeout(`${BASE_URL}/api/projects${qs}`, 10000, signal).then(r => checkResponse<Tag[]>(r));
    },

    entries: (projectId: string, researchType?: string, signal?: AbortSignal) => {
      const qs = researchType ? `?research_type=${researchType}` : '';
      return fetchWithTimeout(`${BASE_URL}/api/projects/${projectId}/entries${qs}`, 10000, signal).then(r => checkResponse<Entry[]>(r));
    },
  },
};
