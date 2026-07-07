import { useCallback, useMemo } from 'react';
import type { FavoriteEntry } from '../types/bead';
import { usePersistentState } from './usePersistentState';

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
  } catch {
    // 损坏数据回退默认值
  }
  return [];
}

export function useFavorites() {
  const [entries, setEntries] = usePersistentState(STORAGE_KEY, loadEntries);

  // favorites 从 entries 派生，避免双数据源
  const favorites = useMemo(() => entries.map(e => e.templateId), [entries]);

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id);
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setEntries(prev => {
      if (prev.some(e => e.templateId === id)) {
        return prev.filter(e => e.templateId !== id);
      }
      return [{ templateId: id, favoritedAt: new Date().toISOString() }, ...prev];
    });
  }, [setEntries]);

  const clearFavorites = useCallback(() => {
    setEntries([]);
  }, [setEntries]);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}
