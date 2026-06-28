'use client';
import { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { IconWarning } from '@/components/ui/Icons';

if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontSize: 11,
    flowchart: {
      padding: 20,
      nodeSpacing: 60,
      rankSpacing: 100,
      curve: 'basis',
      defaultRenderer: 'dagre-wrapper'
    },
    theme: 'base',
    themeVariables: {
      lineColor: '#8b95a8',
      arrowMarkerColor: '#8b95a8',
      primaryColor: '#1e293b',
      primaryTextColor: '#e8e8e8',
      primaryBorderColor: '#64748b',
      textColor: '#c8d1dc'
    },
    themeCSS: `
      text, tspan {
        font-family: "Times New Roman", "Noto Serif SC", serif !important;
        font-size: 11px !important;
        line-height: 1.1 !important;
      }
      .edgeLabel text, .edgeLabel tspan, .edgeLabel {
        font-family: "Times New Roman", "Noto Serif SC", serif !important;
        font-size: 11px !important;
        fill: #d1d8e0 !important;
        background: transparent !important;
        color: #d1d8e0 !important;
      }
      .edgeLabel rect {
        fill: rgba(15, 23, 42, 0.8) !important;
        rx: 4px !important;
        ry: 4px !important;
      }
      .node text, .node tspan, .node .label {
        font-family: "Times New Roman", "Noto Serif SC", serif !important;
        font-size: 11px !important;
        fill: #e8e8e8 !important;
      }
      .edgePath .path {
        stroke: #8b95a8 !important;
        stroke-width: 1.5px !important;
        opacity: 0.8 !important;
      }
      .arrowheadPath {
        fill: #8b95a8 !important;
        opacity: 0.8 !important;
      }
      .node rect, .node circle, .node ellipse, .node polygon {
        fill: #1e293b !important;
        stroke: #475569 !important;
        stroke-width: 1.5px !important;
        rx: 6px !important;
        ry: 6px !important;
      }
    `
  });
}

export default function MermaidDiagram({ chart }: { chart?: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const trimmed = (chart ?? '').trim();

  useEffect(() => {
    setSvg('');
    setError('');
    if (!trimmed) return;

    let cancelled = false;
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const result = await mermaid.render(id, trimmed);
        const renderedSvg = (result as { svg?: string }).svg;
        if (!cancelled) {
          setSvg(renderedSvg || '');
          setError('');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '图表渲染失败');
          setSvg('');
        }
      }
    };

    renderDiagram();
    return () => { cancelled = true; };
  }, [trimmed]);

  if (error) {
    return (
      <div style={{ color: '#ef4444', padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <IconWarning size={16} />
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '40px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px'
      }}>
        渲染图中...
      </div>
    );
  }

  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
