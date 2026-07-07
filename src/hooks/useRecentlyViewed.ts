import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

const STORAGE_KEY = 'beads-recently-viewed';
const MAX_ITEMS = 8;

function loadRecentlyViewed(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const ids = JSON.parse(data);
      return Array.isArray(ids)
        ? ids.filter((x: unknown): x is string => typeof x === 'string').slice(0, MAX_ITEMS)
        : [];
    }
  } catch {
    // 损坏数据回退默认值
  }
  return [];
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = usePersistentState(STORAGE_KEY, loadRecentlyViewed);

  const addRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed(prev => [id, ...prev.filter(v => v !== id)].slice(0, MAX_ITEMS));
  }, [setRecentlyViewed]);

  const removeRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed(prev => prev.filter(v => v !== id));
  }, [setRecentlyViewed]);

  return { recentlyViewed, addRecentlyViewed, removeRecentlyViewed };
}
