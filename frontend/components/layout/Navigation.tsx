'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  const navItems = [
    { path: '/', label: '📚 时间线', icon: '📚' },
    { path: '/graph', label: '🕸️ 图谱', icon: '🕸️' },
    { path: '/feed', label: '📰 Feed', icon: '📰' }
  ];

  return (
    <nav style={{ display: 'flex', gap: '8px' }}>
      {navItems.map(item => (
        <Link
          key={item.path}
          href={item.path}
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            background: pathname === item.path ? '#38bdf8' : 'transparent',
            color: pathname === item.path ? '#0F172A' : '#64748b',
            fontSize: '12px',
            fontWeight: pathname === item.path ? 600 : 400,
            textDecoration: 'none',
            transition: 'all 0.2s',
            border: pathname === item.path ? 'none' : '1px solid #334155'
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
