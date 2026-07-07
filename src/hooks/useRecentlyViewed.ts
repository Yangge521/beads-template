import { useState, useCallback } from 'react';
import { useStorageSync } from './useStorageSync';

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
  } catch {}
  return [];
}

function saveRecentlyViewed(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(loadRecentlyViewed);

  // 跨标签页同步：监听 storage 事件
  useStorageSync(STORAGE_KEY, () => setRecentlyViewed(loadRecentlyViewed()));

  const addRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed(prev => {
      const next = [id, ...prev.filter(v => v !== id)].slice(0, MAX_ITEMS);
      saveRecentlyViewed(next);
      return next;
    });
  }, []);

  const removeRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed(prev => {
      const next = prev.filter(v => v !== id);
      saveRecentlyViewed(next);
      return next;
    });
  }, []);

  return { recentlyViewed, addRecentlyViewed, removeRecentlyViewed };
}
