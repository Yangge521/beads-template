import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgress } from '../useProgress';

const STORAGE_KEY = 'beads-progress';
// 测试用模板：grid [[1,0],[0,1]] 共 2 颗珠子
const TEMPLATE_ID = 'test-1';

describe('useProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始为空', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.progress).toEqual({});
    expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(new Set());
    expect(result.current.getProgressPercent(TEMPLATE_ID, 2)).toBe(0);
    expect(result.current.completedCount).toBe(0);
  });

  describe('getCompleted', () => {
    it('初始为空集合', () => {
      const { result } = renderHook(() => useProgress());
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(new Set());
    });

    it('toggleCell 后状态正确', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
        result.current.toggleCell(TEMPLATE_ID, 1, 1);
      });
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(
        new Set(['0-0', '1-1']),
      );
    });

    it('toggleCell 同一格再次 toggle 取消完成状态', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
      });
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(new Set(['0-0']));
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
      });
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(new Set());
    });

    it('clearProgress 后清空', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
        result.current.toggleCell(TEMPLATE_ID, 1, 1);
      });
      expect(result.current.getCompleted(TEMPLATE_ID).size).toBe(2);

      act(() => {
        result.current.clearProgress(TEMPLATE_ID);
      });
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(new Set());
      expect(result.current.progress[TEMPLATE_ID]).toBeUndefined();
    });

    it('clearProgress 不影响其他模板进度', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell('test-1', 0, 0);
        result.current.toggleCell('test-2', 0, 0);
      });
      act(() => {
        result.current.clearProgress('test-1');
      });
      expect(result.current.getCompleted('test-1')).toEqual(new Set());
      expect(result.current.getCompleted('test-2')).toEqual(new Set(['0-0']));
    });
  });

  describe('getProgressPercent', () => {
    it('0% 完成度', () => {
      const { result } = renderHook(() => useProgress());
      expect(result.current.getProgressPercent(TEMPLATE_ID, 2)).toBe(0);
    });

    it('50% 完成度', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
      });
      // 1 / 2 = 50%
      expect(result.current.getProgressPercent(TEMPLATE_ID, 2)).toBe(50);
    });

    it('100% 完成度', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
        result.current.toggleCell(TEMPLATE_ID, 1, 1);
      });
      // 2 / 2 = 100%
      expect(result.current.getProgressPercent(TEMPLATE_ID, 2)).toBe(100);
    });

    it('totalBeads <= 0 返回 0', () => {
      const { result } = renderHook(() => useProgress());
      expect(result.current.getProgressPercent(TEMPLATE_ID, 0)).toBe(0);
      expect(result.current.getProgressPercent(TEMPLATE_ID, -5)).toBe(0);
    });

    it('完成数超过 totalBeads 时截断为 100', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
        result.current.toggleCell(TEMPLATE_ID, 0, 1);
      });
      // 2 / 1 = 200% -> 100%
      expect(result.current.getProgressPercent(TEMPLATE_ID, 1)).toBe(100);
    });
  });

  describe('跨标签页 storage 同步', () => {
    it('收到 storage 事件后重新加载进度', () => {
      const { result } = renderHook(() => useProgress());
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(new Set());

      // 模拟其他标签页写入 localStorage
      const newData = { 'test-1': ['0-0', '1-1'] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify(newData),
          }),
        );
      });

      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(
        new Set(['0-0', '1-1']),
      );
    });

    it('其他 key 的 storage 事件被忽略', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
      });
      const before = result.current.getCompleted(TEMPLATE_ID);

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'other-key',
            newValue: JSON.stringify({ 'test-1': ['1-1'] }),
          }),
        );
      });

      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(before);
    });
  });

  describe('localStorage 持久化', () => {
    it('toggleCell 后数据写入 localStorage', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
        result.current.toggleCell(TEMPLATE_ID, 1, 1);
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual({
        'test-1': ['0-0', '1-1'],
      });
    });

    it('clearProgress 后 localStorage 同步更新', () => {
      const { result } = renderHook(() => useProgress());
      act(() => {
        result.current.toggleCell(TEMPLATE_ID, 0, 0);
      });
      act(() => {
        result.current.clearProgress(TEMPLATE_ID);
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored as string)).toEqual({});
    });

    it('新 hook 实例从 localStorage 读取已持久化数据', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ 'test-1': ['0-0', '1-1'] }),
      );
      const { result } = renderHook(() => useProgress());
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(
        new Set(['0-0', '1-1']),
      );
      expect(result.current.completedCount).toBe(2);
    });

    it('加载时过滤非法坐标格式', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          'test-1': ['0-0', 'invalid', 'a-b', '1-1', '1-2-3'],
        }),
      );
      const { result } = renderHook(() => useProgress());
      // 仅保留 "数字-数字" 格式
      expect(result.current.getCompleted(TEMPLATE_ID)).toEqual(
        new Set(['0-0', '1-1']),
      );
    });

    it('损坏 JSON 容错返回空对象', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');
      const { result } = renderHook(() => useProgress());
      expect(result.current.progress).toEqual({});
    });
  });
});
