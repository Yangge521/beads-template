import { useState, useCallback } from 'react';
import type { FavoriteEntry } from '../types/bead';

const STORAGE_KEY = 'beads-favorites';

function loadFavorites(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const entries: FavoriteEntry[] = JSON.parse(data);
      return entries.map(e => e.templateId);
    }
  } catch {}
  return [];
}

function saveFavorites(ids: string[]) {
  try {
    const entries: FavoriteEntry[] = ids.map(templateId => ({
      templateId,
      favoritedAt: new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id);
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id];
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f !== id);
      saveFavorites(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
}
