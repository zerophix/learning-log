'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconNetwork, IconList } from '@/components/ui/Icons';

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
            background: pathname === item.path ? '#38bdf8' : 'transparent',
            color: pathname === item.path ? '#0F172A' : '#64748b',
            fontSize: '12px',
            fontWeight: pathname === item.path ? 600 : 400,
            textDecoration: 'none',
            transition: 'all 0.2s',
            border: pathname === item.path ? 'none' : '1px solid #334155',
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
