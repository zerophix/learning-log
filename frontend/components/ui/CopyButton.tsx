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
      className="copy-btn"
      style={{
        color: copied ? 'var(--accent-emerald)' : '#9ca3af',
        position: 'absolute', top: '6px', right: '12px'
      }}
    >
      {copied ? '✓ 已复制' : '复制'}
    </button>
  );
}
