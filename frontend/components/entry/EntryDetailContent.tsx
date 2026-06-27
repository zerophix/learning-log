'use client';
import MarkdownRenderer from '@/components/renderers/MarkdownRenderer';
import MermaidDiagram from '@/components/renderers/MermaidDiagram';
import { IconTag } from '@/components/ui/Icons';
import type { Entry } from '@/types';

export default function EntryDetailContent({ entry, markdownContent }: { entry: Entry; markdownContent: string }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
      <MarkdownRenderer content={markdownContent} />

      {entry.diagram && (
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '28px 0 14px 0',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            letterSpacing: '-0.01em'
          }}>架构图表</h3>
          <MermaidDiagram chart={entry.diagram} />
        </div>
      )}

      {entry.custom_tags && entry.custom_tags.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconTag size={12} />
            标签
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {entry.custom_tags.map((t, i) => (
              <span key={i} style={{ padding: '4px 10px', borderRadius: '16px', background: 'rgba(56,189,248,0.12)', color: 'var(--accent-sky)', fontSize: '12px' }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
