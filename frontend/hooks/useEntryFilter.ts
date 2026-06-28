'use client';
import { useState, useMemo, useCallback } from 'react';
import type { Entry, EntryFilter } from '@/types';

interface UseEntryFilterReturn {
  searchQuery: string;
  activeFilter: EntryFilter;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: EntryFilter) => void;
  toggleFilter: (filter: EntryFilter) => void;
  clearFilter: () => void;
  filteredEntries: (entries: Entry[]) => Entry[];
}

export function useEntryFilter(): UseEntryFilterReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EntryFilter>(null);

  const toggleFilter = useCallback((filter: EntryFilter) => {
    setActiveFilter(prev => {
      if (prev && filter && prev.type === filter.type && prev.id === filter.id) {
        return null;
      }
      return filter;
    });
  }, []);

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
    setSearchQuery('');
  }, []);

  const filteredEntries = useCallback((entries: Entry[]): Entry[] => {
    return entries.filter(e => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inTopic = e.topic.toLowerCase().includes(q);
        const inInsight = e.insight.toLowerCase().includes(q);
        const inSummary = e.summary?.toLowerCase().includes(q);
        const inTags = e.custom_tags?.some(t => t.toLowerCase().includes(q));
        if (!inTopic && !inInsight && !inSummary && !inTags) return false;
      }

      // Type filter
      if (!activeFilter) return true;
      if (activeFilter.type === 'research') return e.research_type === activeFilter.id;
      if (activeFilter.type === 'project') return e.project_tag_id === activeFilter.id;
      if (activeFilter.type === 'tag') {
        return e.topic_tag_id === activeFilter.id || e.related_tag_ids?.includes(activeFilter.id);
      }
      return true;
    });
  }, [searchQuery, activeFilter]);

  return {
    searchQuery,
    activeFilter,
    setSearchQuery,
    setActiveFilter,
    toggleFilter,
    clearFilter,
    filteredEntries,
  };
}
