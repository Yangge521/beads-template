import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompare } from '../useCompare';

const STORAGE_KEY = 'beads-compare-list';

describe('useCompare', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始为空数组', () => {
    const { result } = renderHook(() => useCompare());
    expect(result.current.compareIds).toEqual([]);
    expect(result.current.isFull).toBe(false);
    expect(result.current.maxCompare).toBe(4);
  });

  describe('addToCompare', () => {
    it('添加 id', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
      });
      expect(result.current.compareIds).toEqual(['a']);
      expect(result.current.isInCompare('a')).toBe(true);
    });

    it('重复 id 不再添加', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('a');
      });
      expect(result.current.compareIds).toEqual(['a']);
    });

    it('添加多个不同 id', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
        result.current.addToCompare('c');
      });
      expect(result.current.compareIds).toEqual(['a', 'b', 'c']);
    });
  });

  describe('removeFromCompare', () => {
    it('移除已存在 id', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
      });
      act(() => {
        result.current.removeFromCompare('a');
      });
      expect(result.current.compareIds).toEqual(['b']);
      expect(result.current.isInCompare('a')).toBe(false);
    });

    it('移除不存在的 id 是 no-op', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
      });
      act(() => {
        result.current.removeFromCompare('xyz');
      });
      expect(result.current.compareIds).toEqual(['a']);
    });

    it('移除一个不影响其他', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
        result.current.addToCompare('c');
      });
      act(() => {
        result.current.removeFromCompare('b');
      });
      expect(result.current.compareIds).toEqual(['a', 'c']);
    });
  });

  describe('isInCompare', () => {
    it('存在返回 true', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
      });
      expect(result.current.isInCompare('a')).toBe(true);
    });

    it('不存在返回 false', () => {
      const { result } = renderHook(() => useCompare());
      expect(result.current.isInCompare('a')).toBe(false);
      act(() => {
        result.current.addToCompare('b');
      });
      expect(result.current.isInCompare('a')).toBe(false);
    });
  });

  describe('clearCompare', () => {
    it('清空所有', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
      });
      act(() => {
        result.current.clearCompare();
      });
      expect(result.current.compareIds).toEqual([]);
      expect(result.current.isFull).toBe(false);
    });

    it('空列表时是 no-op', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.clearCompare();
      });
      expect(result.current.compareIds).toEqual([]);
    });
  });

  describe('上限', () => {
    it('maxCompare 为 4', () => {
      const { result } = renderHook(() => useCompare());
      expect(result.current.maxCompare).toBe(4);
    });

    it('达到 4 个时 isFull 为 true', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
        result.current.addToCompare('c');
        result.current.addToCompare('d');
      });
      expect(result.current.compareIds).toHaveLength(4);
      expect(result.current.isFull).toBe(true);
    });

    it('未满时 isFull 为 false', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
        result.current.addToCompare('c');
      });
      expect(result.current.isFull).toBe(false);
    });

    it('超过上限时移除最早的', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
        result.current.addToCompare('c');
        result.current.addToCompare('d');
      });
      act(() => {
        result.current.addToCompare('e');
      });
      // 移除最早的 'a'，新增 'e'
      expect(result.current.compareIds).toEqual(['b', 'c', 'd', 'e']);
      expect(result.current.compareIds).toHaveLength(4);
      expect(result.current.isFull).toBe(true);
      expect(result.current.isInCompare('a')).toBe(false);
      expect(result.current.isInCompare('e')).toBe(true);
    });

    it('连续超过上限持续移除最早的', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
        result.current.addToCompare('c');
        result.current.addToCompare('d');
        result.current.addToCompare('e');
        result.current.addToCompare('f');
      });
      expect(result.current.compareIds).toEqual(['c', 'd', 'e', 'f']);
    });
  });

  describe('localStorage 持久化', () => {
    it('addToCompare 后写入 localStorage', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual(['a', 'b']);
    });

    it('removeFromCompare 后同步更新 localStorage', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
        result.current.addToCompare('b');
      });
      act(() => {
        result.current.removeFromCompare('a');
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored as string)).toEqual(['b']);
    });

    it('clearCompare 后同步更新 localStorage', () => {
      const { result } = renderHook(() => useCompare());
      act(() => {
        result.current.addToCompare('a');
      });
      act(() => {
        result.current.clearCompare();
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored as string)).toEqual([]);
    });

    it('新 hook 实例从 localStorage 读取已持久化数据', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['x', 'y']));
      const { result } = renderHook(() => useCompare());
      expect(result.current.compareIds).toEqual(['x', 'y']);
      expect(result.current.isInCompare('x')).toBe(true);
    });
  });
});
