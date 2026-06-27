'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import EntryDetail from '@/components/entry/EntryDetail';
import { IconNetwork, IconHourglass, IconEmpty, IconRefresh } from '@/components/ui/Icons';
import type { GraphData, Entry } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  discipline: '#34d399',
  subject: '#38bdf8',
  topic: '#f59e0b',
  'research-type': '#8b5cf6',
};

const CATEGORY_LABELS: Record<string, string> = {
  discipline: '学科领域',
  subject: '技术栈',
  topic: '学习主题',
  'research-type': '研究类型',
};

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; name: string } | null>(null);
  const [nodeEntries, setNodeEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<any>(null);

  const loadGraph = useCallback((signal: AbortSignal) => {
    api.graph(signal)
      .then((data: any) => {
        // normalize: API 返回 links，前端用 edges
        if (!data.edges && data.links) {
          data.edges = data.links;
        }
        setGraphData(data as GraphData);
      })
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
    if (!graphData || !chartRef.current) return;
    import('echarts').then(echarts => {
      if (!chartRef.current) return;
      if (echartsRef.current) echartsRef.current.dispose();
      const chart = echarts.init(chartRef.current, 'dark');
      echartsRef.current = chart;

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              return `<strong>${params.name}</strong><br/>${CATEGORY_LABELS[params.data.category] || params.data.category || ''}`;
            }
            return params.data?.label || '';
          }
        },
        series: [{
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          symbolSize: 50,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 10],
          label: { show: true, fontSize: 11, color: '#c8d1dc' },
          force: { repulsion: 400, edgeLength: 180, gravity: 0.08 },
          data: graphData.nodes.map(n => ({
            id: n.id,
            name: (n as any).name || n.label || n.id.split('.').pop() || n.id,
            category: n.category,
            symbolSize: n.category === 'discipline' ? 65 : n.category === 'subject' ? 50 : 35,
            itemStyle: { color: CATEGORY_COLORS[n.category] || '#64748b' },
          })),
          edges: graphData.edges.map(e => ({
            source: e.source,
            target: e.target,
            label: e.label ? { show: true, formatter: e.label, fontSize: 10 } : undefined,
            lineStyle: { color: '#475569', width: 1.5, curveness: 0.2, opacity: 0.6 }
          }))
        }]
      });

      chart.on('click', (params: any) => {
        if (params.dataType === 'node') {
          const nodeId = params.data.id;
          const nodeName = params.name;
          setSelectedNode({ id: nodeId, name: nodeName });
          api.tags.entries(nodeId).then(setNodeEntries).catch(() => setNodeEntries([]));
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
    if (echartsRef.current) echartsRef.current.setOption({ series: [{ zoom: 1 }] });
  };

  return (
    <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader icon={<IconNetwork size={24} />} title="知识图谱">
        <Navigation />
      </PageHeader>

      <main style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {error ? (
          <div style={{ margin: 'auto', padding: '80px', color: '#ef4444' }}><p>{error}</p></div>
        ) : !graphData ? (
          <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
            <IconHourglass size={32} /> 加载中...
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>
            <IconEmpty size={64} /><p>暂无图谱数据</p>
          </div>
        ) : (
          <ErrorBoundary fallback={<div style={{ margin: 'auto', padding: '80px', color: 'var(--text-muted)' }}>图谱渲染异常<button onClick={() => window.location.reload()} style={{ marginLeft: '12px', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>重试</button></div>}>
            {/* 图例 */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, background: 'rgba(15,23,42,0.85)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', fontSize: '12px' }}>
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CATEGORY_COLORS[cat] }} />
                  {label}
                </div>
              ))}
              <button onClick={resetZoom} style={{ marginTop: '8px', padding: '4px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconRefresh size={12} /> 重置视图
              </button>
            </div>

            {/* 图谱 */}
            <div ref={chartRef} style={{ flex: 1 }} />

            {/* 节点详情面板 */}
            {selectedNode && (
              <div style={{ width: '320px', borderLeft: '1px solid var(--border-color)', overflow: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{selectedNode.name}</span>
                  <button onClick={() => { setSelectedNode(null); setNodeEntries([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>×</button>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>关联记录 ({nodeEntries.length})</div>
                  {nodeEntries.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>暂无关联记录</div>
                  ) : (
                    nodeEntries.map(en => (
                      <div key={en.id} onClick={() => setSelectedEntry(en)} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{en.topic}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(en.timestamp).toLocaleDateString('zh-CN')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </ErrorBoundary>
        )}
      </main>

      <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
