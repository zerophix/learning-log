'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';

interface DetailModalProps {
  entry: {
    id: number;
    topic: string;
    insight: string;
    diagram?: string;
    code_snippet?: string;
    star_situation?: string;
    star_task?: string;
    star_action?: string;
    star_result?: string;
    topic_tag_id: string;
    project_tag_id?: string;
    research_type: string;
    energy_level: number;
    aha_moment: number;
    timestamp: string;
    custom_tags: string[];
  } | null;
  onClose: () => void;
}

export default function DetailModal({ entry, onClose }: DetailModalProps) {
  const [mermaidInitialized, setMermaidInitialized] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });
    setMermaidInitialized(true);
  }, []);

  useEffect(() => {
    if (entry?.diagram && mermaidInitialized) {
      mermaid.run();
    }
  }, [entry?.diagram, mermaidInitialized]);

  if (!entry) return null;

  // 格式化 Markdown 内容
  const formatMarkdownContent = () => {
    let content = `# ${entry.topic}\n\n`;
    
    // 洞察内容
    content += `## 💡 核心洞察

${entry.insight}

`;
    
    // STAR 结构化内容
    if (entry.star_situation || entry.star_task || entry.star_action || entry.star_result) {
      content += `## 📋 STAR 分析\n\n`;
      if (entry.star_situation) {
        content += `### S - 情境\n${entry.star_situation}\n\n`;
      }
      if (entry.star_task) {
        content += `### T - 任务\n${entry.star_task}\n\n`;
      }
      if (entry.star_action) {
        content += `### A - 行动\n${entry.star_action}\n\n`;
      }
      if (entry.star_result) {
        content += `### R - 结果\n${entry.star_result}\n\n`;
      }
    }
    
    // 代码片段
    if (entry.code_snippet) {
      content += `## 💻 代码实现

\`\`\`json
${entry.code_snippet}
\`\`\`

`;
    }
    
    return content;
  };

  // 自定义 Markdown 渲染组件
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const isTextDiagram = children[0]?.includes('┌') || children[0]?.includes('──');
      
      if (!inline && match) {
        // 文字图用语法块包裹
        if (isTextDiagram) {
          return (
            <pre style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '16px',
              overflow: 'auto',
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#e2e8f0'
            }}>
              <code>{children}</code>
            </pre>
          );
        }
        
        // 代码块高亮（macOS 风格）
        return (
          <div style={{
            borderRadius: '8px',
            overflow: 'hidden',
            margin: '16px 0',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(to bottom, #374151, #1f2937)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9ca3af' }}>{match[1]}</span>
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: '0 0 8px 8px',
                background: '#1e1e1e',
                fontSize: '13px',
                lineHeight: '1.6'
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      // 行内代码
      return (
        <code style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          fontSize: '0.9em',
          color: '#38bdf8'
        }} {...props}>
          {children}
        </code>
      );
    },
    
    h1({ children }) {
      return (
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#f1f5f9',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '2px solid rgba(56,189,248,0.3)'
        }}>
          {children}
        </h1>
      );
    },
    
    h2({ children }) {
      return (
        <h2 style={{
          fontSize: '22px',
          fontWeight: 600,
          color: '#e2e8f0',
          marginTop: '32px',
          marginBottom: '16px'
        }}>
          {children}
        </h2>
      );
    },
    
    h3({ children }) {
      return (
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#cbd5e1',
          marginTop: '24px',
          marginBottom: '12px'
        }}>
          {children}
        </h3>
      );
    },
    
    p({ children }) {
      return (
        <p style={{
          fontSize: '14px',
          lineHeight: '1.8',
          color: '#cbd5e1',
          marginBottom: '16px'
        }}>
          {children}
        </p>
      );
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#f1f5f9',
              margin: 0
            }}>
              {entry.topic}
            </h2>
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px',
              fontSize: '13px'
            }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(52,211,153,0.15)',
                color: '#34d399'
              }}>
                {entry.research_type}
              </span>
              <span style={{ color: '#94a3b8' }}>
                精力值: {entry.energy_level}
              </span>
              {entry.aha_moment === 1 && (
                <span style={{ color: '#fbbf24' }}>💡 顿悟时刻</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            ✕
          </button>
        </div>

        {/* 内容区域 */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px'
        }}>
          {/* Mermaid 流程图 */}
          {entry.diagram && (
            <div style={{
              marginBottom: '32px',
              padding: '24px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: '16px'
              }}>
                📊 流程图
              </div>
              <div 
                className="mermaid"
                style={{
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                {entry.diagram}
              </div>
            </div>
          )}

          {/* Markdown 内容 */}
          <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={components}
            >
              {formatMarkdownContent()}
            </ReactMarkdown>
          </div>

          {/* 标签 */}
          {entry.custom_tags && entry.custom_tags.length > 0 && (
            <div style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: '12px'
              }}>
                🏷️ 标签
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {entry.custom_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      background: 'rgba(56,189,248,0.15)',
                      color: '#38bdf8',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
