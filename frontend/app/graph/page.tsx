'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import EntryDetail from '@/components/entry/EntryDetail';
import GraphLegend from '@/components/graph/GraphLegend';
import ClusterPanel from '@/components/graph/ClusterPanel';
import NodeDetailPanel from '@/components/graph/NodeDetailPanel';
import GraphToolbar from '@/components/graph/GraphToolbar';
import {
  transformAttentionGraph,
  applyFilter,
  searchNodes,
  getNeighborNodes,
  calculateGraphStats,
  getClusterColor,
} from '@/lib/graph-utils';
import {
  createForceGraphOption,
  createTimelineOption,
  createGalaxyOption,
} from '@/lib/graph-echarts-options';
import { useGraphState } from '@/hooks/useGraphState';
import { useGraphPreferences } from '@/hooks/useGraphPreferences';
import type {
  EnhancedGraphNode,
  EnhancedGraphData,
  EnhancedGraphViewType,
  EnhancedGraphFilter,
  EdgeTypeFilter,
  EnhancedTimeRangePreset,
} from '@/types/graph';
import type { ResearchType } from '@/types';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { IconNetwork, IconHourglass, IconEmpty } from '@/components/ui/Icons';

export default function GraphPage() {
  const {
    state,
    setGraphData, setLoading, setError, setFilteredData, setStats,
    selectNode, hoverNode, setEntryDetail, setSearchQuery, setMatchedIds,
    clearInteraction,
    setViewType, updateViewConfig, updateFilter, toggleClusterPanel,
    setEdgeTypeFilter, setGalaxyCenter, setNeighborNodes,
    clearFilters, setTopK, setShowFps, setCurrentFps,
    hasActiveFilters,
  } = useGraphState();

  const { graphData, error, loading, stats } = state.data;
  const { selectedNode, neighborNodes, hoveredNode, entryDetail, searchQuery, matchedNodeIds } = state.interaction;
  const { viewType, viewConfig, filter, showClusterPanel, edgeTypeFilter, galaxyCenterId, topK, showFps, currentFps } = state.view;

  const { init: initPrefs, persist: persistPrefs } = useGraphPreferences();

  // 加载偏好设置
  useEffect(() => {
    const prefs = initPrefs();
    if (prefs.viewType) setViewType(prefs.viewType);
    if (prefs.showEdges !== undefined) updateViewConfig(prev => ({ ...prev, showEdges: prefs.showEdges as boolean }));
    if (prefs.showLabels !== undefined) updateViewConfig(prev => ({ ...prev, showLabels: prefs.showLabels as boolean }));
    if (prefs.edgeTypeFilter) setEdgeTypeFilter(prefs.edgeTypeFilter);
    if (prefs.topK) setTopK(prefs.topK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 持久化偏好
  useEffect(() => {
    persistPrefs({
      viewType,
      showEdges: viewConfig.showEdges,
      showLabels: viewConfig.showLabels,
      edgeTypeFilter,
      topK,
    });
  }, [viewType, viewConfig.showEdges, viewConfig.showLabels, edgeTypeFilter, topK, persistPrefs]);

  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // FPS 监控
  useEffect(() => {
    if (!showFps) {
      setCurrentFps(0);
      clearInterval(fpsIntervalRef.current);
      return;
    }
    let animId: number;
    const tick = () => { frameCountRef.current++; animId = requestAnimationFrame(tick); };
    animId = requestAnimationFrame(tick);
    fpsIntervalRef.current = setInterval(() => {
      setCurrentFps(frameCountRef.current * 2);
      frameCountRef.current = 0;
    }, 500);
    return () => {
      cancelAnimationFrame(animId);
      clearInterval(fpsIntervalRef.current);
    };
  }, [showFps, setCurrentFps]);

  const chartRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<echarts.ECharts | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nodeMapRef = useRef<Map<number, EnhancedGraphNode>>(new Map());
  const fetchAbortRef = useRef<AbortController | null>(null);
  const handleNodeClickRef = useRef<(node: EnhancedGraphNode) => void>();
  const setHoveredNodeRef = useRef<(node: EnhancedGraphNode | null) => void>();
  const setGalaxyCenterRef = useRef<(id: number) => void>();
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  // ==================== 数据加载 ====================

  const loadGraph = useCallback((signal: AbortSignal, customTopK?: number) => {
    setLoading(true);
    const k = customTopK || topK;
    api.attention({ top_k: k }, signal)
      .then(data => {
        const transformed = transformAttentionGraph(data);
        setGraphData(transformed);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message || '加载图谱失败');
        setLoading(false);
      });
  }, [topK, setLoading, setGraphData, setError]);

  useEffect(() => {
    setGraphData(null);
    setError(null);
    selectNode(null);
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    loadGraph(controller.signal);
    return () => {
      controller.abort();
      if (fetchAbortRef.current === controller) fetchAbortRef.current = null;
    };
  }, [loadGraph, setGraphData, setError, selectNode]);

  // ==================== 键盘快捷键 ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearInteraction();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === '1') setViewType('force');
      if (e.key === '2') setViewType('timeline');
      if (e.key === '3') setViewType('galaxy');
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;
        loadGraph(controller.signal);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadGraph, clearInteraction, setViewType]);

  // ==================== 数据筛选 ====================

  const filteredData = useMemo(() => {
    if (!graphData) return null;

    const { nodes, edges } = applyFilter(graphData.nodes, graphData.edges, filter);
    const filteredNodeIds = new Set(nodes.map(n => n.id));
    const filtered: EnhancedGraphData = {
      nodes,
      edges,
      triggers: graphData.triggers.filter(t =>
        filteredNodeIds.has(t.source) && filteredNodeIds.has(t.target)
      ),
      jumps: graphData.jumps.filter(j =>
        filteredNodeIds.has(j.source) && filteredNodeIds.has(j.target)
      ),
      clusters: graphData.clusters.map(c => ({
        ...c,
        nodes: c.nodes.filter(id => nodes.some(n => n.id === id)),
        count: c.nodes.filter(id => nodes.some(n => n.id === id)).length,
      })).filter(c => c.nodes.length > 0),
      weights: graphData.weights,
      entry_count: graphData.entry_count,
    };

    // 计算统计信息
    const s = calculateGraphStats(filtered.nodes, filtered.edges, filtered.clusters);
    setStats(s);

    return filtered;
  }, [graphData, filter, setStats]);

  // ==================== 搜索处理 ====================

  useEffect(() => {
    if (!graphData || !searchQuery.trim()) {
      setMatchedIds(new Set());
      return;
    }

    const matched = searchNodes(graphData.nodes, {
      query: searchQuery,
      searchTitle: true,
      searchSummary: true,
      searchTags: true,
    });
    setMatchedIds(matched);
  }, [graphData, searchQuery, setMatchedIds]);

  // ==================== 事件处理 ====================

  const handleNodeClick = useCallback((node: EnhancedGraphNode) => {
    selectNode(node);
    const neighbors = getNeighborNodes(node.id, filteredData?.nodes || [], filteredData?.edges || [], 1);
    setNeighborNodes(neighbors);
  }, [filteredData, selectNode, setNeighborNodes]);

  const openEntry = async (id: number) => {
    try {
      const entry = await api.entries.get(id);
      setEntryDetail(entry);
    } catch { /* ignore */ }
  };

  const handleViewChange = (type: EnhancedGraphViewType) => {
    setViewType(type);
    updateViewConfig(prev => ({ ...prev, type }));
    if (type !== 'galaxy') {
      setGalaxyCenter(null);
    }
  };

  const setGalaxyFocus = (nodeId: number) => {
    setGalaxyCenter(nodeId);
    setViewType('galaxy');
    updateViewConfig(prev => ({ ...prev, type: 'galaxy' }));
  };

  // 简化版 filter handler (兼容 GraphToolbar 的简单值传递)
  const handleFilterResearchType = (val: string) => {
    updateFilter(prev => ({
      ...prev,
      researchTypes: val ? [val as ResearchType] : [],
    }));
  };

  const handleFilterEnergy = (val: string) => {
    updateFilter(prev => ({
      ...prev,
      energyRange: val ? val.split('-').map(Number) as [number, number] : undefined,
    }));
  };

  const handleFilterTime = (val: string) => {
    updateFilter(prev => ({
      ...prev,
      timeRange: val ? { type: val as EnhancedTimeRangePreset } : undefined,
    }));
  };

  const toggleEdgeVisibility = () => {
    updateViewConfig(prev => ({ ...prev, showEdges: !prev.showEdges }));
  };

  const toggleLabelVisibility = () => {
    updateViewConfig(prev => ({ ...prev, showLabels: !prev.showLabels }));
  };

  const handleClearFilters = () => {
    clearFilters();
    setSearchQuery('');
    setMatchedIds(new Set());
    setGalaxyCenter(null);
  };

  const handleRefresh = () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    loadGraph(controller.signal);
  };

  // 保持 ref 与最新回调同步
  handleNodeClickRef.current = handleNodeClick;
  setHoveredNodeRef.current = hoverNode;
  setGalaxyCenterRef.current = setGalaxyCenter;

  // ==================== ECharts 懒初始化 + 更新 ====================

  useEffect(() => {
    if (!chartRef.current) return;
    if (!echartsRef.current) {
      const chart = echarts.init(chartRef.current, 'dark');
      echartsRef.current = chart;

      chart.on('click', (params) => {
        if (params.dataType === 'node') {
          const nodeData = params.data as { id?: string | number };
          const node = nodeMapRef.current.get(Number(nodeData.id));
          if (!node) return;
          handleNodeClickRef.current?.(node);
        }
      });

      chart.on('mouseover', (params) => {
        if (params.dataType === 'node') {
          const nodeData = params.data as { id?: string | number };
          const node = nodeMapRef.current.get(Number(nodeData.id));
          if (node) setHoveredNodeRef.current?.(node);
        }
      });

      chart.on('mouseout', () => {
        setHoveredNodeRef.current?.(null);
      });

      chart.on('contextmenu', (params) => {
        if (params.dataType === 'node') {
          const evt = params.event as unknown as { event: Event };
          evt.event.preventDefault();
          const nodeData = params.data as { id?: string | number };
          const node = nodeMapRef.current.get(Number(nodeData.id));
          if (node) {
            setGalaxyCenterRef.current?.(node.id);
          }
        }
      });

      const handleResize = () => { chart.resize(); };
      resizeHandlerRef.current = handleResize;
      window.addEventListener('resize', handleResize);
    }

    const chart = echartsRef.current;
    if (!chart || !filteredData || filteredData.nodes.length < 2) return;

    const nodeMap = new Map<number, EnhancedGraphNode>(filteredData.nodes.map(n => [n.id, n]));
    nodeMapRef.current = nodeMap;

    const degrees = filteredData.nodes.map(n => n.degree);
    const maxDeg = Math.max(...degrees, 1);
    const width = chartRef.current?.offsetWidth || 800;
    const height = chartRef.current?.offsetHeight || 600;

    let option: EChartsOption;
    switch (viewType) {
      case 'timeline':
        option = createTimelineOption({ data: filteredData, nodeMap, maxDeg, width, height, showEdges: viewConfig.showEdges });
        break;
      case 'galaxy':
        option = createGalaxyOption({
          data: filteredData, nodeMap, maxDeg, width, height,
          galaxyCenterId, showLabels: viewConfig.showLabels, showEdges: viewConfig.showEdges,
        });
        break;
      case 'force':
      default:
        option = createForceGraphOption({
          data: filteredData, nodeMap, maxDeg,
          showLabels: viewConfig.showLabels, showEdges: viewConfig.showEdges,
          matchedNodeIds, selectedNode, hoveredNode, neighborNodes,
          edgeTypeFilter,
        });
        break;
    }

    chart.setOption(option, true);

    // Surge 节点脉冲动画
    clearInterval(pulseIntervalRef.current);
    const surgeNodes = filteredData.nodes.filter(n => n.is_surge);
    if (surgeNodes.length > 0) {
      let pulseOn = false;
      pulseIntervalRef.current = setInterval(() => {
        pulseOn = !pulseOn;
        chart.setOption({
          series: [{
            data: surgeNodes.map(n => ({
              id: String(n.id),
              itemStyle: {
                shadowBlur: pulseOn ? 30 : 14,
                borderWidth: pulseOn ? 4 : 2,
              },
            })),
          }],
        }, { notMerge: false });
      }, 1000);
    }
  }, [filteredData, viewType, galaxyCenterId, viewConfig.showLabels, viewConfig.showEdges,
      selectedNode, hoveredNode, neighborNodes, matchedNodeIds, edgeTypeFilter, hoverNode]);

  // ECharts 清理
  useEffect(() => {
    return () => {
      clearInterval(pulseIntervalRef.current);
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
      echartsRef.current?.dispose();
      echartsRef.current = null;
    };
  }, []);

  // ==================== 渲染 ====================

  const clusterCounts = useMemo(() => {
    if (!filteredData) return [];
    const counts = new Map<number, number>();
    filteredData.nodes.forEach(n => counts.set(n.cluster_id, (counts.get(n.cluster_id) || 0) + 1));
    return Array.from(counts.entries()).sort(([a], [b]) => a - b);
  }, [filteredData]);

  const clusterList = useMemo(() => {
    if (!filteredData) return [];
    return filteredData.clusters.map(c => ({
      id: c.id,
      label: c.label,
      count: c.count || 0,
      color: getClusterColor(c.id),
    }));
  }, [filteredData]);

  // 过滤条件转换为 GraphToolbar 需要的简单值
  const filterResearchType = filter.researchTypes?.[0];
  const filterEnergyRange = filter.energyRange ? `${filter.energyRange[0]}-${filter.energyRange[1]}` : undefined;
  const filterTimeRange = filter.timeRange?.type;

  const activeFilterCount = hasActiveFilters ? 1 : 0;

  return (
    <div className="page-shell">
      <PageHeader icon={<IconNetwork size={24} />} title="研究图谱">
        <Navigation />
      </PageHeader>

      <div className="content-area">
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* 工具栏 */}
          <GraphToolbar
            viewType={viewType}
            showEdges={viewConfig.showEdges}
            showLabels={viewConfig.showLabels}
            showClusterPanel={showClusterPanel}
            edgeTypeFilter={edgeTypeFilter}
            searchQuery={searchQuery}
            clusterCount={filteredData?.clusters.length || 0}
            hasActiveFilters={!!activeFilterCount}
            filterResearchType={filterResearchType}
            filterEnergyRange={filterEnergyRange}
            filterTimeRange={filterTimeRange}
            onViewChange={handleViewChange}
            onToggleEdges={toggleEdgeVisibility}
            onToggleLabels={toggleLabelVisibility}
            onEdgeTypeFilterChange={setEdgeTypeFilter}
            onSearchChange={setSearchQuery}
            onToggleClusterPanel={toggleClusterPanel}
            onClearFilters={handleClearFilters}
            onRefresh={handleRefresh}
            onFilterResearchType={handleFilterResearchType}
            onFilterEnergy={handleFilterEnergy}
            onFilterTime={handleFilterTime}
          />

          {/* FPS 显示 */}
          {showFps && (
            <div style={{ position: 'absolute', top: 56, right: 8, zIndex: 50, color: 'var(--text-muted)', fontSize: 10 }}>
              {currentFps} FPS
            </div>
          )}

          {/* 图谱主区域 */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* 聚类侧边栏 */}
            {showClusterPanel && filteredData && (
              <ClusterPanel
                clusters={clusterList}
                selectedIds={filter.clusterIds}
                onToggle={(id) => {
                  const current = filter.clusterIds || [];
                  const newIds = current.includes(id)
                    ? current.filter(cid => cid !== id)
                    : [...current, id];
                  updateFilter(prev => ({
                    ...prev,
                    clusterIds: newIds.length > 0 ? newIds : undefined,
                  }));
                }}
              />
            )}

            {/* 图谱容器 */}
            {error ? (
              <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
                <p>{error}</p>
                <button
                  onClick={handleRefresh}
                  style={{
                    marginTop: '12px', padding: '8px 16px',
                    border: '1px solid var(--border-color)', borderRadius: '6px',
                    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  重试
                </button>
              </div>
            ) : loading ? (
              <div className="graph-skeleton">
                <div className="graph-skeleton-circles">
                  <div className="skeleton-node skeleton-node-sm" />
                  <div className="skeleton-node skeleton-node-lg" />
                  <div className="skeleton-node skeleton-node-md" />
                  <div className="skeleton-node skeleton-node-sm" />
                </div>
                <div className="skeleton-text-row">
                  <div className="skeleton-line-wide" style={{ width: '160px' }} />
                  <div className="skeleton-line-wide" style={{ width: '100px', height: '10px' }} />
                </div>
              </div>
            ) : !filteredData || filteredData.nodes.length < 2 ? (
              <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)', textAlign: 'center' }}>
                <IconEmpty size={64} style={{ marginBottom: '16px' }} />
                <p>至少需要 2 条记录才能生成图谱</p>
                {filteredData && filteredData.nodes.length === 0 && graphData && graphData.nodes.length > 0 && (
                  <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    图谱较小，试试放宽筛选条件
                  </p>
                )}
              </div>
            ) : (
              <ErrorBoundary fallback={
                <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
                  图谱渲染异常
                  <button onClick={() => window.location.reload()} style={{ marginLeft: '12px', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    重试
                  </button>
                </div>
              }>
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                  <div ref={chartRef} style={{ flex: 1 }} />

                  <GraphLegend
                    clusterCounts={clusterCounts}
                    nodeCount={stats.nodeCount}
                    edgeCount={stats.edgeCount}
                    clusterCount={stats.clusterCount}
                    matchedCount={matchedNodeIds.size}
                  />

                  {selectedNode && neighborNodes && (
                    <NodeDetailPanel
                      node={selectedNode}
                      neighbors={neighborNodes.nodes}
                      neighborEdges={neighborNodes.edges}
                      onClose={() => { selectNode(null); setNeighborNodes(null); }}
                      onViewDetail={openEntry}
                      onGalaxyFocus={setGalaxyFocus}
                    />
                  )}
                </div>
              </ErrorBoundary>
            )}
          </div>
        </main>

        {entryDetail && (
          <EntryDetail entry={entryDetail} onClose={() => setEntryDetail(null)} />
        )}
      </div>
    </div>
  );
}
