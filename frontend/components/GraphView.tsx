'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { LearningEntry } from '@/types';

interface GraphViewProps {
  entries: LearningEntry[];
  links: { source: string; target: string; label?: string }[];
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string, nodeName: string) => void;
}

export default function GraphView({ entries, links, onNodeClick, onNodeDoubleClick }: GraphViewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const callbacksRef = useRef({ onNodeClick, onNodeDoubleClick });

  // 保持回调函数引用最新
  useEffect(() => {
    callbacksRef.current = { onNodeClick, onNodeDoubleClick };
  }, [onNodeClick, onNodeDoubleClick]);

  useEffect(() => {
    if (!chartRef.current) return;

    // 1. 初始化实例 (只执行一次)
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const chart = chartInstance.current;

    // 2. 准备数据
    const categories = [
      { name: 'design' }, { name: 'visual' }, { name: 'arch' }, { name: 'tech' }
    ];

    const nodes = entries.map((entry) => {
      const catName = entry.tags[0]?.type || 'tech';
      return {
        id: entry.path,
        name: entry.topic,
        symbolSize: 30 + (entry.energy || 3) * 5,
        category: catName,
        value: entry.energy,
        itemStyle: {
          color: getCategoryColor(catName),
        },
        label: {
          show: true,
          position: 'bottom',
          color: '#fff',
          fontSize: 10,
        }
      };
    });

    const edges = links.map(link => ({
      source: link.source,
      target: link.target,
      lineStyle: { color: 'rgba(148, 163, 184, 0.2)', curveness: 0.1 }
    }));

    // 3. 设置配置项
    const option = {
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' }
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: edges,
        categories: categories,
        roam: true,
        draggable: true,
        force: { repulsion: 500, edgeLength: 150, gravity: 0.05 },
        emphasis: { focus: 'adjacency' },
        lineStyle: { width: 1.5, curveness: 0.1 }
      }]
    };

    // 4. 渲染图表
    chart.setOption(option, true);

    // 5. 绑定事件 (使用 ref 避免闭包陷阱)
    chart.off('click');
    chart.off('dblclick');
    
    chart.on('click', (params: any) => {
      if (params.dataType === 'node') {
        console.log('Click node:', params.name, params.data.id);
        callbacksRef.current.onNodeClick?.(params.data.id);
      }
    });
    
    chart.on('dblclick', (params: any) => {
      if (params.dataType === 'node') {
        console.log('Double click node:', params.name, params.data.id);
        callbacksRef.current.onNodeDoubleClick?.(params.data.id, params.data.name);
      }
    });

    // 6. 响应式调整
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [entries, links]); // 移除回调函数依赖，使用 ref 代替

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
}

function getCategoryColor(type: string): string {
  const colorMap: Record<string, string> = {
    design: '#34d399', visual: '#38bdf8', arch: '#a78bfa', tech: '#fbbf24',
  };
  return colorMap[type] || '#38bdf8';
}
