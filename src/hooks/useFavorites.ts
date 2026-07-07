import { useState, useCallback, useMemo } from 'react';
import type { FavoriteEntry } from '../types/bead';
import { useStorageSync } from './useStorageSync';

const STORAGE_KEY = 'beads-favorites';

// 兼容旧格式：既可能是 FavoriteEntry[]，也可能是纯 string[]
function loadEntries(): FavoriteEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        // 旧格式迁移：补上当前时间
        return (parsed as string[]).map(templateId => ({
          templateId,
          favoritedAt: new Date().toISOString(),
        }));
      }
      return (parsed as FavoriteEntry[]).filter(
        e => e && typeof e.templateId === 'string'
      );
    }
  } catch {}
  return [];
}

function saveEntries(entries: FavoriteEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function useFavorites() {
  const [entries, setEntries] = useState<FavoriteEntry[]>(loadEntries);

  // favorites 从 entries 派生，避免双数据源
  const favorites = useMemo(() => entries.map(e => e.templateId), [entries]);

  // 跨标签页同步：监听 storage 事件
  useStorageSync(STORAGE_KEY, () => setEntries(loadEntries()));

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id);
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setEntries(prev => {
      let next: FavoriteEntry[];
      if (prev.some(e => e.templateId === id)) {
        next = prev.filter(e => e.templateId !== id);
      } else {
        next = [{ templateId: id, favoritedAt: new Date().toISOString() }, ...prev];
      }
      saveEntries(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setEntries([]);
    saveEntries([]);
  }, []);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}
