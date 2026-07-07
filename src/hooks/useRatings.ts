import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

const STORAGE_KEY = 'beads-ratings';

/** 模板评分数据：templateId -> 1-5 星 */
type RatingMap = Record<string, number>;

function loadRatings(): RatingMap {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const result: RatingMap = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof k === 'string' && typeof v === 'number' && v >= 1 && v <= 5) {
            result[k] = Math.floor(v);
          }
        }
        return result;
      }
    }
  } catch {
    // 损坏数据回退默认值
  }
  return {};
}

export function useRatings() {
  const [ratings, setRatings] = usePersistentState(STORAGE_KEY, loadRatings);

  const getRating = useCallback((id: string): number => ratings[id] || 0, [ratings]);

  const setRating = useCallback((id: string, stars: number) => {
    const clamped = Math.max(1, Math.min(5, Math.floor(stars)));
    setRatings(prev => {
      const next = { ...prev };
      if (next[id] === clamped) {
        // 再次点击同一星级则取消评分
        delete next[id];
      } else {
        next[id] = clamped;
      }
      return next;
    });
  }, [setRatings]);

  const clearRating = useCallback((id: string) => {
    setRatings(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [setRatings]);

  return { ratings, getRating, setRating, clearRating };
}
