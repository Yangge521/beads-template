import { describe, it, expect } from 'vitest';
import {
  cloneGrid,
  floodFill,
  resizeGrid,
  countColorUsage,
  compactColors,
} from '../gridEdit';

const grid3x3 = [
  [1, 1, 0],
  [1, 0, 2],
  [0, 2, 2],
];

describe('cloneGrid', () => {
  it('深拷贝：修改副本不影响原数组', () => {
    const original = [[1, 2], [3, 4]];
    const copy = cloneGrid(original);
    copy[0][0] = 99;
    expect(original[0][0]).toBe(1);
  });

  it('保持网格内容一致', () => {
    expect(cloneGrid(grid3x3)).toEqual(grid3x3);
  });

  it('空网格返回空', () => {
    expect(cloneGrid([])).toEqual([]);
  });
});

describe('floodFill', () => {
  it('从起点连通区域全部替换', () => {
    // 左上角 4 连通块（3 个 1）替换为 5
    const result = floodFill(grid3x3, 0, 0, 5);
    expect(result).toEqual([
      [5, 5, 0],
      [5, 0, 2],
      [0, 2, 2],
    ]);
  });

  it('不修改原网格', () => {
    const snapshot = JSON.stringify(grid3x3);
    floodFill(grid3x3, 0, 0, 9);
    expect(JSON.stringify(grid3x3)).toBe(snapshot);
  });

  it('target === newValue 时直接返回（不替换）', () => {
    const result = floodFill(grid3x3, 0, 0, 1);
    expect(result).toEqual(grid3x3);
  });

  it('越界起点返回原网格', () => {
    expect(floodFill(grid3x3, -1, 0, 5)).toEqual(grid3x3);
    expect(floodFill(grid3x3, 0, 99, 5)).toEqual(grid3x3);
  });

  it('空网格安全返回', () => {
    expect(floodFill([], 0, 0, 1)).toEqual([]);
  });

  it('对角线不连通：仅替换起点格子', () => {
    // 右下 2 的连通块（3 个 2）
    const result = floodFill(grid3x3, 2, 2, 7);
    expect(result).toEqual([
      [1, 1, 0],
      [1, 0, 7],
      [0, 7, 7],
    ]);
  });
});

describe('resizeGrid', () => {
  it('放大：新增格子填 0', () => {
    const result = resizeGrid(grid3x3, 4, 4);
    expect(result).toEqual([
      [1, 1, 0, 0],
      [1, 0, 2, 0],
      [0, 2, 2, 0],
      [0, 0, 0, 0],
    ]);
  });

  it('缩小：保留左上区域', () => {
    expect(resizeGrid(grid3x3, 2, 2)).toEqual([
      [1, 1],
      [1, 0],
    ]);
  });

  it('同尺寸返回内容一致（新数组）', () => {
    const result = resizeGrid(grid3x3, 3, 3);
    expect(result).toEqual(grid3x3);
    expect(result).not.toBe(grid3x3);
  });

  it('从空网格放大', () => {
    expect(resizeGrid([], 2, 2)).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it('0 行或 0 列返回空结构', () => {
    expect(resizeGrid(grid3x3, 0, 3)).toEqual([]);
    expect(resizeGrid(grid3x3, 3, 0)).toEqual([[], [], []]);
  });
});

describe('countColorUsage', () => {
  it('正确统计各索引用量', () => {
    const counts = countColorUsage(grid3x3);
    expect(counts.get(1)).toBe(3);
    expect(counts.get(2)).toBe(3);
    expect(counts.has(0)).toBe(false);
  });

  it('空网格返回空 Map', () => {
    expect(countColorUsage([]).size).toBe(0);
  });

  it('全空白网格返回空 Map', () => {
    expect(countColorUsage([[0, 0], [0, 0]]).size).toBe(0);
  });

  it('单一颜色全填满', () => {
    const counts = countColorUsage([[5, 5], [5, 5]]);
    expect(counts.get(5)).toBe(4);
    expect(counts.size).toBe(1);
  });
});

describe('compactColors', () => {
  it('移除未使用的颜色并紧凑索引', () => {
    // colors 中第 2 项（索引 1）未被使用
    const colors = [
      { hex: '#ff0000', name: 'red' },
      { hex: '#00ff00', name: 'green' },
      { hex: '#0000ff', name: 'blue' },
    ];
    // grid 用到 1 和 3，未用 2
    const grid = [
      [1, 1, 0],
      [0, 0, 3],
    ];
    const result = compactColors(grid, colors);
    // 1 -> 1, 3 -> 2
    expect(result.grid).toEqual([
      [1, 1, 0],
      [0, 0, 2],
    ]);
    expect(result.colors).toEqual([
      { hex: '#ff0000', name: 'red', count: 2 },
      { hex: '#0000ff', name: 'blue', count: 1 },
    ]);
  });

  it('索引保持顺序（按原索引升序映射）', () => {
    const colors = [
      { hex: '#a', name: 'a' },
      { hex: '#b', name: 'b' },
      { hex: '#c', name: 'c' },
    ];
    // 仅使用索引 3，应映射为 1
    const grid = [[3, 3], [3, 3]];
    const result = compactColors(grid, colors);
    expect(result.grid).toEqual([[1, 1], [1, 1]]);
    expect(result.colors).toHaveLength(1);
    expect(result.colors[0].name).toBe('c');
    expect(result.colors[0].count).toBe(4);
  });

  it('全空白网格返回空 colors 和零网格', () => {
    const colors = [{ hex: '#000', name: 'black' }];
    const grid = [[0, 0], [0, 0]];
    const result = compactColors(grid, colors);
    expect(result.colors).toEqual([]);
    expect(result.grid).toEqual([[0, 0], [0, 0]]);
  });

  it('count 字段准确反映用量', () => {
    const colors = [
      { hex: '#1', name: 'one' },
      { hex: '#2', name: 'two' },
    ];
    const grid = [
      [1, 1, 1],
      [2, 2, 0],
    ];
    const result = compactColors(grid, colors);
    const one = result.colors.find(c => c.name === 'one');
    const two = result.colors.find(c => c.name === 'two');
    expect(one?.count).toBe(3);
    expect(two?.count).toBe(2);
  });

  it('不修改原 grid 和 colors', () => {
    const colors = [{ hex: '#fff', name: 'white' }];
    const grid = [[1, 0], [0, 1]];
    const gridSnapshot = JSON.stringify(grid);
    const colorsSnapshot = JSON.stringify(colors);
    compactColors(grid, colors);
    expect(JSON.stringify(grid)).toBe(gridSnapshot);
    expect(JSON.stringify(colors)).toBe(colorsSnapshot);
  });
});
