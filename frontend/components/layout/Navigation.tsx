'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconNetwork, IconCluster } from '@/components/ui/Icons';

export default function Navigation() {
  const pathname = usePathname();
  
  const navItems = [
    { 
      path: '/', 
      label: '时间线',
      icon: <IconBook size={16} color="currentColor" />
    },
    { 
      path: '/tags', 
      label: '语义聚类',
      icon: <IconCluster size={16} color="currentColor" />
    },
    { 
      path: '/graph', 
      label: '图谱',
      icon: <IconNetwork size={16} color="currentColor" />
    }
  ];

  return (
    <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {navItems.map(item => (
        <Link
          key={item.path}
          href={item.path}
          className={pathname === item.path ? 'nav-link nav-link-active' : 'nav-link nav-link-inactive'}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
