import { useState, useCallback } from 'react';

const STORAGE_KEY = 'beads-recently-viewed';
const MAX_ITEMS = 8;

function loadRecentlyViewed(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const ids: string[] = JSON.parse(data);
      return Array.isArray(ids) ? ids.slice(0, MAX_ITEMS) : [];
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

  const addRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed(prev => {
      const next = [id, ...prev.filter(v => v !== id)].slice(0, MAX_ITEMS);
      saveRecentlyViewed(next);
      return next;
    });
  }, []);

  return { recentlyViewed, addRecentlyViewed };
}
