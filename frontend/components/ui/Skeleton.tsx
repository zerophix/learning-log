'use client';

export function SkeletonLine({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return (
    <div
      className="skeleton-line"
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? '60%' : i === lines - 1 ? '40%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '0 auto' }}>
        <SkeletonLine width="200px" height="24px" />
        <SkeletonLine />
        <SkeletonLine width="80%" />
        <SkeletonLine width="60%" />
      </div>
    </div>
  );
}
