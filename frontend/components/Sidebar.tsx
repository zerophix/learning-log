'use client';

import { useState } from 'react';
import { FilterCategory } from '@/types';

interface SidebarProps {
  categories: FilterCategory[];
  onFilterChange: (minEnergy: number) => void;
  onCategoryToggle: (category: string | null) => void;
  activeCategory: string | null;
  totalNodes: number;
  totalEdges: number;
  activeProject: string | null;
  onProjectSelect: (projectId: string | null) => void;
  currentNodeId: string | null; // 当前下钻的节点 ID
}

export default function Sidebar({ 
  categories, 
  onFilterChange, 
  onCategoryToggle, 
  activeCategory,
  totalNodes, 
  totalEdges,
  activeProject,
  onProjectSelect,
  currentNodeId
}: SidebarProps) {
  const [energyValue, setEnergyValue] = useState(1);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setEnergyValue(val);
    onFilterChange(val);
  };

  return (
    <aside className="sidebar-float">
      <div className="sidebar-float-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        知识透视
      </div>

      <div className="filter-section">
        <div className="filter-label">节点类型 (点击筛选)</div>
        {categories.map((cat, idx) => (
          <div 
            key={idx} 
            className={`filter-item ${activeCategory === cat.label ? 'active' : ''}`}
            onClick={() => onCategoryToggle(activeCategory === cat.label ? null : cat.label)}
          >
            <span className="filter-dot" style={{ background: cat.color }} />
            <span>{cat.label}</span>
            <span className="filter-count">{cat.count}</span>
          </div>
        ))}
      </div>

      <div className="divider" />

      <div className="filter-section">
        <div className="filter-label">精力过滤</div>
        <div className="range-wrapper">
          <input
            type="range"
            className="range-slider"
            min={1}
            max={5}
            value={energyValue}
            onChange={handleRangeChange}
          />
          <span className="range-value">{energyValue}</span>
        </div>
        <div className="range-hint">仅显示精力≥此值的节点</div>
      </div>

      <div className="divider" />

      {/* 项目维度筛选：仅在计科学科（level=1）或其子节点下显示 */}
      {(currentNodeId?.includes('.discipline.cs') || activeCategory === '计科' || !activeCategory) && (
        <div className="filter-section">
          <div className="filter-label">项目维度 (仅限计科)</div>
          <div 
            className={`filter-item ${activeProject === 'business' ? 'active' : ''}`}
            onClick={() => onProjectSelect(activeProject === 'business' ? null : 'business')}
          >
            <span className="filter-dot" style={{ background: '#34d399' }} />
            <span>业务项目</span>
          </div>
          <div 
            className={`filter-item ${activeProject === 'source-code' ? 'active' : ''}`}
            onClick={() => onProjectSelect(activeProject === 'source-code' ? null : 'source-code')}
          >
            <span className="filter-dot" style={{ background: '#818cf8' }} />
            <span>源码项目</span>
          </div>
          <div 
            className={`filter-item ${activeProject === 'component' ? 'active' : ''}`}
            onClick={() => onProjectSelect(activeProject === 'component' ? null : 'component')}
          >
            <span className="filter-dot" style={{ background: '#fbbf24' }} />
            <span>组件项目</span>
          </div>
        </div>
      )}

      <div className="divider" />

      <div className="sidebar-stats">
        Nodes: <span>{totalNodes}</span> | Edges: <span className="links">{totalEdges}</span>
      </div>
    </aside>
  );
}
