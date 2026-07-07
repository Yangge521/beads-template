import { useCallback, useMemo } from 'react';
import { usePersistentState } from './usePersistentState';

const STORAGE_KEY = 'beads-likes';

/** 加载点赞数据并校验 */
function loadLikes(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const ids = JSON.parse(data);
      return Array.isArray(ids)
        ? ids.filter((x: unknown): x is string => typeof x === 'string')
        : [];
    }
  } catch {
    // 损坏数据回退默认值
  }
  return [];
}

/** 点赞数据：templateId 集合，跨标签页同步 */
export function useLikes() {
  const [likes, setLikes] = usePersistentState(STORAGE_KEY, loadLikes);

  const likesCount = useMemo(() => likes.length, [likes]);

  const isLiked = useCallback((id: string) => likes.includes(id), [likes]);

  const toggleLike = useCallback((id: string) => {
    setLikes(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]);
  }, [setLikes]);

  return { likes, likesCount, isLiked, toggleLike };
}
