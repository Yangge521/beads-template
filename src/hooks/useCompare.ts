import { useCallback, useEffect, useState } from 'react';
import { useStorageSync } from './useStorageSync';

const STORAGE_KEY = 'beads-compare-list';
const MAX_COMPARE = 4;

/**
 * 模板对比列表 hook
 * 最多 4 个模板，localStorage 持久化 + 跨标签同步。
 */
export function useCompare() {
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as string[] : [];
    } catch {
      return [];
    }
  });

  // 持久化 + 跨标签同步
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    } catch {
      // ignore
    }
  }, [compareIds]);

  useStorageSync(STORAGE_KEY, (e) => {
    try {
      const raw = e.newValue;
      setCompareIds(raw ? JSON.parse(raw) as string[] : []);
    } catch {
      // ignore
    }
  });

  const addToCompare = useCallback((id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev;
      if (prev.length >= MAX_COMPARE) {
        // 满了则移除最早的
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setCompareIds(prev => prev.filter(x => x !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
  }, []);

  const isInCompare = useCallback((id: string) => compareIds.includes(id), [compareIds]);

  return {
    compareIds,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    isFull: compareIds.length >= MAX_COMPARE,
    maxCompare: MAX_COMPARE,
  };
}
