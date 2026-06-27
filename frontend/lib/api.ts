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
} from '@/types';

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
    list: (limit = 50, offset = 0) =>
      fetch(`${BASE_URL}/api/entries?limit=${limit}&offset=${offset}`).then(r => checkResponse<Entry[]>(r)),

    get: (id: number) =>
      fetch(`${BASE_URL}/api/entries/${id}`).then(r => checkResponse<Entry>(r)),

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

    feed: (params?: FeedParams) => {
      if (!params || Object.keys(params).length === 0) {
        return fetch(`${BASE_URL}/api/entries/feed`).then(r => checkResponse<Entry[]>(r));
      }
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
      ).toString();
      return fetch(`${BASE_URL}/api/entries/feed?${qs}`).then(r => checkResponse<Entry[]>(r));
    },
  },

  tags: {
    list: (category?: string) => {
      const qs = category ? `?category=${category}` : '';
      return fetch(`${BASE_URL}/api/tags${qs}`).then(r => checkResponse<Tag[]>(r));
    },

    tree: () =>
      fetch(`${BASE_URL}/api/tags/tree`).then(r => checkResponse<TagNode[]>(r)),

    entries: (tagId: string, researchType?: string) => {
      const qs = researchType ? `?research_type=${researchType}` : '';
      return fetch(`${BASE_URL}/api/tags/${tagId}/entries${qs}`).then(r => checkResponse<Entry[]>(r));
    },
  },

  tagLinks: {
    list: (sourceTagId?: string) => {
      const qs = sourceTagId ? `?source_tag_id=${sourceTagId}` : '';
      return fetch(`${BASE_URL}/api/tag-links${qs}`).then(r => checkResponse<TagLink[]>(r));
    },
  },

  graph: () =>
    fetch(`${BASE_URL}/api/graph`).then(r => checkResponse<GraphData>(r)),

  stats: () =>
    fetch(`${BASE_URL}/api/stats`).then(r => checkResponse<Stats>(r)),

  projects: {
    list: (projectType?: string) => {
      const qs = projectType ? `?project_type=${projectType}` : '';
      return fetch(`${BASE_URL}/api/projects${qs}`).then(r => checkResponse<Tag[]>(r));
    },

    entries: (projectId: string, researchType?: string) => {
      const qs = researchType ? `?research_type=${researchType}` : '';
      return fetch(`${BASE_URL}/api/projects/${projectId}/entries${qs}`).then(r => checkResponse<Entry[]>(r));
    },
  },
};
