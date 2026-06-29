'use client';

import { useReducer, useCallback } from 'react';
import type {
  EnhancedGraphNode,
  EnhancedGraphEdge,
  EnhancedGraphData,
  EnhancedGraphFilter,
  EnhancedGraphViewType,
  EnhancedViewConfig,
  EdgeTypeFilter,
  EnhancedTimeRangePreset,
  Entry,
  ResearchType,
  EnhancedGraphCluster,
} from '@/types/graph';

// ==================== 类型定义 ====================

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  clusterCount: number;
  avgDegree: number;
  avgEnergy: number;
  density: number;
}

export interface NeighborResult {
  nodes: EnhancedGraphNode[];
  edges: EnhancedGraphEdge[];
}

interface GraphStateData {
  graphData: EnhancedGraphData | null;
  filteredData: EnhancedGraphData | null;
  error: string | null;
  loading: boolean;
  stats: GraphStats;
}

interface GraphStateInteraction {
  selectedNode: EnhancedGraphNode | null;
  neighborNodes: NeighborResult | null;
  hoveredNode: EnhancedGraphNode | null;
  entryDetail: Entry | null;
  searchQuery: string;
  matchedNodeIds: Set<number>;
}

interface GraphStateView {
  viewType: EnhancedGraphViewType;
  viewConfig: EnhancedViewConfig;
  filter: EnhancedGraphFilter;
  showClusterPanel: boolean;
  edgeTypeFilter: EdgeTypeFilter;
  galaxyCenterId: number | null;
  topK: number;
  showFps: boolean;
  currentFps: number;
}

export interface GraphState {
  data: GraphStateData;
  interaction: GraphStateInteraction;
  view: GraphStateView;
}

// ==================== 常量 ====================

const DEFAULT_FILTER: EnhancedGraphFilter = {
  minEdgeWeight: 0.1,
};

const DEFAULT_VIEW_CONFIG: EnhancedViewConfig = {
  type: 'force',
  zoom: 1,
  center: { x: 0, y: 0 },
  showEdges: true,
  showLabels: false,
  showClusters: true,
  showArrows: false,
};

const INITIAL_STATS: GraphStats = {
  nodeCount: 0,
  edgeCount: 0,
  clusterCount: 0,
  avgDegree: 0,
  avgEnergy: 0,
  density: 0,
};

const INITIAL_STATE: GraphState = {
  data: {
    graphData: null,
    filteredData: null,
    error: null,
    loading: true,
    stats: INITIAL_STATS,
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
    viewConfig: DEFAULT_VIEW_CONFIG,
    filter: DEFAULT_FILTER,
    showClusterPanel: false,
    edgeTypeFilter: 'all',
    galaxyCenterId: null,
    topK: 80,
    showFps: false,
    currentFps: 0,
  },
};

// ==================== Action Types ====================

type GraphAction =
  // Data
  | { type: 'SET_GRAPH_DATA'; payload: EnhancedGraphData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERED_DATA'; payload: EnhancedGraphData | null }
  | { type: 'SET_STATS'; payload: GraphStats }

  // Interaction
  | { type: 'SELECT_NODE'; payload: { node: EnhancedGraphNode | null; neighbors: NeighborResult | null } }
  | { type: 'HOVER_NODE'; payload: EnhancedGraphNode | null }
  | { type: 'SET_ENTRY_DETAIL'; payload: Entry | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_MATCHED_IDS'; payload: Set<number> }
  | { type: 'CLEAR_INTERACTION' }

  // View
  | { type: 'SET_VIEW_TYPE'; payload: EnhancedGraphViewType }
  | { type: 'SET_VIEW_CONFIG'; payload: EnhancedViewConfig }
  | { type: 'UPDATE_VIEW_CONFIG'; payload: Partial<EnhancedViewConfig> }
  | { type: 'SET_FILTER'; payload: EnhancedGraphFilter }
  | { type: 'UPDATE_FILTER'; payload: Partial<EnhancedGraphFilter> }
  | { type: 'TOGGLE_CLUSTER_PANEL' }
  | { type: 'SET_EDGE_TYPE_FILTER'; payload: EdgeTypeFilter }
  | { type: 'SET_GALAXY_CENTER'; payload: number | null }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_TOP_K'; payload: number }
  | { type: 'SET_SHOW_FPS'; payload: boolean }
  | { type: 'SET_CURRENT_FPS'; payload: number };

// ==================== Reducer ====================

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    // Data
    case 'SET_GRAPH_DATA':
      return { ...state, data: { ...state.data, graphData: action.payload } };
    case 'SET_LOADING':
      return { ...state, data: { ...state.data, loading: action.payload } };
    case 'SET_ERROR':
      return { ...state, data: { ...state.data, error: action.payload } };
    case 'SET_FILTERED_DATA':
      return { ...state, data: { ...state.data, filteredData: action.payload } };
    case 'SET_STATS':
      return { ...state, data: { ...state.data, stats: action.payload } };

    // Interaction
    case 'SELECT_NODE':
      return {
        ...state,
        interaction: {
          ...state.interaction,
          selectedNode: action.payload.node,
          neighborNodes: action.payload.neighbors,
        },
      };
    case 'HOVER_NODE':
      return { ...state, interaction: { ...state.interaction, hoveredNode: action.payload } };
    case 'SET_ENTRY_DETAIL':
      return { ...state, interaction: { ...state.interaction, entryDetail: action.payload } };
    case 'SET_SEARCH_QUERY':
      return { ...state, interaction: { ...state.interaction, searchQuery: action.payload } };
    case 'SET_MATCHED_IDS':
      return { ...state, interaction: { ...state.interaction, matchedNodeIds: action.payload } };
    case 'CLEAR_INTERACTION':
      return {
        ...state,
        interaction: {
          ...state.interaction,
          selectedNode: null,
          neighborNodes: null,
          entryDetail: null,
          searchQuery: '',
          matchedNodeIds: new Set(),
        },
      };

    // View
    case 'SET_VIEW_TYPE':
      return { ...state, view: { ...state.view, viewType: action.payload } };
    case 'SET_VIEW_CONFIG':
      return { ...state, view: { ...state.view, viewConfig: action.payload } };
    case 'UPDATE_VIEW_CONFIG':
      return { ...state, view: { ...state.view, viewConfig: { ...state.view.viewConfig, ...action.payload } } };
    case 'SET_FILTER':
      return { ...state, view: { ...state.view, filter: action.payload } };
    case 'UPDATE_FILTER':
      return { ...state, view: { ...state.view, filter: { ...state.view.filter, ...action.payload } } };
    case 'TOGGLE_CLUSTER_PANEL':
      return { ...state, view: { ...state.view, showClusterPanel: !state.view.showClusterPanel } };
    case 'SET_EDGE_TYPE_FILTER':
      return { ...state, view: { ...state.view, edgeTypeFilter: action.payload } };
    case 'SET_GALAXY_CENTER':
      return { ...state, view: { ...state.view, galaxyCenterId: action.payload } };
    case 'CLEAR_FILTERS':
      return {
        ...state,
        view: {
          ...state.view,
          filter: DEFAULT_FILTER,
          galaxyCenterId: null,
        },
        interaction: {
          ...state.interaction,
          searchQuery: '',
          matchedNodeIds: new Set(),
        },
      };
    case 'SET_TOP_K':
      return { ...state, view: { ...state.view, topK: action.payload } };
    case 'SET_SHOW_FPS':
      return { ...state, view: { ...state.view, showFps: action.payload } };
    case 'SET_CURRENT_FPS':
      return { ...state, view: { ...state.view, currentFps: action.payload } };

    default:
      return state;
  }
}

// ==================== Hook ====================

export function useGraphState() {
  const [state, dispatch] = useReducer(graphReducer, INITIAL_STATE);

  const setGraphData = useCallback((data: EnhancedGraphData) => dispatch({ type: 'SET_GRAPH_DATA', payload: data }), []);
  const setLoading = useCallback((loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }), []);
  const setError = useCallback((error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }), []);
  const setFilteredData = useCallback((data: EnhancedGraphData | null) =>
    dispatch({ type: 'SET_FILTERED_DATA', payload: data }), []);
  const setStats = useCallback((stats: GraphStats) => dispatch({ type: 'SET_STATS', payload: stats }), []);

  const selectNode = useCallback((node: EnhancedGraphNode | null, neighbors: NeighborResult | null) =>
    dispatch({ type: 'SELECT_NODE', payload: { node, neighbors } }), []);
  const hoverNode = useCallback((node: EnhancedGraphNode | null) =>
    dispatch({ type: 'HOVER_NODE', payload: node }), []);
  const setEntryDetail = useCallback((entry: Entry | null) =>
    dispatch({ type: 'SET_ENTRY_DETAIL', payload: entry }), []);
  const setSearchQuery = useCallback((query: string) =>
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query }), []);
  const setMatchedIds = useCallback((ids: Set<number>) =>
    dispatch({ type: 'SET_MATCHED_IDS', payload: ids }), []);
  const clearInteraction = useCallback(() => dispatch({ type: 'CLEAR_INTERACTION' }), []);

  const setViewType = useCallback((vt: EnhancedGraphViewType) =>
    dispatch({ type: 'SET_VIEW_TYPE', payload: vt }), []);
  const setViewConfig = useCallback((vc: EnhancedViewConfig) =>
    dispatch({ type: 'SET_VIEW_CONFIG', payload: vc }), []);
  const updateViewConfig = useCallback((vc: Partial<EnhancedViewConfig>) =>
    dispatch({ type: 'UPDATE_VIEW_CONFIG', payload: vc }), []);
  const setFilter = useCallback((f: EnhancedGraphFilter) =>
    dispatch({ type: 'SET_FILTER', payload: f }), []);
  const updateFilter = useCallback((f: Partial<EnhancedGraphFilter>) =>
    dispatch({ type: 'UPDATE_FILTER', payload: f }), []);
  const toggleClusterPanel = useCallback(() => dispatch({ type: 'TOGGLE_CLUSTER_PANEL' }), []);
  const setEdgeTypeFilter = useCallback((etf: EdgeTypeFilter) =>
    dispatch({ type: 'SET_EDGE_TYPE_FILTER', payload: etf }), []);
  const setGalaxyCenter = useCallback((id: number | null) =>
    dispatch({ type: 'SET_GALAXY_CENTER', payload: id }), []);
  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);
  const setTopK = useCallback((k: number) => dispatch({ type: 'SET_TOP_K', payload: k }), []);
  const setShowFps = useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_FPS', payload: show }), []);
  const setCurrentFps = useCallback((fps: number) => dispatch({ type: 'SET_CURRENT_FPS', payload: fps }), []);

  return {
    state,
    dispatch,
    setGraphData,
    setLoading,
    setError,
    setFilteredData,
    setStats,
    selectNode,
    hoverNode,
    setEntryDetail,
    setSearchQuery,
    setMatchedIds,
    clearInteraction,
    setViewType,
    setViewConfig,
    updateViewConfig,
    setFilter,
    updateFilter,
    toggleClusterPanel,
    setEdgeTypeFilter,
    setGalaxyCenter,
    clearFilters,
    setTopK,
    setShowFps,
    setCurrentFps,
  };
}
