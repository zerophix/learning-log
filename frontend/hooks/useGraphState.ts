"use client";

import { useReducer, useCallback, useMemo } from 'react';

import type {
  EnhancedGraphData,
  EnhancedGraphNode,
  EnhancedGraphEdge,
  EnhancedGraphViewType,
  EnhancedViewConfig,
  EnhancedGraphFilter,
  EdgeTypeFilter,
  EnhancedGraphCluster,
} from '@/types/graph';

import type { Entry, GraphStats } from '@/types';

interface LocalNeighborResult {
  nodes: EnhancedGraphNode[];
  edges: EnhancedGraphEdge[];
}

interface GraphState {
  data: {
    graphData: EnhancedGraphData | null;
    filteredData: EnhancedGraphData | null;
    error: string | null;
    loading: boolean;
    stats: GraphStats;
  };
  interaction: {
    selectedNode: EnhancedGraphNode | null;
    neighborNodes: LocalNeighborResult | null;
    hoveredNode: EnhancedGraphNode | null;
    entryDetail: Entry | null;
    searchQuery: string;
    matchedNodeIds: Set<number>;
  };
  view: {
    viewType: EnhancedGraphViewType;
    viewConfig: EnhancedViewConfig;
    filter: EnhancedGraphFilter;
    showClusterPanel: boolean;
    edgeTypeFilter: EdgeTypeFilter;
    galaxyCenterId: number | null;
    topK: number;
    showFps: boolean;
    currentFps: number;
  };
}

function initialState(): GraphState {
  return {
    data: {
      graphData: null,
      filteredData: null,
      error: null,
      loading: true,
      stats: { nodeCount: 0, edgeCount: 0, clusterCount: 0, avgDegree: 0, avgEnergy: 0, density: 0 },
    },
    interaction: {
      selectedNode: null,
      neighborNodes: null,
      hoveredNode: null,
      entryDetail: null,
      searchQuery: '',
      matchedNodeIds: new Set(),
    },
    view: {
      viewType: 'force',
      viewConfig: { showEdges: true, showLabels: true },
      filter: { researchTypes: [], energyRange: [1, 5] as [number, number], timeRange: undefined },
      showClusterPanel: false,
      edgeTypeFilter: 'all',
      galaxyCenterId: null,
      topK: 80,
      showFps: false,
      currentFps: 0,
    },
  };
}

type GraphAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: EnhancedGraphData | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATS'; payload: GraphStats }
  | { type: 'SET_FILTER'; payload: EnhancedGraphFilter }
  | { type: 'SET_VIEW_TYPE'; payload: EnhancedGraphViewType }
  | { type: 'SET_VIEW_CONFIG'; payload: EnhancedViewConfig }
  | { type: 'SET_SHOW_CLUSTER_PANEL'; payload: boolean }
  | { type: 'SET_EDGE_TYPE_FILTER'; payload: EdgeTypeFilter }
  | { type: 'SET_GALAXY_CENTER_ID'; payload: number | null }
  | { type: 'SET_SELECTED_NODE'; payload: EnhancedGraphNode | null }
  | { type: 'SET_NEIGHBOR_NODES'; payload: { nodes: EnhancedGraphNode[]; edges: EnhancedGraphEdge[] } | null }
  | { type: 'SET_HOVERED_NODE'; payload: EnhancedGraphNode | null }
  | { type: 'SET_ENTRY_DETAIL'; payload: Entry | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_MATCHED_NODE_IDS'; payload: Set<number> }
  | { type: 'CLEAR_INTERACTION' }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'RESET_STATE' }
  | { type: 'SET_FILTERED_DATA'; payload: EnhancedGraphData | null }
  | { type: 'SET_TOP_K'; payload: number }
  | { type: 'SET_SHOW_FPS'; payload: boolean }
  | { type: 'SET_CURRENT_FPS'; payload: number };

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, data: { ...state.data, loading: action.payload } };

    case 'SET_DATA':
      return {
        ...state,
        data: {
          ...state.data,
          graphData: action.payload,
          filteredData: action.payload ? state.data.filteredData : null,
        },
      };

    case 'SET_ERROR':
      return { ...state, data: { ...state.data, error: action.payload } };

    case 'SET_STATS':
      return { ...state, data: { ...state.data, stats: action.payload } };

    case 'SET_FILTER':
      return { ...state, view: { ...state.view, filter: action.payload } };

    case 'SET_VIEW_TYPE':
      return { ...state, view: { ...state.view, viewType: action.payload } };

    case 'SET_VIEW_CONFIG':
      return { ...state, view: { ...state.view, viewConfig: action.payload } };

    case 'SET_SHOW_CLUSTER_PANEL':
      return { ...state, view: { ...state.view, showClusterPanel: action.payload } };

    case 'SET_EDGE_TYPE_FILTER':
      return { ...state, view: { ...state.view, edgeTypeFilter: action.payload } };

    case 'SET_GALAXY_CENTER_ID':
      return { ...state, view: { ...state.view, galaxyCenterId: action.payload } };

    case 'SET_SELECTED_NODE':
      return { ...state, interaction: { ...state.interaction, selectedNode: action.payload } };

    case 'SET_NEIGHBOR_NODES':
      return { ...state, interaction: { ...state.interaction, neighborNodes: action.payload } };

    case 'SET_HOVERED_NODE':
      return { ...state, interaction: { ...state.interaction, hoveredNode: action.payload } };

    case 'CLEAR_INTERACTION':
      return {
        ...state,
        interaction: {
          selectedNode: null,
          neighborNodes: null,
          hoveredNode: null,
          entryDetail: null,
          searchQuery: '',
          matchedNodeIds: new Set(),
        },
      };

    case 'SET_ENTRY_DETAIL':
      return { ...state, interaction: { ...state.interaction, entryDetail: action.payload } };

    case 'SET_SEARCH_QUERY':
      return { ...state, interaction: { ...state.interaction, searchQuery: action.payload } };

    case 'SET_MATCHED_NODE_IDS':
      return { ...state, interaction: { ...state.interaction, matchedNodeIds: action.payload } };

    case 'SET_FILTERED_DATA':
      return { ...state, data: { ...state.data, filteredData: action.payload } };

    case 'SET_TOP_K':
      return { ...state, view: { ...state.view, topK: action.payload } };

    case 'SET_SHOW_FPS':
      return { ...state, view: { ...state.view, showFps: action.payload } };

    case 'SET_CURRENT_FPS':
      return { ...state, view: { ...state.view, currentFps: action.payload } };

    case 'CLEAR_FILTERS': {
      const resetState = initialState();
      return {
        ...state,
        data: {
          ...state.data,
          loading: false,
          graphData: state.data.graphData,
          filteredData: state.data.graphData,
        },
        view: { ...resetState.view },
        interaction: { ...resetState.interaction },
      };
    }

    case 'RESET_STATE':
      return initialState();

    default:
      return state;
  }
}

export function useGraphState() {
  const [state, dispatch] = useReducer(graphReducer, null, initialState);

  const setFilter = useCallback((filter: EnhancedGraphFilter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const setViewType = useCallback((viewType: EnhancedGraphViewType) => {
    dispatch({ type: 'SET_VIEW_TYPE', payload: viewType });
  }, []);

  const setViewConfig = useCallback((config: EnhancedViewConfig) => {
    dispatch({ type: 'SET_VIEW_CONFIG', payload: config });
  }, []);

  const setShowClusterPanel = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_CLUSTER_PANEL', payload: show });
  }, []);

  const setEdgeTypeFilter = useCallback((filter: EdgeTypeFilter) => {
    dispatch({ type: 'SET_EDGE_TYPE_FILTER', payload: filter });
  }, []);

  const setGalaxyCenterId = useCallback((id: number | null) => {
    dispatch({ type: 'SET_GALAXY_CENTER_ID', payload: id });
  }, []);

  const setSelectedNode = useCallback((node: EnhancedGraphNode | null) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: node });
  }, []);

  const setNeighborNodes = useCallback((neighbors: { nodes: EnhancedGraphNode[]; edges: EnhancedGraphEdge[] } | null) => {
    dispatch({ type: 'SET_NEIGHBOR_NODES', payload: neighbors });
  }, []);

  const setHoveredNode = useCallback((node: EnhancedGraphNode | null) => {
    dispatch({ type: 'SET_HOVERED_NODE', payload: node });
  }, []);

  const setEntryDetail = useCallback((entry: Entry | null) => {
    dispatch({ type: 'SET_ENTRY_DETAIL', payload: entry });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setMatchedNodeIds = useCallback((ids: Set<number>) => {
    dispatch({ type: 'SET_MATCHED_NODE_IDS', payload: ids });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const filteredData = useMemo(() => {
    if (!state.data.graphData) return null;

    const { nodes, triggers, jumps, edges } = state.data.graphData;
    let filteredNodes = nodes.filter(node => {
      if (state.view.filter.researchTypes && state.view.filter.researchTypes.length > 0 && !state.view.filter.researchTypes.includes(node.research_type)) {
        return false;
      }
      if (state.view.filter.energyRange && (node.energy < state.view.filter.energyRange[0] || node.energy > state.view.filter.energyRange[1])) {
        return false;
      }
      if (state.view.filter.timeRange !== null && state.view.filter.timeRange !== undefined) {
        const tr = state.view.filter.timeRange;
        if ('days' in tr && tr.days) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - tr.days);
          if (new Date(node.timestamp) < cutoff) return false;
        }
      }
      return true;
    });

    const nodeHasEdgeType = (n: EnhancedGraphNode): boolean => {
      switch (state.view.edgeTypeFilter) {
        case 'trigger':
          return triggers.some(t => t.source === n.id || t.target === n.id);
        case 'concept_jump':
          return jumps.some(j => j.source === n.id || j.target === n.id);
        case 'content':
        case 'tags':
        case 'temporal':
          return edges.some(e => e.type === state.view.edgeTypeFilter && (e.source === n.id || e.target === n.id));
        default:
          return true;
      }
    };

    if (state.view.edgeTypeFilter !== 'all') {
      filteredNodes = filteredNodes.filter(nodeHasEdgeType);
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e =>
      filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    return {
      nodes: filteredNodes,
      triggers: triggers.filter(t => filteredNodeIds.has(t.source) && filteredNodeIds.has(t.target)),
      jumps: jumps.filter(j => filteredNodeIds.has(j.source) && filteredNodeIds.has(j.target)),
      edges: filteredEdges,
      clusters: state.data.graphData.clusters,
      weights: state.data.graphData.weights,
      entry_count: state.data.graphData.entry_count,
    };
  }, [state.data.graphData, state.view.filter, state.view.edgeTypeFilter]);

  const hasActiveFilters = useMemo(() => {
    return (
      (state.view.filter.researchTypes?.length ?? 0) > 0 ||
      (state.view.filter.energyRange !== undefined) ||
      state.view.filter.timeRange !== null ||
      state.view.edgeTypeFilter !== 'all'
    );
  }, [state.view.filter, state.view.edgeTypeFilter]);

  const setGraphData = useCallback((data: EnhancedGraphData | null) => {
    dispatch({ type: 'SET_DATA', payload: data });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setFilteredData = useCallback((data: EnhancedGraphData | null) => {
    dispatch({ type: 'SET_FILTERED_DATA', payload: data });
  }, []);

  const setStats = useCallback((stats: GraphStats) => {
    dispatch({ type: 'SET_STATS', payload: stats });
  }, []);

  const selectNode = useCallback((node: EnhancedGraphNode | null) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: node });
    if (!node) {
      dispatch({ type: 'SET_NEIGHBOR_NODES', payload: null });
    }
  }, []);

  const hoverNode = useCallback((node: EnhancedGraphNode | null) => {
    dispatch({ type: 'SET_HOVERED_NODE', payload: node });
  }, []);

  const setMatchedIds = useCallback((ids: Set<number>) => {
    dispatch({ type: 'SET_MATCHED_NODE_IDS', payload: ids });
  }, []);

  const clearInteraction = useCallback(() => {
    dispatch({ type: 'CLEAR_INTERACTION' });
  }, []);

  const updateViewConfig = useCallback((updater: (prev: EnhancedViewConfig) => EnhancedViewConfig) => {
    dispatch({ type: 'SET_VIEW_CONFIG', payload: updater(state.view.viewConfig) });
  }, [state.view.viewConfig]);

  const updateFilter = useCallback((updater: (prev: EnhancedGraphFilter) => EnhancedGraphFilter) => {
    dispatch({ type: 'SET_FILTER', payload: updater(state.view.filter) });
  }, [state.view.filter]);

  const toggleClusterPanel = useCallback(() => {
    dispatch({ type: 'SET_SHOW_CLUSTER_PANEL', payload: !state.view.showClusterPanel });
  }, [state.view.showClusterPanel]);

  const setGalaxyCenter = useCallback((id: number | null) => {
    dispatch({ type: 'SET_GALAXY_CENTER_ID', payload: id });
  }, []);

  const setTopK = useCallback((k: number) => {
    dispatch({ type: 'SET_TOP_K', payload: k });
  }, []);

  const setShowFps = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_FPS', payload: show });
  }, []);

  const setCurrentFps = useCallback((fps: number) => {
    dispatch({ type: 'SET_CURRENT_FPS', payload: fps });
  }, []);

  return {
    state,
    setFilter,
    setViewType,
    setViewConfig,
    setShowClusterPanel,
    setEdgeTypeFilter,
    setGalaxyCenterId,
    setSelectedNode,
    setNeighborNodes,
    setHoveredNode,
    setEntryDetail,
    setSearchQuery,
    setMatchedNodeIds,
    clearFilters,
    resetState,
    filteredData,
    hasActiveFilters,
    setGraphData,
    setLoading,
    setError,
    setFilteredData,
    setStats,
    selectNode,
    hoverNode,
    setMatchedIds,
    clearInteraction,
    updateViewConfig,
    updateFilter,
    toggleClusterPanel,
    setGalaxyCenter,
    setTopK,
    setShowFps,
    setCurrentFps,
  };
}