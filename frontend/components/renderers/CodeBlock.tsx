'use client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CopyButton from '@/components/ui/CopyButton';

export default function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div
      className="code-block-wrapper"
      style={{
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '16px 0',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
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
        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9ca3af' }}>{language}</span>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', background: '#0d1117', fontSize: '13px', lineHeight: '1.6' }}
      >{code}</SyntaxHighlighter>
      <div className="copy-btn-container">
        <CopyButton text={code} />
      </div>
    </div>
  );
}
