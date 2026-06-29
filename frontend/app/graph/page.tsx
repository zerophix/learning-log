'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import EntryDetail from '@/components/entry/EntryDetail';
import { IconNetwork, IconHourglass, IconEmpty, IconRefresh } from '@/components/ui/Icons';
import GraphLegend from '@/components/graph/GraphLegend';
import ClusterPanel from '@/components/graph/ClusterPanel';
import NodeDetailPanel from '@/components/graph/NodeDetailPanel';
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
import type {
  EnhancedGraphNode,
  EnhancedGraphCluster,
  EnhancedGraphData,
  EnhancedGraphViewType,
  ResearchType,
} from '@/types/graph';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

// ==================== 常量定义 ====================

const VIEW_LABELS: Record<EnhancedGraphViewType, string> = {
  force: '力导向图',
  timeline: '时间线',
  galaxy: '星系图',
};

// ==================== 主组件 ====================

export default function GraphPage() {
  const {
    state,
    setGraphData, setLoading, setError, setFilteredData, setStats,
    selectNode, hoverNode, setEntryDetail, setSearchQuery, setMatchedIds,
    clearInteraction,
    setViewType, updateViewConfig,
    updateFilter, toggleClusterPanel, setEdgeTypeFilter, setGalaxyCenter,
    clearFilters: resetFilters, setTopK, setShowFps, setCurrentFps,
  } = useGraphState();

  const { graphData, filteredData, error, loading, stats } = state.data;
  const { selectedNode, neighborNodes, hoveredNode, entryDetail, searchQuery, matchedNodeIds } = state.interaction;
  const { viewType, viewConfig, filter, showClusterPanel, edgeTypeFilter, galaxyCenterId, topK, showFps, currentFps } = state.view;

  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // FPS 监控逻辑（使用 ref，仅每 500ms 更新一次渲染）
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

  // Refs
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
  }, [topK]);

  useEffect(() => {
    setGraphData(null);
    setError(null);
    setSelectedNode(null);
    setNeighborNodes(null);
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    loadGraph(controller.signal);
    return () => {
      controller.abort();
      if (fetchAbortRef.current === controller) fetchAbortRef.current = null;
    };
  }, [loadGraph]);

  // ==================== 键盘快捷键 ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setNeighborNodes(null);
        setEntryDetail(null);
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
  }, [loadGraph]);

  // ==================== 数据筛选 ====================

  useEffect(() => {
    if (!graphData) return;

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
      clusters: graphData.clusters.map((c: EnhancedGraphCluster) => ({
        ...c,
        nodes: c.nodes.filter(id => nodes.some(n => n.id === id)),
        count: c.nodes.filter(id => nodes.some(n => n.id === id)).length,
      })).filter(c => c.nodes.length > 0),
      weights: graphData.weights,
      entry_count: graphData.entry_count,
    };

    setFilteredData(filtered);

    // 计算统计信息
    const s = calculateGraphStats(filtered.nodes, filtered.edges, filtered.clusters);
    setStats(s);
  }, [graphData, filter]);

  // ==================== 搜索处理 ====================

  useEffect(() => {
    if (!graphData || !searchQuery.trim()) {
      setMatchedNodeIds(new Set());
      return;
    }

    const matched = searchNodes(graphData.nodes, {
      query: searchQuery,
      searchTitle: true,
      searchSummary: true,
      searchTags: true,
    });
    setMatchedNodeIds(matched);
  }, [graphData, searchQuery]);

  // ==================== 事件处理 ====================

  const handleNodeClick = useCallback((node: EnhancedGraphNode) => {
    setSelectedNode(node);
    const neighbors = getNeighborNodes(node.id, filteredData?.nodes || [], filteredData?.edges || [], 1);
    setNeighborNodes(neighbors);
  }, [filteredData]);

  const openEntry = async (id: number) => {
    try {
      const entry = await api.entries.get(id);
      setEntryDetail(entry);
    } catch { /* ignore */ }
  };

  const handleViewChange = (type: EnhancedGraphViewType) => {
    setViewType(type);
    setViewConfig(prev => ({ ...prev, type }));
    // 切换到星系图时，如果没有中心节点则清空
    if (type !== 'galaxy') {
      setGalaxyCenterId(null);
    }
  };

  /** 星系图：设置指定节点为中心 */
  const setGalaxyCenter = (nodeId: number) => {
    setGalaxyCenterId(nodeId);
    setViewType('galaxy');
    setViewConfig(prev => ({ ...prev, type: 'galaxy' }));
  };

  const handleFilterChange = (newFilter: Partial<EnhancedGraphFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const toggleEdgeVisibility = () => {
    setViewConfig(prev => ({ ...prev, showEdges: !prev.showEdges }));
  };

  const toggleLabelVisibility = () => {
    setViewConfig(prev => ({ ...prev, showLabels: !prev.showLabels }));
  };

  const clearFilters = () => {
    setFilter(DEFAULT_FILTER);
    setSearchQuery('');
    setMatchedNodeIds(new Set());
    setGalaxyCenterId(null);
  };

  // 保持 ref 与最新回调同步（渲染时直接赋值，不触发额外渲染）
  handleNodeClickRef.current = handleNodeClick;
  setHoveredNodeRef.current = setHoveredNode;
  setGalaxyCenterRef.current = setGalaxyCenterId;

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
        option = createTimelineOption({ data: filteredData, nodeMap, maxDeg, width, height });
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
  }, [filteredData, viewType, galaxyCenterId, viewConfig.showLabels, viewConfig.showEdges,
      selectedNode, hoveredNode, neighborNodes, matchedNodeIds, edgeTypeFilter]);

  // ==================== ECharts 清理（组件卸载时） ====================

  useEffect(() => {
    return () => {
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

  const hasActiveFilters = filter.researchTypes !== undefined || filter.energyRange !== undefined || filter.timeRange !== undefined;

  return (
    <div className="page-shell" style={{ padding: '0 16px' }}>
      <PageHeader icon={<IconNetwork size={24} />} title="研究图谱">
        <Navigation />
      </PageHeader>

      <div className="content-area">
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* 工具栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            flexWrap: 'wrap',
          }}>
            {/* 视图切换 */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['force', 'timeline', 'galaxy'] as EnhancedGraphViewType[]).map(type => (
                <button
                  key={type}
                  onClick={() => handleViewChange(type)}
                  title={`${VIEW_LABELS[type]} (${type === 'force' ? '1' : type === 'timeline' ? '2' : '3'})`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: viewType === type ? '1px solid var(--accent-sky)' : '1px solid var(--border-color)',
                    background: viewType === type ? 'var(--accent-sky)' : 'transparent',
                    color: viewType === type ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: viewType === type ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {VIEW_LABELS[type]}
                </button>
              ))}
            </div>

            <span style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />

            {/* 筛选器 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={filter.researchTypes?.[0] || ''}
                onChange={e => handleFilterChange({
                  researchTypes: e.target.value ? [e.target.value as ResearchType] : undefined
                })}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <option value="">类型</option>
                <option value="deep-research">深度研究</option>
                <option value="topic-exploration">主题探索</option>
                <option value="domain-mapping">领域映射</option>
              </select>

              <select
                value={filter.energyRange?.[0] ? `${filter.energyRange[0]}-${filter.energyRange[1]}` : ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    const [min, max] = val.split('-').map(Number);
                    handleFilterChange({ energyRange: [min, max] as [number, number] });
                  } else {
                    handleFilterChange({ energyRange: undefined });
                  }
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <option value="">能量</option>
                <option value="4-5">高 (4-5)</option>
                <option value="3-3">中 (3)</option>
                <option value="1-2">低 (1-2)</option>
              </select>

              <select
                value={filter.timeRange?.type || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    handleFilterChange({ timeRange: { type: val as EnhancedTimeRangePreset } });
                  } else {
                    handleFilterChange({ timeRange: undefined });
                  }
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <option value="">时间</option>
                <option value="7d">7天</option>
                <option value="30d">30天</option>
                <option value="90d">90天</option>
              </select>
            </div>

            <span style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />

            {/* 显示控制 */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={toggleEdgeVisibility}
                title="显示/隐藏边"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: viewConfig.showEdges ? 'rgba(56,189,248,0.2)' : 'transparent',
                  color: viewConfig.showEdges ? 'var(--accent-sky)' : 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                E {viewConfig.showEdges ? '✓' : '✗'}
              </button>
              <button
                onClick={toggleLabelVisibility}
                title="显示/隐藏标签"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: viewConfig.showLabels ? 'rgba(56,189,248,0.2)' : 'transparent',
                  color: viewConfig.showLabels ? 'var(--accent-sky)' : 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                L {viewConfig.showLabels ? '✓' : '✗'}
              </button>
            </div>

            {/* 边类型筛选 */}
            <select
              value={edgeTypeFilter}
              onChange={e => setEdgeTypeFilter(e.target.value as EdgeTypeFilter)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: edgeTypeFilter === 'all' ? 'var(--text-muted)' : 'var(--accent-sky)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <option value="all">全部</option>
              <option value="content">内容相似</option>
              <option value="tags">标签重叠</option>
              <option value="temporal">时间相邻</option>
            </select>

            {/* 搜索框 */}
            <div style={{ flex: 1, minWidth: '120px', position: 'relative' }}>
              <input
                ref={searchRef}
                type="text"
                placeholder="搜索节点... (⌘F)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    searchRef.current?.blur();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '5px 24px 5px 10px',
                  borderRadius: '6px',
                  border: searchQuery ? '1px solid var(--accent-sky)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    fontSize: '14px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* 聚类面板切换 */}
            <button
              onClick={() => setShowClusterPanel(!showClusterPanel)}
              title="聚类列表"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: showClusterPanel ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: showClusterPanel ? 'var(--accent-sky)' : 'var(--text-muted)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ☰ {filteredData?.clusters.length || 0} 聚类
            </button>

            {/* 清除筛选 */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--accent-amber)',
                  background: 'transparent',
                  color: 'var(--accent-amber)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                清除
              </button>
            )}

            {/* 刷新 */}
            <button
              onClick={() => {
                const controller = new AbortController();
                loadGraph(controller.signal);
              }}
              title="刷新 (R)"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IconRefresh size={12} /> R
            </button>
          </div>

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
                  handleFilterChange({
                    clusterIds: newIds.length > 0 ? newIds : undefined,
                  });
                }}
              />
            )}

            {/* 图谱容器 */}
            {error ? (
              <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
                <p>{error}</p>
                <button
                  onClick={() => {
                    const controller = new AbortController();
                    loadGraph(controller.signal);
                  }}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  重试
                </button>
              </div>
            ) : loading ? (
              <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconHourglass size={32} /> 计算 attention matrix...
              </div>
            ) : !filteredData || filteredData.nodes.length < 2 ? (
              <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)', textAlign: 'center' }}>
                <IconEmpty size={64} style={{ marginBottom: '16px' }} />
                <p>至少需要 2 条记录才能生成图谱</p>
              </div>
            ) : (
              <ErrorBoundary fallback={
                <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
                  图谱渲染异常
                  <button
                    onClick={() => window.location.reload()}
                    style={{ marginLeft: '12px', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
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
                      onClose={() => { setSelectedNode(null); setNeighborNodes(null); }}
                      onViewDetail={openEntry}
                      onGalaxyFocus={setGalaxyCenter}
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