'use client';
import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
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
        color: copied ? 'var(--accent-emerald)' : '#9ca3af',
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
}
