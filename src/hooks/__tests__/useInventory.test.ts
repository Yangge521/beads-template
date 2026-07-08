import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInventory } from '../useInventory';

const STORAGE_KEY = 'beads-inventory';

describe('useInventory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始为空数组', () => {
    const { result } = renderHook(() => useInventory());
    expect(result.current.inventory).toEqual([]);
    expect(result.current.hasColor('#FF0000')).toBe(false);
    expect(result.current.inventoryHexes()).toEqual([]);
  });

  describe('addColor', () => {
    it('添加有效 hex 颜色', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
      });
      expect(result.current.inventory).toEqual([
        { hex: '#ff0000', note: undefined },
      ]);
      expect(result.current.hasColor('#FF0000')).toBe(true);
    });

    it('添加时归一化为小写', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#AABBCC');
      });
      expect(result.current.inventory[0].hex).toBe('#aabbcc');
    });

    it('带空白的 hex 被 trim', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('  #FF0000  ');
      });
      expect(result.current.inventory).toHaveLength(1);
      expect(result.current.inventory[0].hex).toBe('#ff0000');
    });

    it('无效 hex 被拒绝', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('red');
        result.current.addColor('#FFF');
        result.current.addColor('#GGGGGG');
        result.current.addColor('#12345');
        result.current.addColor('');
        result.current.addColor('#1234567');
        result.current.addColor('#123456extra');
      });
      expect(result.current.inventory).toEqual([]);
    });

    it('去重（大小写不敏感）', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.addColor('#ff0000');
        result.current.addColor('#Ff0000');
      });
      expect(result.current.inventory).toEqual([
        { hex: '#ff0000', note: undefined },
      ]);
    });

    it('携带 note', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000', ' 红色 ');
      });
      expect(result.current.inventory[0].note).toBe('红色');
    });

    it('空白 note 被规范化为 undefined', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000', '   ');
      });
      expect(result.current.inventory[0].note).toBeUndefined();
    });

    it('添加多个不同颜色', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.addColor('#00FF00');
        result.current.addColor('#0000FF');
      });
      expect(result.current.inventoryHexes()).toEqual([
        '#ff0000',
        '#00ff00',
        '#0000ff',
      ]);
    });
  });

  describe('removeColor', () => {
    it('移除已存在颜色', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.addColor('#00FF00');
      });
      act(() => {
        result.current.removeColor('#ff0000');
      });
      expect(result.current.inventory).toEqual([
        { hex: '#00ff00', note: undefined },
      ]);
    });

    it('移除不存在的颜色不影响数据', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
      });
      const before = result.current.inventory;
      act(() => {
        result.current.removeColor('#000000');
      });
      // 内容不变（filter 总会返回新数组引用，但数据保持一致）
      expect(result.current.inventory).toEqual(before);
      expect(result.current.inventory).toHaveLength(1);
      expect(result.current.hasColor('#FF0000')).toBe(true);
    });

    it('大小写不敏感', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#AABBCC');
      });
      act(() => {
        result.current.removeColor('#aabbcc');
      });
      expect(result.current.inventory).toEqual([]);
    });
  });

  describe('clearInventory', () => {
    it('清空所有库存', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.addColor('#00FF00');
      });
      act(() => {
        result.current.clearInventory();
      });
      expect(result.current.inventory).toEqual([]);
    });

    it('空库存时是 no-op', () => {
      const { result } = renderHook(() => useInventory());
      const before = result.current.inventory;
      act(() => {
        result.current.clearInventory();
      });
      expect(result.current.inventory).toBe(before);
    });
  });

  describe('hasColor', () => {
    it('存在返回 true', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
      });
      expect(result.current.hasColor('#FF0000')).toBe(true);
      expect(result.current.hasColor('#ff0000')).toBe(true);
    });

    it('不存在返回 false', () => {
      const { result } = renderHook(() => useInventory());
      expect(result.current.hasColor('#FF0000')).toBe(false);
      act(() => {
        result.current.addColor('#00FF00');
      });
      expect(result.current.hasColor('#FF0000')).toBe(false);
    });

    it('大小写不敏感', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#aabbcc');
      });
      expect(result.current.hasColor('#AABBCC')).toBe(true);
      expect(result.current.hasColor('#AaBbCc')).toBe(true);
      expect(result.current.hasColor('#aabbcc')).toBe(true);
    });
  });

  describe('setCount', () => {
    it('设置有效数量', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
      });
      act(() => {
        result.current.setCount('#FF0000', 100);
      });
      expect(result.current.inventory[0].count).toBe(100);
    });

    it('覆盖已有数量', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.setCount('#FF0000', 100);
      });
      act(() => {
        result.current.setCount('#FF0000', 50);
      });
      expect(result.current.inventory[0].count).toBe(50);
    });

    it('大小写不敏感', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#aabbcc');
      });
      act(() => {
        result.current.setCount('#AABBCC', 50);
      });
      expect(result.current.inventory[0].count).toBe(50);
    });

    it('传入 undefined 清除数量', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.setCount('#FF0000', 100);
      });
      act(() => {
        result.current.setCount('#FF0000', undefined);
      });
      expect(result.current.inventory[0].count).toBeUndefined();
    });

    it('传入负数清除数量', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.setCount('#FF0000', 100);
      });
      act(() => {
        result.current.setCount('#FF0000', -5);
      });
      expect(result.current.inventory[0].count).toBeUndefined();
    });

    it('设置数量不影响其他颜色', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.addColor('#00FF00');
        result.current.setCount('#FF0000', 10);
        result.current.setCount('#00FF00', 20);
      });
      expect(result.current.inventory[0].count).toBe(10);
      expect(result.current.inventory[1].count).toBe(20);
    });
  });

  describe('localStorage 持久化', () => {
    it('addColor 后写入 localStorage', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual([{ hex: '#ff0000' }]);
    });

    it('removeColor 后同步更新 localStorage', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
        result.current.addColor('#00FF00');
      });
      act(() => {
        result.current.removeColor('#ff0000');
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored as string)).toEqual([{ hex: '#00ff00' }]);
    });

    it('clearInventory 后同步更新 localStorage', () => {
      const { result } = renderHook(() => useInventory());
      act(() => {
        result.current.addColor('#FF0000');
      });
      act(() => {
        result.current.clearInventory();
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored as string)).toEqual([]);
    });

    it('新 hook 实例从 localStorage 读取已持久化数据', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([{ hex: '#ff0000', note: '红色' }]),
      );
      const { result } = renderHook(() => useInventory());
      expect(result.current.inventory).toEqual([
        { hex: '#ff0000', note: '红色' },
      ]);
      expect(result.current.hasColor('#FF0000')).toBe(true);
    });
  });
});
