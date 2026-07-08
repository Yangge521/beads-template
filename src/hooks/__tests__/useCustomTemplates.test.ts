import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomTemplates } from '../useCustomTemplates';
import type { BeadTemplate } from '../../types/bead';

const STORAGE_KEY = 'beads-custom-templates';

/** 构造一个不带 id 的模板输入 */
function makeTemplateInput(
  overrides: Partial<Omit<BeadTemplate, 'id'>> = {},
): Omit<BeadTemplate, 'id'> {
  return {
    name: 'My Template',
    category: 'custom',
    description: 'test template',
    grid: [[1, 0], [0, 1]],
    colors: [{ hex: '#FF0000', name: 'red' }],
    beadCount: 2,
    difficulty: 'easy',
    tags: ['test'],
    source: 'test',
    ...overrides,
  };
}

describe('useCustomTemplates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始为空数组', () => {
    const { result } = renderHook(() => useCustomTemplates());
    expect(result.current.templates).toEqual([]);
  });

  describe('addTemplate', () => {
    it('返回带 id 的模板', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let created: BeadTemplate | undefined;
      act(() => {
        created = result.current.addTemplate(makeTemplateInput());
      });
      expect(created).toBeDefined();
      expect(created!.id).toBeTruthy();
      expect(created!.id.startsWith('custom-')).toBe(true);
    });

    it('返回的模板携带原数据', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let created: BeadTemplate | undefined;
      act(() => {
        created = result.current.addTemplate(makeTemplateInput());
      });
      expect(created!.name).toBe('My Template');
      expect(created!.grid).toEqual([[1, 0], [0, 1]]);
      expect(created!.colors).toEqual([{ hex: '#FF0000', name: 'red' }]);
      expect(created!.beadCount).toBe(2);
    });

    it('补齐 createdAt/updatedAt/version/origin 字段', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let created: BeadTemplate | undefined;
      act(() => {
        created = result.current.addTemplate(makeTemplateInput());
      });
      expect(created!.createdAt).toBeTruthy();
      expect(created!.updatedAt).toBeTruthy();
      expect(created!.version).toBe(2);
      expect(created!.origin).toBe('imported');
    });

    it('保留传入的 createdAt 与 origin', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let created: BeadTemplate | undefined;
      act(() => {
        created = result.current.addTemplate(
          makeTemplateInput({
            createdAt: '2020-01-01T00:00:00.000Z',
            origin: 'upload',
          }),
        );
      });
      expect(created!.createdAt).toBe('2020-01-01T00:00:00.000Z');
      expect(created!.origin).toBe('upload');
    });

    it('新模板插入到列表头部', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let first: BeadTemplate | undefined;
      let second: BeadTemplate | undefined;
      act(() => {
        first = result.current.addTemplate(makeTemplateInput({ name: 'First' }));
        second = result.current.addTemplate(makeTemplateInput({ name: 'Second' }));
      });
      expect(result.current.templates).toHaveLength(2);
      expect(result.current.templates[0].id).toBe(second!.id);
      expect(result.current.templates[1].id).toBe(first!.id);
    });

    it('写入 localStorage', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let created: BeadTemplate | undefined;
      act(() => {
        created = result.current.addTemplate(makeTemplateInput());
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored as string);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(created!.id);
      expect(parsed[0].name).toBe('My Template');
      expect(parsed[0].version).toBe(2);
    });
  });

  describe('removeTemplate', () => {
    it('按 id 移除模板', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let a: BeadTemplate | undefined;
      let b: BeadTemplate | undefined;
      act(() => {
        a = result.current.addTemplate(makeTemplateInput({ name: 'A' }));
        b = result.current.addTemplate(makeTemplateInput({ name: 'B' }));
      });
      act(() => {
        result.current.removeTemplate(a!.id);
      });
      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].id).toBe(b!.id);
    });

    it('移除不存在的 id 不影响数据', () => {
      const { result } = renderHook(() => useCustomTemplates());
      act(() => {
        result.current.addTemplate(makeTemplateInput());
      });
      const before = result.current.templates;
      act(() => {
        result.current.removeTemplate('nonexistent-id');
      });
      // 内容不变（filter 总会返回新数组引用，但数据保持一致）
      expect(result.current.templates).toEqual(before);
      expect(result.current.templates).toHaveLength(1);
    });

    it('同步更新 localStorage', () => {
      const { result } = renderHook(() => useCustomTemplates());
      let a: BeadTemplate | undefined;
      act(() => {
        a = result.current.addTemplate(makeTemplateInput());
        result.current.addTemplate(makeTemplateInput({ name: 'B' }));
      });
      act(() => {
        result.current.removeTemplate(a!.id);
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored as string);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('B');
    });
  });

  describe('clearAll', () => {
    it('清空所有模板', () => {
      const { result } = renderHook(() => useCustomTemplates());
      act(() => {
        result.current.addTemplate(makeTemplateInput({ name: 'A' }));
        result.current.addTemplate(makeTemplateInput({ name: 'B' }));
      });
      expect(result.current.templates).toHaveLength(2);
      act(() => {
        result.current.clearAll();
      });
      expect(result.current.templates).toEqual([]);
    });

    it('同步清空 localStorage', () => {
      const { result } = renderHook(() => useCustomTemplates());
      act(() => {
        result.current.addTemplate(makeTemplateInput());
      });
      act(() => {
        result.current.clearAll();
      });
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual([]);
    });
  });

  describe('localStorage 加载', () => {
    it('新 hook 实例从 localStorage 读取已持久化数据', () => {
      const { result: first } = renderHook(() => useCustomTemplates());
      let created: BeadTemplate | undefined;
      act(() => {
        created = first.current.addTemplate(makeTemplateInput());
      });
      const { result: second } = renderHook(() => useCustomTemplates());
      expect(second.current.templates).toHaveLength(1);
      expect(second.current.templates[0].id).toBe(created!.id);
    });

    it('加载时过滤不合法的模板', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          { id: 'valid-1', name: 'A', grid: [[1]], colors: [], beadCount: 1 },
          { name: 'missing id' }, // 无 id
          { id: 'no-grid', name: 'B' }, // 无 grid
          'not-an-object',
          null,
        ]),
      );
      const { result } = renderHook(() => useCustomTemplates());
      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].id).toBe('valid-1');
    });

    it('损坏 JSON 容错返回空数组', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');
      const { result } = renderHook(() => useCustomTemplates());
      expect(result.current.templates).toEqual([]);
    });
  });
});
