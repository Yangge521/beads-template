import { useCallback, useState } from 'react';

export interface Snapshot {
  id: string;
  name: string;
  grid: number[][];
  createdAt: number;
}

/**
 * 编辑器快照（轻量图层）管理 hook
 * 保存当前网格为命名快照，可在快照间切换/恢复。
 * 快照存在内存中（页面级），不持久化。
 */
export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const addSnapshot = useCallback((grid: number[][], name?: string) => {
    const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const snap: Snapshot = {
      id,
      name: name || `Snapshot ${snapshots.length + 1}`,
      grid: grid.map(row => [...row]),
      createdAt: Date.now(),
    };
    setSnapshots(prev => [snap, ...prev].slice(0, 12));
    return snap;
  }, [snapshots.length]);

  const removeSnapshot = useCallback((id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }, []);

  const renameSnapshot = useCallback((id: string, name: string) => {
    setSnapshots(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  const clearSnapshots = useCallback(() => {
    setSnapshots([]);
  }, []);

  return {
    snapshots,
    addSnapshot,
    removeSnapshot,
    renameSnapshot,
    clearSnapshots,
  };
}
