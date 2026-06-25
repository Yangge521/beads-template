import { useState, useCallback, useEffect } from 'react';
import type { FavoriteEntry } from '../types/bead';

const STORAGE_KEY = 'beads-favorites';

// 兼容旧格式：既可能是 FavoriteEntry[]，也可能是纯 string[]
function loadFavorites(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      // 旧格式：string[]
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed as string[];
      }
      // 新格式：FavoriteEntry[]
      return (parsed as FavoriteEntry[])
        .map(e => e?.templateId)
        .filter((id): id is string => typeof id === 'string');
    }
  } catch {}
  return [];
}

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
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [entries, setEntries] = useState<FavoriteEntry[]>(loadEntries);

  // 跨标签页同步：监听 storage 事件
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFavorites(loadFavorites());
        setEntries(loadEntries());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id);
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prevIds => {
      setEntries(prevEntries => {
        let nextEntries: FavoriteEntry[];
        if (prevIds.includes(id)) {
          nextEntries = prevEntries.filter(e => e.templateId !== id);
        } else {
          nextEntries = [
            { templateId: id, favoritedAt: new Date().toISOString() },
            ...prevEntries,
          ];
        }
        saveEntries(nextEntries);
        return nextEntries;
      });
      return prevIds.includes(id)
        ? prevIds.filter(f => f !== id)
        : [id, ...prevIds];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    setEntries([]);
    saveEntries([]);
  }, []);

  return { favorites, entries, isFavorite, toggleFavorite, clearFavorites };
}
