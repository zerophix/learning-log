'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import type { GraphData } from '@/types';

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<any>(null);

  useEffect(() => {
    api.graph().then(data => {
      setGraphData(data);
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
        backgroundColor: '#0F172A',
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              return params.data.label || params.data.name;
            }
            return params.data.label || '';
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
            color: '#CBD5E1'
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
              color: '#475569',
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
    <div style={{ height: '100vh', background: '#0F172A', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #1E293B', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="#38bdf8" strokeWidth="1.5"/>
            <circle cx="5" cy="6" r="2" stroke="#38bdf8" strokeWidth="1.5"/>
            <circle cx="19" cy="6" r="2" stroke="#38bdf8" strokeWidth="1.5"/>
            <circle cx="5" cy="18" r="2" stroke="#38bdf8" strokeWidth="1.5"/>
            <circle cx="19" cy="18" r="2" stroke="#38bdf8" strokeWidth="1.5"/>
            <path d="M7 7L10 10" stroke="#38bdf8" strokeWidth="1.5"/>
            <path d="M17 7L14 10" stroke="#38bdf8" strokeWidth="1.5"/>
            <path d="M7 17L10 14" stroke="#38bdf8" strokeWidth="1.5"/>
            <path d="M17 17L14 14" stroke="#38bdf8" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.5px', color: '#F8FAFC' }}>知识图谱</span>
        </div>
        <Navigation />
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        {!graphData ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#475569' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            正在加载图谱数据...
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        )}
      </main>
    </div>
  );
}
