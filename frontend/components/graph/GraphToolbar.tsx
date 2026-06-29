'use client';

import type { EnhancedGraphViewType, EdgeTypeFilter, ResearchType } from '@/types/graph';
import type { EnhancedTimeRangePreset } from '@/types/graph';
import { IconRefresh } from '@/components/ui/Icons';
import styles from '@/styles/GraphToolbar.module.css';

const VIEW_LABELS: Record<EnhancedGraphViewType, string> = {
  force: '力导向图',
  timeline: '时间线',
  galaxy: '星系图',
};

interface GraphToolbarProps {
  viewType: EnhancedGraphViewType;
  showEdges: boolean;
  showLabels: boolean;
  showClusterPanel: boolean;
  edgeTypeFilter: EdgeTypeFilter;
  searchQuery: string;
  clusterCount: number;
  hasActiveFilters: boolean;
  filterResearchType: string | undefined;
  filterEnergyRange: string | undefined;
  filterTimeRange: string | undefined;
  onViewChange: (type: EnhancedGraphViewType) => void;
  onToggleEdges: () => void;
  onToggleLabels: () => void;
  onEdgeTypeFilterChange: (filter: EdgeTypeFilter) => void;
  onSearchChange: (query: string) => void;
  onToggleClusterPanel: () => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  onFilterResearchType: (val: string) => void;
  onFilterEnergy: (val: string) => void;
  onFilterTime: (val: string) => void;
}

export default function GraphToolbar({
  viewType, showEdges, showLabels, showClusterPanel, edgeTypeFilter,
  searchQuery, clusterCount, hasActiveFilters,
  filterResearchType, filterEnergyRange, filterTimeRange,
  onViewChange, onToggleEdges, onToggleLabels,
  onEdgeTypeFilterChange, onSearchChange,
  onToggleClusterPanel, onClearFilters, onRefresh,
  onFilterResearchType, onFilterEnergy, onFilterTime,
}: GraphToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* 视图切换 */}
      <div className={styles.viewGroup}>
        {(['force', 'timeline', 'galaxy'] as EnhancedGraphViewType[]).map(type => (
          <button
            key={type}
            onClick={() => onViewChange(type)}
            title={`${VIEW_LABELS[type]} (${type === 'force' ? '1' : type === 'timeline' ? '2' : '3'})`}
            className={`${styles.viewBtn} ${viewType === type ? styles.viewBtnActive : ''}`}
          >
            {VIEW_LABELS[type]}
          </button>
        ))}
      </div>

      <span className={styles.divider} />

      {/* 筛选器 */}
      <div className={styles.filterGroup}>
        <select
          value={filterResearchType || ''}
          onChange={e => onFilterResearchType(e.target.value)}
          className={styles.select}
        >
          <option value="">类型</option>
          <option value="deep-research">深度研究</option>
          <option value="topic-exploration">主题探索</option>
          <option value="domain-mapping">领域映射</option>
        </select>

        <select
          value={filterEnergyRange || ''}
          onChange={e => onFilterEnergy(e.target.value)}
          className={styles.select}
        >
          <option value="">能量</option>
          <option value="4-5">高 (4-5)</option>
          <option value="3-3">中 (3)</option>
          <option value="1-2">低 (1-2)</option>
        </select>

        <select
          value={filterTimeRange || ''}
          onChange={e => onFilterTime(e.target.value)}
          className={styles.select}
        >
          <option value="">时间</option>
          <option value="7d">7天</option>
          <option value="30d">30天</option>
          <option value="90d">90天</option>
        </select>
      </div>

      <span className={styles.divider} />

      {/* 显示控制 */}
      <div className={styles.controlGroup}>
        <button
          onClick={onToggleEdges}
          title="显示/隐藏边"
          className={`${styles.toggleBtn} ${showEdges ? styles.toggleBtnActive : ''}`}
        >
          E {showEdges ? '✓' : '✗'}
        </button>
        <button
          onClick={onToggleLabels}
          title="显示/隐藏标签"
          className={`${styles.toggleBtn} ${showLabels ? styles.toggleBtnActive : ''}`}
        >
          L {showLabels ? '✓' : '✗'}
        </button>
      </div>

      {/* 边类型筛选 */}
      <select
        value={edgeTypeFilter}
        onChange={e => onEdgeTypeFilterChange(e.target.value as EdgeTypeFilter)}
        className={`${styles.edgeSelect} ${edgeTypeFilter !== 'all' ? styles.edgeSelectActive : ''}`}
      >
        <option value="all">全部</option>
        <option value="trigger">触发链</option>
        <option value="concept_jump">概念跃迁</option>
        <option value="content">内容相似</option>
        <option value="tags">标签重叠</option>
        <option value="temporal">时间相邻</option>
      </select>

      {/* 搜索框 */}
      <div className={styles.searchWrap}>
        <input
          type="text"
          placeholder="搜索节点... (⌘F)"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className={`${styles.searchInput} ${searchQuery ? styles.searchInputActive : ''}`}
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className={styles.searchClear}>
            ×
          </button>
        )}
      </div>

      {/* 聚类面板切换 */}
      <button
        onClick={onToggleClusterPanel}
        title="聚类列表"
        className={`${styles.clusterBtn} ${showClusterPanel ? styles.clusterBtnActive : ''}`}
      >
        ☰ {clusterCount} 聚类
      </button>

      {/* 清除筛选 */}
      {hasActiveFilters && (
        <button onClick={onClearFilters} className={styles.clearBtn}>
          清除
        </button>
      )}

      {/* 刷新 */}
      <button onClick={onRefresh} title="刷新 (R)" className={styles.refreshBtn}>
        <IconRefresh size={12} /> R
      </button>
    </div>
  );
}
