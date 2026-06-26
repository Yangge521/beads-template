import { useState, useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'beads-progress';

/** 进度数据：templateId -> 已完成格子的坐标集合（"row-col" 格式） */
type ProgressMap = Record<string, string[]>;

/** 坐标 key 格式校验：必须为 "数字-数字" 格式 */
const COORD_RE = /^\d+-\d+$/;

function loadProgress(): ProgressMap {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const result: ProgressMap = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof k === 'string' && Array.isArray(v)) {
            const cells = v.filter((s: unknown): s is string =>
              typeof s === 'string' && COORD_RE.test(s)
            );
            if (cells.length > 0) result[k] = cells;
          }
        }
        return result;
      }
    }
  } catch {}
  return {};
}

function saveProgress(progress: ProgressMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(loadProgress);

  // 跨标签页同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setProgress(loadProgress());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** 获取某模板的已完成格子集合 */
  const getCompleted = useCallback((id: string): Set<string> => {
    return new Set(progress[id] || []);
  }, [progress]);

  /** 切换某个格子的完成状态 */
  const toggleCell = useCallback((id: string, row: number, col: number) => {
    const cellKey = `${row}-${col}`;
    setProgress(prev => {
      const current = new Set(prev[id] || []);
      if (current.has(cellKey)) {
        current.delete(cellKey);
      } else {
        current.add(cellKey);
      }
      const next = { ...prev, [id]: Array.from(current) };
      saveProgress(next);
      return next;
    });
  }, []);

  /** 标记某个格子为已完成 */
  const markCell = useCallback((id: string, row: number, col: number) => {
    const cellKey = `${row}-${col}`;
    setProgress(prev => {
      const current = new Set(prev[id] || []);
      if (current.has(cellKey)) return prev;
      current.add(cellKey);
      const next = { ...prev, [id]: Array.from(current) };
      saveProgress(next);
      return next;
    });
  }, []);

  /** 清除某模板的进度 */
  const clearProgress = useCallback((id: string) => {
    setProgress(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      saveProgress(next);
      return next;
    });
  }, []);

  /** 获取某模板的进度百分比（0-100） */
  const getProgressPercent = useCallback((id: string, totalBeads: number): number => {
    if (totalBeads <= 0) return 0;
    const completed = (progress[id] || []).length;
    return Math.min(100, Math.round((completed / totalBeads) * 100));
  }, [progress]);

  /** 已完成数量 */
  const completedCount = useMemo(() => Object.values(progress).reduce((sum, arr) => sum + arr.length, 0), [progress]);

  return { progress, getCompleted, toggleCell, markCell, clearProgress, getProgressPercent, completedCount };
}
