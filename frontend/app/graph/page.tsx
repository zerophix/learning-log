'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { IconNetwork, IconHourglass } from '@/components/ui/Icons';
import type { GraphData } from '@/types';

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<any>(null);

  useEffect(() => {
    api.graph()
      .then(data => setGraphData(data))
      .catch(err => {
        setError(err.message || '加载图谱失败');
        console.error('Graph load failed:', err);
      });
  }, []);

  useEffect(() => {
    if (!graphData || !chartRef.current) return;

    // 动态加载 echarts
    import('echarts').then(echarts => {
      if (!chartRef.current) return;
      
      const chart = echarts.init(chartRef.current, 'dark');
      echartsRef.current = chart;

      const option = {
        backgroundColor: 'var(--bg-primary)',
        tooltip: {
          trigger: 'item',
          formatter: (params: { dataType?: string; data?: { label?: string; name?: string }; label?: string; name?: string }) => {
            if (params.dataType === 'node') {
              return params.data?.label || params.data?.name || '';
            }
            return params.data?.label || '';
          }
        },
        series: [{
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          symbolSize: 40,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 10],
          label: {
            show: true,
            fontSize: 11,
            color: 'var(--text-secondary)'
          },
          force: {
            repulsion: 300,
            edgeLength: 150,
            gravity: 0.1
          },
          data: graphData.nodes.map(node => ({
            id: node.id.toString(),
            name: node.label || node.id.toString(),
            symbolSize: 30 + (node.degree || 0) * 5,
            itemStyle: {
              color: node.category === 'topic' ? '#38bdf8' : 
                     node.category === 'project' ? '#818cf8' : '#34d399'
            }
          })),
          edges: graphData.edges.map(edge => ({
            source: edge.source.toString(),
            target: edge.target.toString(),
            label: {
              show: edge.label ? true : false,
              formatter: edge.label
            },
            lineStyle: {
              color: 'var(--text-muted)',
              width: 1.5,
              curveness: 0.2
            }
          }))
        }]
      };

      chart.setOption(option);

      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    });
  }, [graphData]);

  return (
    <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--bg-secondary)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconNetwork size={24} />
          <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>知识图谱</span>
        </div>
        <Navigation />
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#ef4444' }}>
            <p>{error}</p>
          </div>
        ) : !graphData ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            <IconHourglass size={32} />
            正在加载图谱数据...
          </div>
        ) : (
          <ErrorBoundary fallback={<div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>图谱渲染异常<button onClick={() => window.location.reload()} style={{ marginLeft: '12px', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>重试</button></div>}>
            <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}
