'use client';

import { NavItem } from '@/lib/navigation';

interface HeaderProps {
  breadcrumb: NavItem[];
  onNavigate: (index: number) => void;
  onNewEntry: () => void;
  activeView: 'timeline' | 'graph';
  setActiveView: (view: 'timeline' | 'graph') => void;
  hideToggle?: boolean;
}

export default function Header({ breadcrumb, onNavigate, onNewEntry, activeView, setActiveView, hideToggle }: HeaderProps) {
  return (
    <header className="header">
      <button className="header-btn" onClick={onNewEntry} title="新建学习记录">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      
      {/* 面包屑导航 */}
      <div className="breadcrumb">
        {breadcrumb.map((item, index) => (
          <div key={index} className="breadcrumb-group">
            {index > 0 && <span className="breadcrumb-sep">›</span>}
            <button
              className={`breadcrumb-item ${index === breadcrumb.length - 1 ? 'active' : ''}`}
              onClick={() => onNavigate(index)}
              disabled={index === breadcrumb.length - 1}
            >
              {item.label}
            </button>
          </div>
        ))}
      </div>
      
      {/* 视图切换（仅第二层显示） */}
      {!hideToggle && (
        <div className="view-toggle">
          <button
            className={`toggle-btn ${activeView === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveView('graph')}
            title="力导向图视图"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="5" cy="12" r="3" />
              <circle cx="19" cy="6" r="3" />
              <circle cx="12" cy="18" r="3" />
              <line x1="8" y1="10" x2="16" y2="8" />
              <line x1="7" y1="14" x2="11" y2="16" />
            </svg>
            图形
          </button>
          <button
            className={`toggle-btn ${activeView === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveView('timeline')}
            title="时间线视图"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <circle cx="12" cy="8" r="2" fill="currentColor" />
              <circle cx="12" cy="16" r="2" fill="currentColor" />
            </svg>
            时间线
          </button>
        </div>
      )}
    </header>
  );
}
