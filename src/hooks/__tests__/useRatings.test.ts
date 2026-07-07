import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRatings } from '../useRatings';

const STORAGE_KEY = 'beads-ratings';

describe('useRatings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始为空对象', () => {
    const { result } = renderHook(() => useRatings());
    expect(result.current.ratings).toEqual({});
    expect(result.current.getRating('any')).toBe(0);
  });

  describe('setRating', () => {
    it('设置有效评分（1-5 整数）', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('tpl-1', 5);
      });
      expect(result.current.ratings).toEqual({ 'tpl-1': 5 });
      expect(result.current.getRating('tpl-1')).toBe(5);

      act(() => {
        result.current.setRating('tpl-2', 3);
      });
      expect(result.current.ratings).toEqual({ 'tpl-1': 5, 'tpl-2': 3 });
    });

    it('覆盖已有评分', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('tpl-1', 3);
      });
      expect(result.current.getRating('tpl-1')).toBe(3);

      act(() => {
        result.current.setRating('tpl-1', 5);
      });
      expect(result.current.getRating('tpl-1')).toBe(5);
    });

    it('再次点击同一星级则取消评分（toggle 行为）', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('tpl-1', 4);
      });
      expect(result.current.getRating('tpl-1')).toBe(4);

      act(() => {
        result.current.setRating('tpl-1', 4);
      });
      expect(result.current.getRating('tpl-1')).toBe(0);
      expect('tpl-1' in result.current.ratings).toBe(false);
    });

    it('切换到不同星级不会触发 toggle（仅覆盖）', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('tpl-1', 3);
      });
      act(() => {
        result.current.setRating('tpl-1', 4);
      });
      expect(result.current.getRating('tpl-1')).toBe(4);
    });
  });

  describe('评分边界截断 Math.max(1, Math.min(5, Math.floor(stars)))', () => {
    it('低于 1 的值被截断为 1', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('low-0', 0);
      });
      expect(result.current.getRating('low-0')).toBe(1);

      act(() => {
        result.current.setRating('low-neg', -5);
      });
      expect(result.current.getRating('low-neg')).toBe(1);

      act(() => {
        result.current.setRating('low-frac', 0.9);
      });
      // Math.floor(0.9) = 0, Math.max(1, 0) = 1
      expect(result.current.getRating('low-frac')).toBe(1);
    });

    it('高于 5 的值被截断为 5', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('high-6', 6);
      });
      expect(result.current.getRating('high-6')).toBe(5);

      act(() => {
        result.current.setRating('high-100', 100);
      });
      expect(result.current.getRating('high-100')).toBe(5);

      act(() => {
        result.current.setRating('high-5.9', 5.9);
      });
      // Math.floor(5.9) = 5, Math.min(5, 5) = 5
      expect(result.current.getRating('high-5.9')).toBe(5);
    });

    it('1-5 范围内的整数保持不变', () => {
      const { result } = renderHook(() => useRatings());

      for (let stars = 1; stars <= 5; stars++) {
        act(() => {
          result.current.setRating(`k-${stars}`, stars);
        });
        expect(result.current.getRating(`k-${stars}`)).toBe(stars);
      }
    });

    it('小数会被 Math.floor 向下取整', () => {
      const { result } = renderHook(() => useRatings());

      // 3.7 -> floor -> 3
      act(() => {
        result.current.setRating('frac-3-7', 3.7);
      });
      expect(result.current.getRating('frac-3-7')).toBe(3);

      // 2.5 -> floor -> 2
      act(() => {
        result.current.setRating('frac-2-5', 2.5);
      });
      expect(result.current.getRating('frac-2-5')).toBe(2);

      // 4.1 -> floor -> 4
      act(() => {
        result.current.setRating('frac-4-1', 4.1);
      });
      expect(result.current.getRating('frac-4-1')).toBe(4);
    });

    it('边界值 1 和 5 不会触发 toggle（值与 clamp 结果一致）', () => {
      const { result } = renderHook(() => useRatings());

      // 输入 0 -> clamp 到 1，第二次输入 0 仍 clamp 到 1，触发 toggle 取消
      act(() => {
        result.current.setRating('edge', 0);
      });
      expect(result.current.getRating('edge')).toBe(1);

      act(() => {
        result.current.setRating('edge', 0);
      });
      // 再次设置同样的 clamp 值 1 -> toggle off
      expect(result.current.getRating('edge')).toBe(0);
    });
  });

  describe('getRating', () => {
    it('未评分的 id 返回 0', () => {
      const { result } = renderHook(() => useRatings());
      expect(result.current.getRating('not-exist')).toBe(0);
    });

    it('返回已设置的评分', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('rated', 4);
      });
      expect(result.current.getRating('rated')).toBe(4);
    });

    it('取消评分后返回 0', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('temp', 3);
        result.current.setRating('temp', 3);
      });
      expect(result.current.getRating('temp')).toBe(0);
    });
  });

  describe('clearRating', () => {
    it('清除已存在的评分', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('to-clear', 5);
      });
      expect(result.current.getRating('to-clear')).toBe(5);

      act(() => {
        result.current.clearRating('to-clear');
      });
      expect(result.current.getRating('to-clear')).toBe(0);
      expect('to-clear' in result.current.ratings).toBe(false);
    });

    it('清除不存在的评分是 no-op', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('keep', 3);
      });

      const before = result.current.ratings;
      act(() => {
        result.current.clearRating('not-exist');
      });
      // 引用未变（无副作用）
      expect(result.current.ratings).toBe(before);
      expect(result.current.getRating('keep')).toBe(3);
    });

    it('清除一个不影响其他评分', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('a', 1);
        result.current.setRating('b', 2);
        result.current.setRating('c', 3);
      });

      act(() => {
        result.current.clearRating('b');
      });

      expect(result.current.getRating('a')).toBe(1);
      expect(result.current.getRating('b')).toBe(0);
      expect(result.current.getRating('c')).toBe(3);
    });
  });

  describe('localStorage 持久化', () => {
    it('setRating 后数据写入 localStorage', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('persist-1', 5);
        result.current.setRating('persist-2', 3);
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual({
        'persist-1': 5,
        'persist-2': 3,
      });
    });

    it('clearRating 后 localStorage 同步更新', () => {
      const { result } = renderHook(() => useRatings());

      act(() => {
        result.current.setRating('a', 5);
        result.current.setRating('b', 4);
      });

      act(() => {
        result.current.clearRating('a');
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored as string)).toEqual({ b: 4 });
    });

    it('新 hook 实例能从 localStorage 读取已持久化的数据', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ 'old-1': 5, 'old-2': 2 }),
      );

      const { result } = renderHook(() => useRatings());

      expect(result.current.ratings).toEqual({ 'old-1': 5, 'old-2': 2 });
      expect(result.current.getRating('old-1')).toBe(5);
      expect(result.current.getRating('old-2')).toBe(2);
      expect(result.current.getRating('old-3')).toBe(0);
    });

    it('loadRatings 对损坏 JSON 容错返回空对象', () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json');

      const { result } = renderHook(() => useRatings());

      expect(result.current.ratings).toEqual({});
      expect(result.current.getRating('any')).toBe(0);
    });

    it('loadRatings 过滤越界评分（< 1 或 > 5）', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          valid: 3,
          'too-low': 0,
          'too-high': 6,
          'neg': -1,
          'huge': 100,
        }),
      );

      const { result } = renderHook(() => useRatings());

      expect(result.current.ratings).toEqual({ valid: 3 });
      expect(result.current.getRating('valid')).toBe(3);
      expect(result.current.getRating('too-low')).toBe(0);
      expect(result.current.getRating('too-high')).toBe(0);
    });

    it('loadRatings 对非对象数据容错返回空对象', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));

      const { result } = renderHook(() => useRatings());

      expect(result.current.ratings).toEqual({});
    });

    it('loadRatings 对原始值容错返回空对象', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify('string'));

      const { result } = renderHook(() => useRatings());

      expect(result.current.ratings).toEqual({});
    });
  });
});
