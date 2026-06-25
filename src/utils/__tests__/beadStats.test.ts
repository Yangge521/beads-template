import { describe, it, expect } from 'vitest';
import { computeBeadCount, computeColorCounts, getCorrectedColors, getBeadCount } from '../beadStats';
import type { BeadTemplate } from '../../types/bead';

describe('computeBeadCount', () => {
  it('统计非零格子数', () => {
    const grid = [
      [0, 1, 2],
      [1, 0, 3],
    ];
    expect(computeBeadCount(grid)).toBe(4);
  });

  it('空 grid 返回 0', () => {
    expect(computeBeadCount([])).toBe(0);
    expect(computeBeadCount([[]])).toBe(0);
  });

  it('全零 grid 返回 0', () => {
    expect(computeBeadCount([[0, 0], [0, 0]])).toBe(0);
  });

  it('全非零 grid 返回格子总数', () => {
    expect(computeBeadCount([[1, 1], [1, 1]])).toBe(4);
  });
});

describe('computeColorCounts', () => {
  it('按颜色索引统计颗数', () => {
    const grid = [
      [1, 1, 2],
      [1, 3, 2],
    ];
    // colors[0]=1 出现3次, colors[1]=2 出现2次, colors[2]=3 出现1次
    expect(computeColorCounts(grid)).toEqual([3, 2, 1]);
  });

  it('跳过零值格子', () => {
    const grid = [[0, 0, 1, 0, 1]];
    expect(computeColorCounts(grid)).toEqual([2]);
  });

  it('空 grid 返回空数组', () => {
    expect(computeColorCounts([])).toEqual([]);
  });

  it('颜色索引不连续时也正确统计', () => {
    // grid 用了值 1 和 3，但没用到 2，结果数组索引 1 应为 undefined→0
    const grid = [[1, 3, 1, 3]];
    const counts = computeColorCounts(grid);
    expect(counts[0]).toBe(2); // 值1
    expect(counts[2]).toBe(2); // 值3
  });
});

describe('getCorrectedColors', () => {
  it('用 grid 实际颗数覆盖 JSON 中的 count', () => {
    const template: BeadTemplate = {
      id: 'test',
      name: '测试',
      category: 'test',
      description: '',
      grid: [[1, 1, 2], [1, 0, 2]],
      colors: [
        { hex: '#FF0000', name: '红', count: 999 },
        { hex: '#00FF00', name: '绿', count: 888 },
      ],
      beadCount: 999,
      difficulty: 'easy',
      tags: [],
      source: '',
    };
    const corrected = getCorrectedColors(template);
    expect(corrected[0].count).toBe(3); // 值1 出现3次，而非 999
    expect(corrected[1].count).toBe(2); // 值2 出现2次，而非 888
    // hex 和 name 保持不变
    expect(corrected[0].hex).toBe('#FF0000');
    expect(corrected[1].name).toBe('绿');
  });

  it('colors 比 grid 用到的多时，未使用的颜色 count 为 0', () => {
    const template: BeadTemplate = {
      id: 'test',
      name: '测试',
      category: 'test',
      description: '',
      grid: [[1, 1, 1]],
      colors: [
        { hex: '#FF0000', name: '红', count: 5 },
        { hex: '#00FF00', name: '绿', count: 5 },
      ],
      beadCount: 5,
      difficulty: 'easy',
      tags: [],
      source: '',
    };
    const corrected = getCorrectedColors(template);
    expect(corrected[0].count).toBe(3);
    expect(corrected[1].count).toBe(0);
  });
});

describe('getBeadCount', () => {
  it('返回 grid 非零格子数，与 JSON beadCount 无关', () => {
    const template: BeadTemplate = {
      id: 'test',
      name: '测试',
      category: 'test',
      description: '',
      grid: [[1, 0, 1], [1, 1, 0]],
      colors: [{ hex: '#000', name: '黑', count: 4 }],
      beadCount: 999, // JSON 里的值不对
      difficulty: 'easy',
      tags: [],
      source: '',
    };
    expect(getBeadCount(template)).toBe(4);
  });
});
