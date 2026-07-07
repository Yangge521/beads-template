import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLikes } from '../useLikes';

const STORAGE_KEY = 'beads-likes';

describe('useLikes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始为空', () => {
    const { result } = renderHook(() => useLikes());
    expect(result.current.likes).toEqual([]);
    expect(result.current.likesCount).toBe(0);
    expect(result.current.isLiked('tpl-1')).toBe(false);
  });

  describe('loadLikes 校验', () => {
    it('localStorage 无数据时返回空数组', () => {
      const { result } = renderHook(() => useLikes());
      expect(result.current.likes).toEqual([]);
    });

    it('合法字符串数组被正确加载', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['a', 'b', 'c']));
      const { result } = renderHook(() => useLikes());
      expect(result.current.likes).toEqual(['a', 'b', 'c']);
      expect(result.current.likesCount).toBe(3);
    });

    it('数组中非字符串元素被过滤', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(['a', 123, null, { x: 1 }, 'b', true, ['c']]),
      );
      const { result } = renderHook(() => useLikes());
      expect(result.current.likes).toEqual(['a', 'b']);
    });

    it('JSON 解析失败时返回空数组（损坏数据容错）', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');
      const { result } = renderHook(() => useLikes());
      expect(result.current.likes).toEqual([]);
      expect(result.current.likesCount).toBe(0);
    });

    it('JSON 解析成功但非数组时返回空数组', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      const { result } = renderHook(() => useLikes());
      expect(result.current.likes).toEqual([]);
    });

    it('JSON 解析为原始值（非对象/数组）时返回空数组', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(42));
      const { result } = renderHook(() => useLikes());
      expect(result.current.likes).toEqual([]);
    });
  });

  describe('toggleLike', () => {
    it('新增点赞：从无到有', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('tpl-1');
      });

      expect(result.current.likes).toEqual(['tpl-1']);
      expect(result.current.likesCount).toBe(1);
      expect(result.current.isLiked('tpl-1')).toBe(true);
    });

    it('连续新增多个点赞', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('a');
        result.current.toggleLike('b');
        result.current.toggleLike('c');
      });

      expect(result.current.likes).toEqual(['a', 'b', 'c']);
      expect(result.current.likesCount).toBe(3);
      expect(result.current.isLiked('a')).toBe(true);
      expect(result.current.isLiked('b')).toBe(true);
      expect(result.current.isLiked('c')).toBe(true);
    });

    it('取消点赞：已存在则移除', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('a');
        result.current.toggleLike('b');
      });

      act(() => {
        result.current.toggleLike('a');
      });

      expect(result.current.likes).toEqual(['b']);
      expect(result.current.likesCount).toBe(1);
      expect(result.current.isLiked('a')).toBe(false);
      expect(result.current.isLiked('b')).toBe(true);
    });

    it('toggle 同一 id 多次最终为已点赞（奇数次）', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('x');
        result.current.toggleLike('x');
        result.current.toggleLike('x');
      });

      expect(result.current.likes).toEqual(['x']);
      expect(result.current.likesCount).toBe(1);
    });

    it('toggle 未存在的 id 不会影响其他点赞', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('a');
        result.current.toggleLike('b');
      });

      act(() => {
        result.current.toggleLike('c');
      });

      expect(result.current.likes).toEqual(['a', 'b', 'c']);
    });
  });

  describe('isLiked', () => {
    it('未点赞时返回 false', () => {
      const { result } = renderHook(() => useLikes());
      expect(result.current.isLiked('any')).toBe(false);
    });

    it('已点赞时返回 true', () => {
      const { result } = renderHook(() => useLikes());
      act(() => {
        result.current.toggleLike('tpl-99');
      });
      expect(result.current.isLiked('tpl-99')).toBe(true);
    });

    it('取消后返回 false', () => {
      const { result } = renderHook(() => useLikes());
      act(() => {
        result.current.toggleLike('tpl-1');
        result.current.toggleLike('tpl-1');
      });
      expect(result.current.isLiked('tpl-1')).toBe(false);
    });
  });

  describe('likesCount', () => {
    it('初始为 0', () => {
      const { result } = renderHook(() => useLikes());
      expect(result.current.likesCount).toBe(0);
    });

    it('随点赞数变化', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('a');
      });
      expect(result.current.likesCount).toBe(1);

      act(() => {
        result.current.toggleLike('b');
        result.current.toggleLike('c');
      });
      expect(result.current.likesCount).toBe(3);

      act(() => {
        result.current.toggleLike('a');
      });
      expect(result.current.likesCount).toBe(2);
    });
  });

  describe('localStorage 持久化', () => {
    it('toggleLike 后数据写入 localStorage', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('persist-1');
        result.current.toggleLike('persist-2');
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual(['persist-1', 'persist-2']);
    });

    it('取消点赞后 localStorage 同步更新', () => {
      const { result } = renderHook(() => useLikes());

      act(() => {
        result.current.toggleLike('a');
        result.current.toggleLike('b');
      });

      act(() => {
        result.current.toggleLike('a');
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored as string)).toEqual(['b']);
    });

    it('新 hook 实例能从 localStorage 读取已持久化的数据', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['old-1', 'old-2']));

      const { result } = renderHook(() => useLikes());

      expect(result.current.likes).toEqual(['old-1', 'old-2']);
      expect(result.current.likesCount).toBe(2);
      expect(result.current.isLiked('old-1')).toBe(true);
      expect(result.current.isLiked('old-2')).toBe(true);
      expect(result.current.isLiked('old-3')).toBe(false);
    });

    it('多个 hook 实例共享同一 localStorage 数据源', () => {
      const { result: first } = renderHook(() => useLikes());

      act(() => {
        first.current.toggleLike('shared-1');
      });

      // 重新渲染一个新的 hook 实例（模拟新组件挂载）
      const { result: second } = renderHook(() => useLikes());

      expect(second.current.likes).toEqual(['shared-1']);
      expect(second.current.likesCount).toBe(1);
    });
  });
});
