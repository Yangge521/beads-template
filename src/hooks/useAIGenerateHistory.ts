import { useState, useCallback, useEffect } from 'react';

/** AI 生成历史记录项 */
export interface AIHistoryItem {
  id: string;
  prompt: string;
  mode: 'preset' | 'match' | 'image';
  templateName: string;
  /** 生成时间戳 */
  createdAt: number;
  /** 完整的模板数据（可恢复） */
  template: {
    grid: number[][];
    colors: { hex: string; name: string; count?: number }[];
    beadCount: number;
    rows: number;
    cols: number;
  };
}

const STORAGE_KEY = 'beads-ai-history';
const MAX_HISTORY = 20;

/** 兼容旧数据：确保字段完整 */
function normalizeItem(raw: unknown): AIHistoryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.prompt !== 'string') return null;
  if (!r.template || typeof r.template !== 'object') return null;
  const tpl = r.template as Record<string, unknown>;
  if (!Array.isArray(tpl.grid) || !Array.isArray(tpl.colors)) return null;
  return {
    id: r.id,
    prompt: r.prompt,
    mode: (r.mode as AIHistoryItem['mode']) || 'preset',
    templateName: (r.templateName as string) || '',
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    template: {
      grid: tpl.grid as number[][],
      colors: tpl.colors as AIHistoryItem['template']['colors'],
      beadCount: typeof tpl.beadCount === 'number' ? tpl.beadCount : 0,
      rows: typeof tpl.rows === 'number' ? tpl.rows : (tpl.grid as number[][]).length,
      cols: typeof tpl.cols === 'number' ? tpl.cols : (tpl.grid as number[][])[0]?.length || 0,
    },
  };
}

function loadHistory(): AIHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter((x): x is AIHistoryItem => x !== null);
  } catch {
    return [];
  }
}

function saveHistory(items: AIHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // 通知其他标签页
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch {
    // 忽略写入失败（如隐私模式）
  }
}

/**
 * AI 生成历史记录 hook
 * - 持久化到 localStorage
 * - 跨标签页同步
 * - 最多保留 MAX_HISTORY 条
 */
export function useAIGenerateHistory() {
  const [history, setHistory] = useState<AIHistoryItem[]>(() => loadHistory());

  // 跨标签页同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setHistory(loadHistory());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** 添加一条历史记录 */
  const addHistory = useCallback((item: Omit<AIHistoryItem, 'id' | 'createdAt'>) => {
    const full: AIHistoryItem = {
      ...item,
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    setHistory(prev => {
      // 最新在前
      const next = [full, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
    return full;
  }, []);

  /** 删除一条历史记录 */
  const removeHistory = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(item => item.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  /** 清空所有历史记录 */
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return { history, addHistory, removeHistory, clearHistory };
}
