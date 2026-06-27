'use client';
import type { ReactNode } from 'react';

export default function PageHeader({ icon, title, badge, children }: { icon: ReactNode; title: string; badge?: string; children?: ReactNode }) {
  return (
    <header style={{ borderBottom: '1px solid var(--bg-secondary)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icon}
          <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>{title}</span>
        </div>
        {badge && (
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-sky)', fontWeight: 500, border: '1px solid rgba(56, 189, 248, 0.2)' }}>{badge}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {children}
      </div>
    </header>
  );
}
