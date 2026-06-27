'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconNetwork, IconList, IconTag } from '@/components/ui/Icons';

export default function Navigation() {
  const pathname = usePathname();
  
  const navItems = [
    { 
      path: '/', 
      label: '时间线',
      icon: <IconBook size={16} color="currentColor" />
    },
    { 
      path: '/graph', 
      label: '图谱',
      icon: <IconNetwork size={16} color="currentColor" />
    },
    { 
      path: '/feed', 
      label: 'Feed',
      icon: <IconList size={16} color="currentColor" />
    },
    { 
      path: '/tags', 
      label: '标签',
      icon: <IconTag size={16} color="currentColor" />
    }
  ];

  return (
    <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {navItems.map(item => (
        <Link
          key={item.path}
          href={item.path}
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            background: pathname === item.path ? 'var(--accent-sky)' : 'transparent',
            color: pathname === item.path ? 'var(--bg-primary)' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: pathname === item.path ? 600 : 400,
            textDecoration: 'none',
            transition: 'all 0.2s',
            border: pathname === item.path ? 'none' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
