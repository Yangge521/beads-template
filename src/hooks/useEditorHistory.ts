import { useCallback, useRef, useState } from 'react';

/** 编辑器历史栈上限 */
const MAX_HISTORY = 50;

/**
 * 网格编辑撤销/重做 hook
 * 用栈记录每次网格快照，支持 Ctrl+Z / Ctrl+Y
 */
export function useEditorHistory(initial: number[][]) {
  const [grid, setGrid] = useState<number[][]>(initial);
  const past = useRef<number[][][]>([]);
  const future = useRef<number[][][]>([]);
  // 用于触发 canUndo/canRedo 重渲染
  const [, forceTick] = useState(0);
  const tick = useCallback(() => forceTick(n => n + 1), []);

  /** 提交一次网格变更：把当前状态压入 past，清空 future */
  const commit = useCallback((next: number[][]) => {
    past.current.push(grid);
    if (past.current.length > MAX_HISTORY) past.current.shift();
    future.current = [];
    setGrid(next);
    tick();
  }, [grid, tick]);

  /** 直接替换当前快照（不产生历史记录，用于初始化/重置） */
  const replace = useCallback((next: number[][]) => {
    setGrid(next);
  }, []);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current.pop()!;
    future.current.push(grid);
    setGrid(prev);
    tick();
  }, [grid, tick]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    past.current.push(grid);
    setGrid(next);
    tick();
  }, [grid, tick]);

  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    tick();
  }, [tick]);

  return {
    grid,
    setGrid,
    commit,
    replace,
    undo,
    redo,
    clearHistory,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
