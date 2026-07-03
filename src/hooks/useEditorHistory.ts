import { useCallback, useRef, useState } from 'react';

/** 编辑器历史栈上限 */
const MAX_HISTORY = 50;

/**
 * 网格编辑撤销/重做 hook
 * 用栈记录每次网格快照，支持 Ctrl+Z / Ctrl+Y
 */
export function useEditorHistory(initial: number[][]) {
  const [grid, setGrid] = useState<number[][]>(initial);
  // 用 ref 追踪最新 grid，避免闭包陈旧值
  const gridRef = useRef(grid);
  const past = useRef<number[][][]>([]);
  const future = useRef<number[][][]>([]);
  // 用于触发 canUndo/canRedo 重渲染
  const [, forceTick] = useState(0);
  const tick = useCallback(() => forceTick(n => n + 1), []);

  const setGridBoth = useCallback((next: number[][]) => {
    gridRef.current = next;
    setGrid(next);
  }, []);

  /** 提交一次网格变更：把当前状态压入 past，清空 future */
  const commit = useCallback((next: number[][]) => {
    past.current.push(gridRef.current);
    if (past.current.length > MAX_HISTORY) past.current.shift();
    future.current = [];
    setGridBoth(next);
    tick();
  }, [tick, setGridBoth]);

  /** 直接替换当前快照（不产生历史记录，用于初始化/重置） */
  const replace = useCallback((next: number[][]) => {
    setGridBoth(next);
  }, [setGridBoth]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current.pop()!;
    future.current.push(gridRef.current);
    setGridBoth(prev);
    tick();
  }, [tick, setGridBoth]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    past.current.push(gridRef.current);
    setGridBoth(next);
    tick();
  }, [tick, setGridBoth]);

  /** 撤销 n 步 */
  const undoN = useCallback((n: number) => {
    const steps = Math.min(n, past.current.length);
    if (steps === 0) return;
    // 把当前状态先压入 future
    future.current.push(gridRef.current);
    for (let i = 0; i < steps; i++) {
      const prev = past.current.pop()!;
      if (i < steps - 1) {
        future.current.push(prev);
      } else {
        setGridBoth(prev);
      }
    }
    tick();
  }, [tick, setGridBoth]);

  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    tick();
  }, [tick]);

  return {
    grid,
    setGrid: setGridBoth,
    commit,
    replace,
    undo,
    redo,
    undoN,
    clearHistory,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    undoCount: past.current.length,
    redoCount: future.current.length,
  };
}
