import { describe, it, expect } from 'vitest';
import { aggregateMaterials, getTotalBeads } from '../aggregateMaterials';
import type { BeadTemplate } from '../../types/bead';

function makeTemplate(id: string, grid: number[][], colors: { hex: string; name: string; count: number }[]): BeadTemplate {
  return {
    id, name: id, category: 'test', description: '',
    grid, colors, beadCount: 0, difficulty: 'easy', tags: [], source: '',
  };
}

describe('aggregateMaterials', () => {
  it('单模板：按 hex 聚合', () => {
    const tpl = makeTemplate('a', [[1, 1, 2], [1, 0, 2]], [
      { hex: '#FF0000', name: '红', count: 3 },
      { hex: '#00FF00', name: '绿', count: 2 },
    ]);
    const result = aggregateMaterials([tpl]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ hex: '#FF0000', name: '红', count: 3, templateCount: 1 });
    expect(result[1]).toEqual({ hex: '#00FF00', name: '绿', count: 2, templateCount: 1 });
  });

  it('多模板：相同 hex 合并数量', () => {
    const tpl1 = makeTemplate('a', [[1, 1], [1, 0]], [
      { hex: '#FF0000', name: '红', count: 3 },
    ]);
    const tpl2 = makeTemplate('b', [[1, 1, 1]], [
      { hex: '#FF0000', name: '红色', count: 3 },
    ]);
    const result = aggregateMaterials([tpl1, tpl2]);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(6);
    expect(result[0].templateCount).toBe(2);
    // 名称取首次遇到的
    expect(result[0].name).toBe('红');
  });

  it('hex 大小写不敏感合并', () => {
    const tpl1 = makeTemplate('a', [[1]], [{ hex: '#ff0000', name: '红', count: 1 }]);
    const tpl2 = makeTemplate('b', [[1]], [{ hex: '#FF0000', name: '红', count: 1 }]);
    const result = aggregateMaterials([tpl1, tpl2]);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });

  it('跳过 count 为 0 的颜色', () => {
    const tpl = makeTemplate('a', [[1, 0, 1]], [
      { hex: '#FF0000', name: '红', count: 2 },
      { hex: '#00FF00', name: '绿', count: 0 },
    ]);
    const result = aggregateMaterials([tpl]);
    expect(result).toHaveLength(1);
    expect(result[0].hex).toBe('#FF0000');
  });

  it('按数量降序排序', () => {
    const tpl = makeTemplate('a', [[1, 2, 2, 2]], [
      { hex: '#FF0000', name: '红', count: 1 },
      { hex: '#00FF00', name: '绿', count: 3 },
    ]);
    const result = aggregateMaterials([tpl]);
    expect(result[0].count).toBe(3);
    expect(result[1].count).toBe(1);
  });

  it('空数组返回空', () => {
    expect(aggregateMaterials([])).toEqual([]);
  });

  it('使用 grid 实际颗数而非 colors.count', () => {
    const tpl = makeTemplate('a', [[1, 1, 1]], [
      { hex: '#FF0000', name: '红', count: 999 },
    ]);
    const result = aggregateMaterials([tpl]);
    expect(result[0].count).toBe(3);
  });
});

describe('getTotalBeads', () => {
  it('汇总所有颜色数量', () => {
    const items = [
      { hex: '#FF0000', name: '红', count: 10, templateCount: 1 },
      { hex: '#00FF00', name: '绿', count: 20, templateCount: 1 },
    ];
    expect(getTotalBeads(items)).toBe(30);
  });

  it('空数组返回 0', () => {
    expect(getTotalBeads([])).toBe(0);
  });
});
