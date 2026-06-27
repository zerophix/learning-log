'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CodeBlock from '@/components/renderers/CodeBlock';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div style={{
      fontSize: '14px',
      lineHeight: '1.8',
      color: 'var(--text-secondary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif'
    }}>
      <ErrorBoundary fallback={<div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>内容渲染异常，请检查 Markdown 语法</div>}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '32px 0 16px 0',
              paddingBottom: '12px',
              borderBottom: '2px solid var(--border-color)',
              letterSpacing: '-0.02em'
            }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '28px 0 14px 0',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)',
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
              color: 'var(--text-secondary)',
              margin: '20px 0 10px 0'
            }}>{children}</h4>
          ),
          p: ({ children }) => (
            <p style={{
              fontSize: '14px',
              lineHeight: '1.75',
              color: 'var(--text-secondary)',
              margin: '0 0 16px 0'
            }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{
              fontSize: '14px',
              lineHeight: '1.75',
              color: 'var(--text-secondary)',
              margin: '0 0 16px 0',
              paddingLeft: '24px'
            }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{
              fontSize: '14px',
              lineHeight: '1.75',
              color: 'var(--text-secondary)',
              margin: '0 0 16px 0',
              paddingLeft: '24px'
            }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ margin: '6px 0' }}>{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '4px solid var(--border-color)',
              paddingLeft: '16px',
              margin: '20px 0',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              lineHeight: '1.75',
              background: 'rgba(51, 65, 85, 0.3)',
              padding: '12px 16px',
              borderRadius: '0 8px 8px 0'
            }}>{children}</blockquote>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{children}</em>
          ),
          a: ({ children, href }) => (
            <a href={href} style={{
              color: 'var(--accent-sky)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
              transition: 'border-color 0.2s'
            }} onMouseEnter={e => { (e.target as HTMLAnchorElement).style.borderColor = 'var(--accent-sky)'; }}
               onMouseLeave={e => { (e.target as HTMLAnchorElement).style.borderColor = 'rgba(56, 189, 248, 0.3)'; }}
            >{children}</a>
          ),
          hr: () => (
            <hr style={{
              border: 'none',
              borderTop: '1px solid var(--border-color)',
              margin: '24px 0'
            }} />
          ),
          code: ({ node, inline, className, children, ...props }: { node?: any; inline?: boolean; className?: string; children?: React.ReactNode }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isTextDiagram = typeof children === 'string' && (children.includes('┌') || children.includes('──'));
            if (!inline && match) {
              if (match[1] === 'mermaid') {
                // diagram 由 EntryDetail 独立管理，insight 中的 mermaid 代码块降级为纯文本
                return null;
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
              return <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} />;
            }
            return <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'Menlo, Monaco, monospace', fontSize: '0.9em', color: 'var(--accent-sky)' }} {...props}>{children}</code>;
          }
        }}
      >{content}</ReactMarkdown>
      </ErrorBoundary>
    </div>
  );
}
