import { useState, useCallback, useMemo } from 'react';
import { useStorageSync } from './useStorageSync';

const STORAGE_KEY = 'beads-likes';

/** 点赞数据：templateId 集合，跨标签页同步 */
function loadLikes(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const ids = JSON.parse(data);
      return Array.isArray(ids)
        ? ids.filter((x: unknown): x is string => typeof x === 'string')
        : [];
    }
  } catch {}
  return [];
}

function saveLikes(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export function useLikes() {
  const [likes, setLikes] = useState<string[]>(loadLikes);

  const likesCount = useMemo(() => likes.length, [likes]);

  // 跨标签页同步
  useStorageSync(STORAGE_KEY, () => setLikes(loadLikes()));

  const isLiked = useCallback((id: string) => likes.includes(id), [likes]);

  const toggleLike = useCallback((id: string) => {
    setLikes(prev => {
      const next = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id];
      saveLikes(next);
      return next;
    });
  }, []);

  return { likes, likesCount, isLiked, toggleLike };
}
