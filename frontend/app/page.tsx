'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '@/styles/layout.css';

// 配置 Mermaid - 统一缩小字体 + 优化内边距 + 连线对比度
if (typeof window !== 'undefined') {
  mermaid.initialize({ 
    startOnLoad: false, 
    securityLevel: 'loose',
    fontSize: 11,
    flowchart: {
      padding: 20,       // 增加节点内边距，防止框体过紧
      nodeSpacing: 60,   // 增加节点间垂直间距
      rankSpacing: 100,  // 增加节点间水平间距
      curve: 'basis',
      defaultRenderer: 'dagre-d3'
    },
    theme: 'base',
    themeVariables: {
      // 连线颜色 - 提高亮度
      lineColor: '#8b95a8',
      arrowMarkerColor: '#8b95a8',
      // 节点样式
      primaryColor: '#1e293b',
      primaryTextColor: '#e8e8e8',
      primaryBorderColor: '#475569',
      // 连线标签颜色
      textColor: '#c8d1dc'
    },
    themeCSS: `
      /* 1. 全局覆盖所有 SVG 文本元素 */
      text, tspan {
        font-family: "Times New Roman", "Noto Serif SC", serif !important;
        font-size: 11px !important;
        line-height: 1.1 !important;
      }
      
      /* 2. 专门针对连线标签 - 提高亮度和对比度 */
      .edgeLabel text, .edgeLabel tspan, .edgeLabel {
        font-family: "Times New Roman", "Noto Serif SC", serif !important;
        font-size: 11px !important;
        fill: #d1d8e0 !important;
        background: transparent !important;
        color: #d1d8e0 !important;
      }
      
      /* 连线标签背景 - 增加半透明背景提高可读性 */
      .edgeLabel rect {
        fill: rgba(15, 23, 42, 0.8) !important;
        rx: 4px !important;
        ry: 4px !important;
      }

      /* 3. 针对节点内文本 */
      .node text, .node tspan, .node .label {
        font-family: "Times New Roman", "Noto Serif SC", serif !important;
        font-size: 11px !important;
        fill: #e8e8e8 !important;
      }

      /* 4. 优化连线样式 - 提高颜色亮度 */
      .edgePath .path {
        stroke: #8b95a8 !important;
        stroke-width: 1.5px !important;
        opacity: 0.8 !important;
      }
      .arrowheadPath {
        fill: #8b95a8 !important;
        opacity: 0.8 !important;
      }
      
      /* 5. 节点外框样式统一 */
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

const BACKEND_URL = 'http://localhost:8002';

interface Entry {
  id: number;
  topic: string;
  insight: string;
  diagram?: string;
  code_snippet?: string;
  topic_tag_id?: string;
  project_tag_id?: string;
  research_type?: string;
  energy_level: number;
  aha_moment?: number;
  timestamp: string;
  star_situation?: string;
  star_task?: string;
  star_action?: string;
  star_result?: string;
  custom_tags?: string[];
  related_tag_ids?: string[];
}

const Tag = ({ label, color }: { label: string; color: string }) => (
  <span style={{ 
    padding: '2px 8px', 
    background: `${color}15`, 
    border: `1px solid ${color}30`,
    borderRadius: '4px', 
    fontSize: '10px', 
    fontWeight: 500,
    color: color,
    letterSpacing: '0.5px'
  }}>
    {label.toUpperCase()}
  </span>
);

// 提取 Insight 首段（用于时间线卡片预览）
const extractPreview = (insight: string) => {
  // 移除 Markdown 标题标记（##、#）但保留文字
  const lines = insight.split('\n').filter(line => line.trim());
  const previewLines: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^#{1,3}\s*/g, '').trim();
    if (cleaned) {
      previewLines.push(cleaned);
    }
    if (previewLines.length >= 2) break; // 只取前两行
  }
  return previewLines.join(' · ');
};

// Insight 预览渲染组件（支持 Markdown 标题/正文解析）
const InsightPreview = ({ insight }: { insight: string }) => {
  const renderInsight = () => {
    const lines = insight.split('\n').filter(l => l.trim());
    const elements: JSX.Element[] = [];
    let count = 0;
    const maxChars = 150;
    let totalChars = 0;

    for (const line of lines) {
      if (totalChars >= maxChars) break;
      
      // 检测 Markdown 标题行 (### 或 ## 或 #)
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        const text = headingMatch[2].trim();
        totalChars += text.length;
        elements.push(
          <span key={count++} style={{
            display: 'inline',
            fontWeight: 600,
            color: '#E2E8F0',
            fontSize: '12px'
          }}>
            {text}
          </span>
        );
      } else if (!line.startsWith('```') && line.trim()) {
        const text = line.trim();
        totalChars += text.length;
        elements.push(
          <span key={count++} style={{
            display: 'inline',
            fontWeight: 400,
            color: '#94A3B8',
            fontSize: '12px'
          }}>
            {' '}{text}
          </span>
        );
      }
    }

    // 如果超长，在最后一个元素后加省略号
    if (totalChars > maxChars) {
      elements.push(<span key="ellipsis" style={{ color: '#64748b' }}>…</span>);
    }

    return elements;
  };

  return (
    <div style={{
      margin: 0,
      fontSize: '12px',
      lineHeight: '1.65',
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Times New Roman", sans-serif'
    }}>
      {renderInsight()}
    </div>
  );
};

// 时间线节点组件
const TimelineNode = ({ entry, onClick }: { entry: Entry; onClick: (e: Entry) => void }) => {
  const date = new Date(entry.timestamp);
  const timeStr = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  const researchTypeMap: Record<string, { label: string; color: string }> = {
    'deep-research': { label: '深度研究', color: '#fbbf24' },
    'topic-exploration': { label: '主题探索', color: '#34d399' },
    'domain-mapping': { label: '领域映射', color: '#a78bfa' }
  };
  const rType = researchTypeMap[entry.research_type || ''] || { label: '', color: '#94a3b8' };

  return (
    <div
      onClick={() => onClick(entry)}
      style={{
        display: 'flex',
        gap: '24px',
        cursor: 'pointer',
        padding: '16px 0',
        transition: 'all 0.2s'
      }}
    >
      {/* 左侧：时间点 */}
      <div style={{
        width: '60px',
        textAlign: 'right',
        paddingTop: '12px',
        flexShrink: 0
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: entry.energy_level >= 4 ? '#34d399' : '#fbbf24',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {timeStr}
        </span>
      </div>

      {/* 中间：时间线轴 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: entry.energy_level >= 4 ? '14px' : '10px',
          height: entry.energy_level >= 4 ? '14px' : '10px',
          borderRadius: '50%',
          background: entry.energy_level >= 4 ? '#34d399' : '#fbbf24',
          border: '3px solid #0F172A',
          boxShadow: `0 0 0 2px ${entry.energy_level >= 4 ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
          flexShrink: 0,
          zIndex: 2
        }} />
        {entry.aha_moment === 1 && (
          <span style={{ fontSize: '12px', marginTop: '2px' }}>💡</span>
        )}
      </div>

      {/* 右侧：卡片内容 */}
      <div style={{
        flex: 1,
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.2s',
        minWidth: 0
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#475569';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
      >
        {/* 标签行 */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {entry.topic_tag_id && <Tag label={entry.topic_tag_id.split('.').pop() || ''} color="#38bdf8" />}
          {entry.project_tag_id && <Tag label={entry.project_tag_id.split('.').pop() || ''} color="#818cf8" />}
          {entry.research_type && <Tag label={rType.label} color={rType.color} />}
        </div>

        {/* 标题 */}
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: '#F1F5F9', lineHeight: '1.4' }}>
          {entry.topic}
        </h3>

        {/* 洞察摘要 - Markdown 预览渲染 */}
        <InsightPreview insight={entry.insight} />
      </div>
    </div>
  );
};

// 复制按钮组件
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute',
        top: '6px',
        right: '12px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '10px',
        color: copied ? '#34d399' : '#9ca3af',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit'
      }}
      onMouseEnter={e => {
        if (!copied) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          e.currentTarget.style.color = '#e5e7eb';
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.color = '#9ca3af';
        }
      }}
    >
      {copied ? '✓ 已复制' : '复制'}
    </button>
  );
};

// Mermaid 渲染组件
const MermaidDiagram = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!chart) return;
    
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError('');
      } catch (err: any) {
        setError(err.message || '图表渲染失败');
        setSvg('');
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return <div style={{ color: '#ef4444', padding: '16px' }}>⚠️ {error}</div>;
  }

  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
};

// 详情弹窗组件
const DetailModal = ({ entry, onClose }: { entry: Entry | null; onClose: () => void }) => {
  const [mermaidReady, setMermaidReady] = useState(false);

  const markdownContent = useMemo(() => {
    if (!entry) return '';
    let md = `### 💡 核心洞察

${entry.insight}

`;
    if (entry.diagram) md += `### 📊 架构图表

\`\`\`mermaid
${entry.diagram}
\`\`\`

`;
    if (entry.star_situation) md += `### 📌 情境

${entry.star_situation}

`;
    if (entry.star_task) md += `### 🎯 任务

${entry.star_task}

`;
    if (entry.star_action) md += `### ⚡ 行动

${entry.star_action}

`;
    if (entry.star_result) md += `### ✅ 结果

${entry.star_result}

`;
    if (entry.code_snippet) md += `### 💻 代码实现

\`\`\`json
${entry.code_snippet}
\`\`\`

`;
    return md;
  }, [entry]);

  useEffect(() => {
    if (entry?.diagram && typeof window !== 'undefined') {
      setMermaidReady(false);
      mermaid.contentLoaded();
      setTimeout(() => setMermaidReady(true), 100);
    }
  }, [entry]);

  if (!entry) return null;

  const researchTypeMap: Record<string, { label: string; color: string }> = {
    'deep-research': { label: '深度研究', color: '#fbbf24' },
    'topic-exploration': { label: '主题探索', color: '#34d399' },
    'domain-mapping': { label: '领域映射', color: '#a78bfa' }
  };
  const rType = researchTypeMap[entry.research_type || ''] || { label: '', color: '#94a3b8' };
  const dateTime = new Date(entry.timestamp);
  const dateStr = `${dateTime.getFullYear()}/${dateTime.getMonth()+1}/${dateTime.getDate()}`;
  const timeStr = `${String(dateTime.getHours()).padStart(2,'0')}:${String(dateTime.getMinutes()).padStart(2,'0')}:${String(dateTime.getSeconds()).padStart(2,'0')}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: '16px',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部栏 */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {entry.topic_tag_id && <Tag label={entry.topic_tag_id.split('.').pop() || ''} color="#38bdf8" />}
              {entry.research_type && <Tag label={rType.label} color={rType.color} />}
              <Tag label={`能量 ${entry.energy_level}`} color={entry.energy_level >= 4 ? '#34d399' : '#fb7185'} />
              {entry.aha_moment === 1 && <span style={{ fontSize: '14px' }}>💡</span>}
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: '#F8FAFC', lineHeight: '1.3' }}>
              {entry.topic}
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {dateStr} {timeStr}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#334155',
              border: 'none',
              color: '#94A3B8',
              fontSize: '18px',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#475569'; e.currentTarget.style.color = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            ×
          </button>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
          {/* 统一 Markdown 渲染（含 Mermaid） */}
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#CBD5E1',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif'
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#F1F5F9',
                    margin: '32px 0 16px 0',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #334155',
                    letterSpacing: '-0.02em'
                  }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#F1F5F9',
                    margin: '28px 0 14px 0',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #334155',
                    letterSpacing: '-0.01em'
                  }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#E2E8F0',
                    margin: '24px 0 12px 0',
                    letterSpacing: '-0.01em'
                  }}>{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#CBD5E1',
                    margin: '20px 0 10px 0'
                  }}>{children}</h4>
                ),
                p: ({ children }) => (
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.75',
                    color: '#CBD5E1',
                    margin: '0 0 16px 0'
                  }}>{children}</p>
                ),
                ul: ({ children }) => (
                  <ul style={{
                    fontSize: '14px',
                    lineHeight: '1.75',
                    color: '#CBD5E1',
                    margin: '0 0 16px 0',
                    paddingLeft: '24px'
                  }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{
                    fontSize: '14px',
                    lineHeight: '1.75',
                    color: '#CBD5E1',
                    margin: '0 0 16px 0',
                    paddingLeft: '24px'
                  }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ margin: '6px 0' }}>{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: '4px solid #475569',
                    paddingLeft: '16px',
                    margin: '20px 0',
                    color: '#94A3B8',
                    fontSize: '14px',
                    lineHeight: '1.75',
                    background: 'rgba(51, 65, 85, 0.3)',
                    padding: '12px 16px',
                    borderRadius: '0 8px 8px 0'
                  }}>{children}</blockquote>
                ),
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ fontStyle: 'italic', color: '#94A3B8' }}>{children}</em>
                ),
                a: ({ children, href }) => (
                  <a href={href} style={{
                    color: '#38bdf8',
                    textDecoration: 'none',
                    borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
                    transition: 'border-color 0.2s'
                  }} onMouseEnter={e => { (e.target as HTMLAnchorElement).style.borderColor = '#38bdf8'; }}
                   onMouseLeave={e => { (e.target as HTMLAnchorElement).style.borderColor = 'rgba(56, 189, 248, 0.3)'; }}
                  >{children}</a>
                ),
                hr: () => (
                  <hr style={{
                    border: 'none',
                    borderTop: '1px solid #334155',
                    margin: '24px 0'
                  }} />
                ),
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isTextDiagram = typeof children === 'string' && (children.includes('┌') || children.includes('──'));
                  if (!inline && match) {
                    if (match[1] === 'mermaid') {
                      return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                    }
                    if (isTextDiagram) {
                      return (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          margin: '20px 0'
                        }}>
                          <pre style={{
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                            border: '2px solid #e94560',
                            borderRadius: '12px',
                            padding: '24px',
                            overflow: 'auto',
                            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                            fontSize: '13px',
                            lineHeight: '1.8',
                            color: '#00d9ff',
                            boxShadow: '0 8px 32px rgba(233, 69, 96, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            maxWidth: '100%',
                            textAlign: 'left'
                          }}><code>{children}</code></pre>
                        </div>
                      );
                    }
                    return (
                      <div 
                        style={{
                          position: 'relative',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          margin: '16px 0',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}
                        onMouseEnter={e => {
                          const btn = (e.currentTarget as HTMLDivElement).querySelector('[data-copy-btn]');
                          if (btn) (btn as HTMLElement).style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          const btn = (e.currentTarget as HTMLDivElement).querySelector('[data-copy-btn]');
                          if (btn) (btn as HTMLElement).style.opacity = '0';
                        }}
                      >
                        <div style={{
                          background: 'linear-gradient(to bottom, #374151, #1f2937)',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9ca3af' }}>{match[1]}</span>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', background: '#0d1117', fontSize: '13px', lineHeight: '1.6' }}
                          {...props}
                        >{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                        <div data-copy-btn style={{ opacity: 0, transition: 'opacity 0.2s' }}>
                          <CopyButton text={String(children).replace(/\n$/, '')} />
                        </div>
                      </div>
                    );
                  }
                  return <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'Menlo, Monaco, monospace', fontSize: '0.9em', color: '#38bdf8' }} {...props}>{children}</code>;
                }
              }}
            >{markdownContent}</ReactMarkdown>
          </div>

          {/* 自定义标签 */}
          {entry.custom_tags && entry.custom_tags.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>🏷️ 标签</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {entry.custom_tags.map((t, i) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: '16px', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', fontSize: '12px' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; id: string } | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 30;
  const offsetRef = useRef(0); // 同步 ref 用于闭包

  const mainRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadEntries(true);
    }
  }, []);

  const loadEntriesRef = useRef<(reset?: boolean) => void>();

  const loadEntries = (reset = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(reset);

    const currentOffset = reset ? 0 : offsetRef.current;
    fetch(`${BACKEND_URL}/api/entries?limit=${limit}&offset=${currentOffset}`)
      .then(res => res.json())
      .then(data => {
        const newEntries = Array.isArray(data) ? data : [];
        const newIds = new Set(newEntries.map(e => e.id));
        setEntries(prev => {
          const filtered = prev.filter(e => !newIds.has(e.id));
          return reset ? newEntries : [...filtered, ...newEntries];
        });
        const nextOffset = reset ? limit : offsetRef.current + limit;
        setOffset(nextOffset);
        offsetRef.current = nextOffset;
        if (newEntries.length < limit) hasMoreRef.current = false;
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
      });
  };

  loadEntriesRef.current = loadEntries;

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 400 && hasMoreRef.current && !isLoadingRef.current) {
        setLoadingMore(true);
        loadEntriesRef.current?.();
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // 按日期分组
  const groupedEntries = useMemo(() => {
    const filtered = entries.filter(e => {
      if (!activeFilter) return true;
      if (activeFilter.type === 'research') return e.research_type === activeFilter.id;
      if (activeFilter.type === 'project') return e.project_tag_id === activeFilter.id;
      if (activeFilter.type === 'tag') return e.topic_tag_id === activeFilter.id || e.related_tag_ids?.includes(activeFilter.id);
      return true;
    });

    const groups: Record<string, Entry[]> = {};
    filtered.forEach(e => {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [entries, activeFilter]);

  const RESEARCH_TYPES = [
    { id: 'deep-research', label: '深度研究', color: '#fbbf24' },
    { id: 'topic-exploration', label: '主题探索', color: '#34d399' },
    { id: 'domain-mapping', label: '领域映射', color: '#a78bfa' }
  ];

  return (
    <div style={{ height: '100vh', background: '#0F172A', color: '#F8FAFC', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部导航栏 */}
      <header style={{ borderBottom: '1px solid #1E293B', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.5px' }}>📚 学习日志</span>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#1E293B', color: '#64748b' }}>时间线</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {RESEARCH_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveFilter(activeFilter?.id === type.id ? null : { type: 'research', id: type.id })}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: activeFilter?.id === type.id ? 'none' : '1px solid #334155',
                background: activeFilter?.id === type.id ? type.color : 'transparent',
                color: activeFilter?.id === type.id ? '#0F172A' : '#64748b',
                fontSize: '12px',
                fontWeight: activeFilter?.id === type.id ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: activeFilter?.id === type.id ? '#0F172A' : type.color }}></span>
              {type.label}
            </button>
          ))}
          {activeFilter && (
            <button onClick={() => setActiveFilter(null)} style={{ fontSize: '11px', color: '#475569', cursor: 'pointer', background: 'none', border: 'none', padding: '4px 8px' }}>
              清除
            </button>
          )}
        </div>
      </header>

      {/* 时间线内容 */}
      <main
        ref={mainRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px 28px 40px',
          minHeight: 0 // 修复 flex 子元素溢出问题
        }}>
        {loading && entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#475569' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            正在加载学习记录...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#475569' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌌</div>
            <p>暂无灵感记录</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedEntries).map(([date, dayEntries]) => (
              <div key={date} style={{ marginBottom: '32px' }}>
                {/* 日期头 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '8px',
                  paddingLeft: '84px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#64748b',
                    letterSpacing: '0.5px'
                  }}>
                    {date}
                  </span>
                  <span style={{ fontSize: '11px', color: '#475569' }}>{dayEntries.length} 条记录</span>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, #334155, transparent)' }} />
                </div>

                {/* 该日记录 */}
                <div style={{ position: 'relative', marginLeft: '60px', borderLeft: '2px solid #1E293B', paddingLeft: '24px' }}>
                  {dayEntries.map((entry) => (
                    <TimelineNode key={entry.id} entry={entry} onClick={setSelected} />
                  ))}
                </div>
              </div>
            ))}
            {/* 加载指示器 */}
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                {' '}加载中...
              </div>
            )}
            {!hasMoreRef.current && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#475569', fontSize: '12px' }}>
                — 已加载全部 {entries.length} 条记录 —
              </div>
            )}
          </>
        )}
      </main>

      <DetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
