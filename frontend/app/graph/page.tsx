'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import EntryDetail from '@/components/entry/EntryDetail';
import { IconNetwork, IconHourglass, IconEmpty, IconRefresh } from '@/components/ui/Icons';
import {
  transformAttentionGraph,
  applyFilter,
  searchNodes,
  getNeighborNodes,
  calculateGraphStats,
  calculateNodeSize,
  calculateEdgeWidth,
  getClusterColor,
  EDGE_TYPE_COLORS,
  RESEARCH_TYPE_COLORS,
  DEFAULT_FORCE_LAYOUT,
} from '@/lib/graph-utils';
import type {
  AttentionGraph,
  EnhancedGraphNode,
  EnhancedGraphEdge,
  EnhancedGraphCluster,
  EnhancedGraphData,
  EnhancedGraphFilter,
  EnhancedGraphViewType,
  EnhancedViewConfig,
  Entry,
  ResearchType,
} from '@/types/graph';
import type { EChartsType, EChartsOption } from 'echarts';

// ==================== 常量定义 ====================

const VIEW_LABELS: Record<EnhancedGraphViewType, string> = {
  force: '力导向图',
  timeline: '时间线',
  galaxy: '星系图',
};

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

// ==================== 主组件 ====================

export default function GraphPage() {
  // 数据状态
  const [rawGraphData, setRawGraphData] = useState<AttentionGraph | null>(null);
  const [graphData, setGraphData] = useState<EnhancedGraphData | null>(null);
  const [filteredData, setFilteredData] = useState<EnhancedGraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 交互状态
  const [selectedNode, setSelectedNode] = useState<EnhancedGraphNode | null>(null);
  const [neighborNodes, setNeighborNodes] = useState<{ nodes: EnhancedGraphNode[]; edges: EnhancedGraphEdge[] } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<EnhancedGraphNode | null>(null);
  const [entryDetail, setEntryDetail] = useState<Entry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedNodeIds, setMatchedNodeIds] = useState<Set<number>>(new Set());

  // 视图状态
  const [viewType, setViewType] = useState<EnhancedGraphViewType>('force');
  const [viewConfig, setViewConfig] = useState<EnhancedViewConfig>(DEFAULT_VIEW_CONFIG);
  const [filter, setFilter] = useState<EnhancedGraphFilter>(DEFAULT_FILTER);
  const [showClusterPanel, setShowClusterPanel] = useState(false);

  // 星系图中心节点
  const [galaxyCenterId, setGalaxyCenterId] = useState<number | null>(null);

  // 性能优化状态
  const [topK, setTopK] = useState(80);           // 节点数量
  const [edgeThreshold, setEdgeThreshold] = useState(0.05); // 边权重阈值
  const [showFps, setShowFps] = useState(false);   // FPS 监控
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });
  const animFrameRef = useRef<number>(0);
  const [currentFps, setCurrentFps] = useState(0);

  // FPS 监控逻辑
  useEffect(() => {
    if (!showFps) {
      setCurrentFps(0);
      cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const tick = () => {
      fpsRef.current.frames++;
      const now = performance.now();
      if (now - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.fps = Math.round(fpsRef.current.frames * 1000 / (now - fpsRef.current.lastTime));
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
        setCurrentFps(fpsRef.current.fps);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [showFps]);

  // 统计信息
  const [stats, setStats] = useState({
    nodeCount: 0,
    edgeCount: 0,
    clusterCount: 0,
    avgDegree: 0,
    avgEnergy: 0,
    density: 0,
  });

  // Refs
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<EChartsType | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ==================== 键盘快捷键 ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: 取消选中
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setNeighborNodes(null);
        setEntryDetail(null);
      }
      // Ctrl/Cmd + F: 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // 1/2/3: 切换视图
      if (e.key === '1') setViewType('force');
      if (e.key === '2') setViewType('timeline');
      if (e.key === '3') setViewType('galaxy');
      // R: 刷新
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const controller = new AbortController();
        loadGraph(controller.signal);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ==================== 数据加载 ====================

  const loadGraph = useCallback((signal: AbortSignal, customTopK?: number) => {
    setLoading(true);
    const k = customTopK || topK;
    api.attention({ top_k: k }, signal)
      .then(data => {
        setRawGraphData(data);
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
    setRawGraphData(null);
    setGraphData(null);
    setError(null);
    setSelectedNode(null);
    setNeighborNodes(null);
    const controller = new AbortController();
    loadGraph(controller.signal);
    return () => controller.abort();
  }, [loadGraph]);

  // ==================== 数据筛选 ====================

  useEffect(() => {
    if (!graphData) return;

    const { nodes, edges } = applyFilter(graphData.nodes, graphData.edges, filter);
    const filtered: EnhancedGraphData = {
      nodes,
      edges,
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
  };

  // ==================== ECharts 渲染 ====================

  useEffect(() => {
    if (!filteredData || !chartRef.current || filteredData.nodes.length < 2) return;

    import('echarts').then(echarts => {
      if (!chartRef.current) return;
      if (echartsRef.current) echartsRef.current.dispose();

      const chart = echarts.init(chartRef.current, 'dark');
      echartsRef.current = chart;

      const nodeMap = new Map<number, EnhancedGraphNode>(filteredData.nodes.map(n => [n.id, n]));
      const degrees = filteredData.nodes.map(n => n.degree);
      const maxDeg = Math.max(...degrees, 1);

      let option: EChartsOption;
      switch (viewType) {
        case 'timeline':
          option = createTimelineOption(filteredData, nodeMap, maxDeg);
          break;
        case 'galaxy':
          option = createGalaxyOption(filteredData, nodeMap, maxDeg);
          break;
        case 'force':
        default:
          option = createForceGraphOption(filteredData, nodeMap, maxDeg);
          break;
      }

      chart.setOption(option as any);

      // 事件处理
      chart.on('click', (params: any) => {
        if (params.dataType === 'node') {
          const node = nodeMap.get(Number(params.data.id));
          if (!node) return;
          handleNodeClick(node);
        }
      });

      chart.on('mouseover', (params: any) => {
        if (params.dataType === 'node') {
          const node = nodeMap.get(Number(params.data.id));
          if (node) setHoveredNode(node);
        }
      });

      chart.on('mouseout', () => {
        setHoveredNode(null);
      });

      chart.on('contextmenu', (params: any) => {
        if (params.dataType === 'node') {
          params.event.event.preventDefault();
          const node = nodeMap.get(Number(params.data.id));
          if (node) {
            setGalaxyCenter(node.id);
          }
        }
      });

      const handleResize = () => { chart.resize(); };
      window.addEventListener('resize', handleResize);

      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
        echartsRef.current = null;
      };
    });

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [filteredData, viewType, galaxyCenterId, handleNodeClick]);

  // ==================== ECharts 配置生成 ====================

  const createForceGraphOption = (
    data: EnhancedGraphData,
    nodeMap: Map<number, EnhancedGraphNode>,
    maxDeg: number
  ): EChartsOption => {
    const targetNode = selectedNode || hoveredNode;
    const isHighlighted = (nodeId: number) => {
      if (!targetNode) return true;
      if (nodeId === targetNode.id) return true;
      return neighborNodes?.nodes.some(n => n.id === nodeId) || false;
    };

    const isDimmed = (nodeId: number) => {
      if (!targetNode) return false;
      return !isHighlighted(nodeId);
    };

    return {
      backgroundColor: 'transparent',
      animationDuration: 500,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const d = params.data;
            return `<strong>${d.name}</strong><br/>${d.cluster_name}<br/>能量 ${d.energy} · ${d.degree} 条关联`;
          }
          if (params.dataType === 'edge') {
            const typeLabel = params.data.edgeType === 'content' ? '内容相似' 
              : params.data.edgeType === 'tags' ? '标签重叠' : '时间相邻';
            return `关联强度: ${(params.data.weight * 100).toFixed(0)}%<br/>类型: ${typeLabel}`;
          }
          return '';
        },
      },
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: DEFAULT_FORCE_LAYOUT.repulsion,
          edgeLength: DEFAULT_FORCE_LAYOUT.edgeLength,
          layoutAnimation: true,
          friction: DEFAULT_FORCE_LAYOUT.friction,
        },
        roam: true,
        draggable: true,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 4],
        label: {
          show: viewConfig.showLabels,
          position: 'right',
          formatter: '{b}',
          fontSize: 11,
          color: '#F1F5F9',
        },
        data: data.nodes.map(n => {
          const dimmed = isDimmed(n.id);
          const isMatch = matchedNodeIds.has(n.id);
          const isTarget = targetNode?.id === n.id;
          return {
            id: String(n.id),
            name: n.topic.length > 15 ? n.topic.slice(0, 13) + '…' : n.topic,
            value: n.degree,
            energy: n.energy,
            cluster_name: n.cluster_name,
            degree: n.degree,
            symbolSize: isTarget ? calculateNodeSize(n.energy, n.degree, maxDeg) * 1.3 : calculateNodeSize(n.energy, n.degree, maxDeg),
            itemStyle: {
              color: getClusterColor(n.cluster_id),
              shadowBlur: isMatch ? 15 : isTarget ? 20 : 6,
              shadowColor: isMatch ? '#fbbf24' : isTarget ? '#fbbf24' : getClusterColor(n.cluster_id) + '60',
              opacity: dimmed ? 0.3 : 0.9,
              borderColor: isTarget ? '#fbbf24' : 'transparent',
              borderWidth: isTarget ? 3 : 0,
            },
            emphasis: {
              focus: 'adjacency',
              itemStyle: {
                shadowBlur: 20,
                shadowColor: getClusterColor(n.cluster_id),
              },
            },
          };
        }),
        edges: viewConfig.showEdges ? data.edges.map(e => {
          const sourceDimmed = isDimmed(e.source);
          const targetDimmed = isDimmed(e.target);
          const dimmed = sourceDimmed || targetDimmed;
          return {
            source: e.source,
            target: e.target,
            weight: e.weight,
            edgeType: e.type,
            lineStyle: {
              color: e.color || EDGE_TYPE_COLORS[e.type],
              width: calculateEdgeWidth(e.weight),
              opacity: dimmed ? 0.1 : Math.min(e.weight * 1.5, 0.6),
              curveness: 0.15,
              type: e.weight > 0.5 ? 'solid' : 'dashed',
            },
          };
        }) : [],
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            opacity: 0.8,
          },
        },
      }],
    };
  };

  const createTimelineOption = (
    data: EnhancedGraphData,
    nodeMap: Map<number, EnhancedGraphNode>,
    maxDeg: number
  ): any => {
    const sortedNodes = [...data.nodes].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const width = chartRef.current?.offsetWidth || 800;
    const height = chartRef.current?.offsetHeight || 500;
    const padding = 80;
    const timelineWidth = width - padding * 2;

    // 更好的交错排列：使用正弦波避免随机性
    const positions = sortedNodes.map((node, index) => {
      const x = padding + (index / Math.max(sortedNodes.length - 1, 1)) * timelineWidth;
      const amplitude = 120;
      const frequency = Math.PI * 0.5;
      const y = height / 2 + Math.sin(index * frequency / 2) * amplitude;
      return { id: node.id, x, y };
    });

    const posMap = new Map<number, { x: number; y: number }>(positions.map(p => [p.id, p]));

    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const d = params.data;
            return `<strong>${d.name}</strong><br/>${new Date(d.timestamp).toLocaleDateString('zh-CN')}<br/>聚类: ${d.cluster_name}<br/>能量 ${d.energy}`;
          }
          return '';
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          },
          rotate: 30,
        },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 0,
        max: height,
      },
      grid: {
        left: padding,
        right: padding,
        top: 40,
        bottom: 80,
      },
      series: [
        {
          type: 'line',
          symbol: 'none',
          lineStyle: { color: '#334155', width: 2 },
          data: sortedNodes.map((n, i) => ({
            name: n.timestamp,
            value: [i, height / 2],
          })),
          animation: false,
        },
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          symbolSize: (params: any) => calculateNodeSize(params.data.energy, params.data.degree, maxDeg),
          itemStyle: {
            color: (params: any) => getClusterColor(params.data.cluster_id),
            shadowBlur: 10,
            shadowColor: (params: any) => getClusterColor(params.data.cluster_id) + '60',
          },
          emphasis: {
            scale: 1.5,
          },
          data: sortedNodes.map((node, index) => {
            const pos = posMap.get(node.id)!;
            return {
              id: node.id,
              name: node.topic,
              value: [index, pos.y],
              energy: node.energy,
              degree: node.degree,
              cluster_id: node.cluster_id,
              cluster_name: node.cluster_name,
              timestamp: node.timestamp,
            };
          }),
        },
      ],
    };
  };

  const createGalaxyOption = (
    data: EnhancedGraphData,
    nodeMap: Map<number, EnhancedGraphNode>,
    maxDeg: number
  ): any => {
    // 确定中心节点
    const centerNodeId = galaxyCenterId || (data.nodes.reduce((max, n) => n.energy > max.energy ? n : max, data.nodes[0]).id);
    const centerNode = nodeMap.get(centerNodeId) || data.nodes[0];

    // BFS 分层
    const visited = new Set<number>([centerNodeId]);
    const rings: number[][] = [[centerNodeId]];
    let currentRing = [centerNodeId];

    for (let ring = 1; ring <= 4 && currentRing.length > 0; ring++) {
      const nextRing: number[] = [];
      currentRing.forEach(nodeId => {
        data.edges.forEach(edge => {
          let neighborId: number | null = null;
          if (edge.source === nodeId && !visited.has(edge.target)) {
            neighborId = edge.target;
          } else if (edge.target === nodeId && !visited.has(edge.source)) {
            neighborId = edge.source;
          }
          if (neighborId !== null) {
            visited.add(neighborId);
            nextRing.push(neighborId);
          }
        });
      });
      if (nextRing.length > 0) {
        rings.push(nextRing);
        currentRing = nextRing;
      }
    }

    const width = chartRef.current?.offsetWidth || 800;
    const height = chartRef.current?.offsetHeight || 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.4;

    const positions = new Map<number, { x: number; y: number }>();
    positions.set(centerNodeId, { x: centerX, y: centerY });

    rings.forEach((ring, ringIndex) => {
      if (ringIndex === 0) return;
      const radiusStep = maxRadius / rings.length;
      const baseRadius = radiusStep * ringIndex;
      // 每层内随机偏移
      ring.forEach((nodeId, nodeIndex) => {
        const angleStep = (Math.PI * 2) / ring.length;
        const angle = nodeIndex * angleStep + (ringIndex * 0.3);
        const radiusOffset = (Math.random() - 0.5) * radiusStep * 0.5;
        positions.set(nodeId, {
          x: centerX + Math.cos(angle) * (baseRadius + radiusOffset),
          y: centerY + Math.sin(angle) * (baseRadius + radiusOffset),
        });
      });
    });

    return {
      backgroundColor: 'transparent',
      animationDuration: 600,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const d = params.data;
            return `<strong>${d.name}</strong><br/>${d.cluster_name}<br/>能量 ${d.energy}<br/><small>右键设为焦点</small>`;
          }
          return '';
        },
      },
      series: [{
        type: 'graph',
        layout: 'none',
        roam: true,
        draggable: true,
        data: data.nodes.map(n => {
          const pos = positions.get(n.id);
          if (!pos) return null;
          const isCenter = n.id === centerNodeId;
          return {
            id: n.id,
            name: n.topic.length > 12 ? n.topic.slice(0, 10) + '…' : n.topic,
            x: pos.x,
            y: pos.y,
            value: n.degree,
            energy: n.energy,
            cluster_name: n.cluster_name,
            symbolSize: isCenter ? calculateNodeSize(n.energy, n.degree, maxDeg) * 1.5 : calculateNodeSize(n.energy, n.degree, maxDeg),
            itemStyle: {
              color: isCenter ? '#fbbf24' : getClusterColor(n.cluster_id),
              shadowBlur: isCenter ? 25 : 6,
              shadowColor: isCenter ? '#fbbf2480' : getClusterColor(n.cluster_id) + '60',
              borderColor: isCenter ? '#fbbf24' : 'transparent',
              borderWidth: isCenter ? 3 : 0,
            },
            label: {
              show: isCenter || viewConfig.showLabels,
              position: 'right',
              formatter: '{b}',
              fontSize: isCenter ? 14 : 10,
              fontWeight: isCenter ? 'bold' : 'normal',
              color: '#F1F5F9',
            },
          };
        }).filter(Boolean),
        edges: viewConfig.showEdges ? data.edges.map(e => ({
          source: e.source,
          target: e.target,
          lineStyle: {
            color: e.color || EDGE_TYPE_COLORS[e.type],
            width: calculateEdgeWidth(e.weight) * 0.5,
            opacity: Math.min(e.weight, 0.4),
            curveness: 0,
          },
        })) : [],
      }],
    };
  };

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
                  const val = e.target.value as any;
                  if (val) {
                    handleFilterChange({ timeRange: { type: val } });
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
              <div style={{
                width: '220px',
                borderRight: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                overflow: 'auto',
                flexShrink: 0,
                animation: 'slideInLeft 0.2s ease',
              }}>
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  聚类 ({clusterList.length})
                </div>
                {clusterList.map(cluster => (
                  <div
                    key={cluster.id}
                    onClick={() => {
                      // 点击聚类筛选
                      const current = filter.clusterIds || [];
                      const newIds = current.includes(cluster.id)
                        ? current.filter(id => id !== cluster.id)
                        : [...current, cluster.id];
                      handleFilterChange({
                        clusterIds: newIds.length > 0 ? newIds : undefined,
                      });
                    }}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: filter.clusterIds?.includes(cluster.id) ? `${cluster.color}15` : 'transparent',
                      borderLeft: filter.clusterIds?.includes(cluster.id) ? `3px solid ${cluster.color}` : '3px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: cluster.color,
                        flexShrink: 0,
                      }} />
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {cluster.label}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      marginLeft: '16px',
                    }}>
                      {cluster.count} 个节点
                    </div>
                  </div>
                ))}
              </div>
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

                  {/* 底部图例 */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--bg-panel)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                    maxWidth: 'calc(100% - 24px)',
                  }}>
                    {clusterCounts.map(([cluster, count]) => {
                      const color = getClusterColor(cluster);
                      return (
                        <span key={cluster} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{count}</span>
                        </span>
                      );
                    })}
                    <span style={{ width: '1px', height: '10px', background: 'var(--border-color)' }} />
                    <span>{stats.nodeCount} 节点 · {stats.edgeCount} 关联 · {stats.clusterCount} 聚类</span>
                    {matchedNodeIds.size > 0 && (
                      <>
                        <span style={{ width: '1px', height: '10px', background: 'var(--border-color)' }} />
                        <span style={{ color: '#fbbf24' }}>✓ {matchedNodeIds.size} 匹配</span>
                      </>
                    )}
                  </div>

                  {/* 关联类型图例 */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    zIndex: 10,
                    background: 'var(--bg-panel)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '10px',
                  }}>
                    {Object.entries(EDGE_TYPE_COLORS).map(([type, color]) => (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                        <span style={{ width: '14px', height: '2px', background: color, borderRadius: '1px' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {type === 'content' ? '内容' : type === 'tags' ? '标签' : '时间'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 选中节点面板 */}
                  {selectedNode && neighborNodes && (
                    <div style={{
                      width: '280px',
                      borderLeft: '1px solid var(--border-color)',
                      overflow: 'auto',
                      background: 'var(--bg-secondary)',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      animation: 'slideInRight 0.2s ease',
                    }}>
                      <div style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {selectedNode.topic}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: getClusterColor(selectedNode.cluster_id) + '20',
                              color: getClusterColor(selectedNode.cluster_id),
                              fontSize: '10px',
                            }}>
                              {selectedNode.cluster_name}
                            </span>
                            <span>⚡{selectedNode.energy}</span>
                            <span>↔{selectedNode.degree}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedNode(null); setNeighborNodes(null); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '16px',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>

                      {/* 操作按钮 */}
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '8px 14px',
                        borderBottom: '1px solid var(--border-color)',
                      }}>
                        <button
                          onClick={() => openEntry(selectedNode.id)}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          查看详情
                        </button>
                        <button
                          onClick={() => setGalaxyCenter(selectedNode.id)}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          星系聚焦
                        </button>
                      </div>

                      {/* 摘要 */}
                      {selectedNode.summary && (
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>摘要</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {selectedNode.summary}
                          </div>
                        </div>
                      )}

                      {/* 关联列表 */}
                      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
                        <div style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          marginBottom: '8px',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span>关联 ({neighborNodes.nodes.length})</span>
                        </div>
                        {neighborNodes.nodes.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>
                            无关联节点
                          </div>
                        ) : (
                          neighborNodes.nodes
                            .sort((a, b) => {
                              const edgeA = neighborNodes.edges.find(e =>
                                (e.source === selectedNode.id && e.target === a.id) ||
                                (e.target === selectedNode.id && e.source === a.id)
                              );
                              const edgeB = neighborNodes.edges.find(e =>
                                (e.source === selectedNode.id && e.target === b.id) ||
                                (e.target === selectedNode.id && e.source === b.id)
                              );
                              return (edgeB?.weight || 0) - (edgeA?.weight || 0);
                            })
                            .map(node => {
                              const edge = neighborNodes.edges.find(e =>
                                (e.source === selectedNode.id && e.target === node.id) ||
                                (e.target === selectedNode.id && e.source === node.id)
                              );
                              return (
                                <div
                                  key={node.id}
                                  onClick={() => openEntry(node.id)}
                                  style={{
                                    padding: '8px 10px',
                                    marginBottom: '6px',
                                    borderRadius: '6px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '3px',
                                  }}>
                                    <span style={{
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      background: getClusterColor(node.cluster_id),
                                      flexShrink: 0,
                                    }} />
                                    <div style={{
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      color: 'var(--text-primary)',
                                      flex: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {node.topic}
                                    </div>
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                  }}>
                                    <span>{new Date(node.timestamp).toLocaleDateString('zh-CN')}</span>
                                    {edge && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        background: (edge.color || '#334155') + '20',
                                        color: edge.color || '#334155',
                                        fontSize: '9px',
                                      }}>
                                        ↕ {(edge.weight * 100).toFixed(0)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
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