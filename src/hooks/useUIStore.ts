import { useState, useCallback } from 'react';
import type { SortKey, DifficultyFilter, GridSizeFilter } from '../pages/HomePage';

/**
 * 应用级 UI 状态：分类、搜索、排序、筛选。
 *
 * 这些状态在多个页面共享（HomePage / Navbar / CommandPalette），
 * 提升到独立 hook 避免在 App.tsx 与子组件之间层层传递。
 *
 * 状态在 App 挂载期间持久化（页面切换不丢失），但不持久化到 localStorage
 * —— 用户每次进入站点看到默认状态，避免陈旧筛选造成困惑。
 */
export function useUIStore() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [gridSize, setGridSize] = useState<GridSizeFilter>('all');
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  /** 清空所有筛选，回到初始状态 */
  const resetFilters = useCallback(() => {
    setSortKey('default');
    setDifficulty('all');
    setGridSize('all');
    setColorFilter(null);
  }, []);

  /** 清空搜索词 */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    difficulty,
    setDifficulty,
    gridSize,
    setGridSize,
    colorFilter,
    setColorFilter,
    resetFilters,
    clearSearch,
  };
}

export type UIStore = ReturnType<typeof useUIStore>;
