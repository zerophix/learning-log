'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import EntryDetail from '@/components/entry/EntryDetail';
import { IconNetwork, IconHourglass, IconEmpty, IconRefresh } from '@/components/ui/Icons';
import type { AttentionGraph, AttentionNode, AttentionEdge } from '@/types';

const CLUSTER_COLORS = ['#34d399', '#38bdf8', '#f59e0b', '#818cf8', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa', '#f87171', '#10b981'];

export default function GraphPage() {
  const [graphData, setGraphData] = useState<AttentionGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AttentionNode | null>(null);
  const [similarEntries, setSimilarEntries] = useState<{ node: AttentionNode; weight: number }[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [entryDetail, setEntryDetail] = useState<any>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<any>(null);

  const loadGraph = useCallback((signal: AbortSignal) => {
    api.attention({ top_k: 5 }, signal)
      .then(setGraphData)
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message || '加载图谱失败');
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadGraph(controller.signal);
    return () => controller.abort();
  }, [loadGraph]);

  useEffect(() => {
    if (!graphData || !chartRef.current || graphData.nodes.length === 0) return;
    import('echarts').then(echarts => {
      if (!chartRef.current) return;
      if (echartsRef.current) echartsRef.current.dispose();
      const chart = echarts.init(chartRef.current, 'dark');
      echartsRef.current = chart;

      const degrees = graphData.nodes.map(n => n.degree);
      const maxDeg = Math.max(...degrees, 1);

      const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              const d = params.data;
              return `<strong>${d.name}</strong><br/>${d.cluster_name}<br/>能量 ${d.energy} · ${d.degree} 条关联`;
            }
            if (params.dataType === 'edge') {
              return `Attention: ${(params.data.weight * 100).toFixed(0)}%`;
            }
            return '';
          }
        },
        series: [{
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 8],
          label: { show: true, fontSize: 10, color: '#c8d1dc' },
          force: { repulsion: 600, edgeLength: 200, gravity: 0.06 },
          data: graphData.nodes.map(n => ({
            id: n.id,
            name: n.topic.length > 18 ? n.topic.slice(0, 16) + '…' : n.topic,
            value: n.degree,
            energy: n.energy,
            aha: n.aha,
            cluster: n.cluster,
            cluster_name: n.cluster_name,
            degree: n.degree,
            tag_count: n.tag_count,
            symbolSize: 20 + (n.degree / maxDeg) * 40,
            itemStyle: { color: CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length] },
          })),
          edges: graphData.edges.map(e => {
            const w = Math.max(e.weight, 0.01);
            return {
              source: e.source,
              target: e.target,
              weight: e.weight,
              lineStyle: {
                color: '#475569', width: w * 6, curveness: 0.2, opacity: Math.min(w * 2, 0.9),
              },
            };
          }),
        }]
      });

      chart.on('click', (params: any) => {
        if (params.dataType === 'node') {
          const node = nodeMap.get(params.data.id);
          if (!node) return;
          setSelectedNode(node);
          const neighbors = graphData.edges
            .filter(e => e.source === node.id || e.target === node.id)
            .map(e => {
              const otherId = e.source === node.id ? e.target : e.source;
              const other = nodeMap.get(otherId);
              return other ? { node: other, weight: e.weight } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b!.weight - a!.weight)
            .slice(0, 10) as { node: AttentionNode; weight: number }[];
          setSimilarEntries(neighbors);
        }
      });

      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    });
  }, [graphData]);

  const resetZoom = () => {
    if (echartsRef.current) {
      echartsRef.current.clear();
      echartsRef.current.setOption({ series: [{ zoom: 1 }] });
    }
  };

  const openEntry = async (id: number) => {
    setSelectedEntryId(id);
    try {
      const entry = await api.entries.get(id);
      setEntryDetail(entry);
    } catch {
      setEntryDetail(null);
    }
  };

  return (
    <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader icon={<IconNetwork size={24} />} title="Attention Graph">
        <Navigation />
      </PageHeader>

      <main style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {error ? (
          <div style={{ margin: 'auto', padding: '80px', color: '#ef4444' }}><p>{error}</p></div>
        ) : !graphData ? (
          <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
            <IconHourglass size={32} /> 计算 attention matrix...
          </div>
        ) : graphData.nodes.length < 2 ? (
          <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
            <IconEmpty size={64} /><p>至少需要 2 条记录才能生成图谱</p>
          </div>
        ) : (
          <ErrorBoundary fallback={<div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>图谱渲染异常<button onClick={() => window.location.reload()} style={{ marginLeft: '12px', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>重试</button></div>}>
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, background: 'rgba(15,23,42,0.85)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', maxWidth: '240px' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>聚类（共 {graphData.entry_count} 条）</div>
              {graphData.clusters.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CLUSTER_COLORS[i % CLUSTER_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', lineHeight: 1.3 }}>{name.length > 24 ? name.slice(0, 22) + '…' : name}</span>
                </div>
              ))}
              <button onClick={resetZoom} style={{ marginTop: '8px', width: '100%', padding: '4px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <IconRefresh size={12} /> 重置视图
              </button>
            </div>

            <div ref={chartRef} style={{ flex: 1 }} />

            {selectedNode && (
              <div style={{ width: '320px', borderLeft: '1px solid var(--border-color)', overflow: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedNode.topic}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {selectedNode.cluster_name} · 能量 {selectedNode.energy} · {selectedNode.degree} 条关联
                    </div>
                  </div>
                  <button onClick={() => { setSelectedNode(null); setSimilarEntries([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>×</button>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Attention 关联 ({similarEntries.length})
                  </div>
                  {similarEntries.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>无关联节点</div>
                  ) : (
                    similarEntries.map(({ node, weight }) => (
                      <div key={node.id} onClick={() => openEntry(node.id)}
                        style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{node.topic}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{new Date(node.timestamp).toLocaleDateString('zh-CN')}</span>
                          <span style={{ color: '#38bdf8' }}>{(weight * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </ErrorBoundary>
        )}
      </main>

      <EntryDetail entry={entryDetail} onClose={() => { setEntryDetail(null); setSelectedEntryId(null); }} />
    </div>
  );
}
