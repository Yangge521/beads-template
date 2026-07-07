import { useCallback, useState } from 'react';
import { useStorageSync } from './useStorageSync';

const STORAGE_KEY = 'beads-search-history';
const MAX_ITEMS = 8;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: unknown): x is string => typeof x === 'string').slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * 搜索历史记录 hook。
 * - addQuery: 把一次搜索词加入历史（去重、最新在前、最多 MAX_ITEMS 条）
 * - removeQuery: 删除单条
 * - clearHistory: 清空
 * - 跨标签页通过 storage 事件同步
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(loadHistory);

  useStorageSync(STORAGE_KEY, () => setHistory(loadHistory()));

  const addQuery = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const next = [trimmed, ...prev.filter(x => x !== trimmed)].slice(0, MAX_ITEMS);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeQuery = useCallback((q: string) => {
    setHistory(prev => {
      const next = prev.filter(x => x !== q);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    saveHistory([]);
    setHistory([]);
  }, []);

  return { history, addQuery, removeQuery, clearHistory };
}
