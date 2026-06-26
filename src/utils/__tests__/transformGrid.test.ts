import { describe, it, expect } from 'vitest';
import {
  flipHorizontal,
  flipVertical,
  rotate90,
  rotate270,
  applyTransform,
} from '../transformGrid';

const grid2x3 = [
  [1, 2, 3],
  [4, 5, 6],
];

describe('flipHorizontal', () => {
  it('左右镜像 2x3', () => {
    expect(flipHorizontal(grid2x3)).toEqual([
      [3, 2, 1],
      [6, 5, 4],
    ]);
  });

  it('不修改原数组', () => {
    const original = [[1, 2], [3, 4]];
    const snapshot = JSON.stringify(original);
    flipHorizontal(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('空 grid 返回空', () => {
    expect(flipHorizontal([])).toEqual([]);
  });
});

describe('flipVertical', () => {
  it('上下镜像 2x3', () => {
    expect(flipVertical(grid2x3)).toEqual([
      [4, 5, 6],
      [1, 2, 3],
    ]);
  });

  it('不修改原数组', () => {
    const original = [[1, 2], [3, 4]];
    const snapshot = JSON.stringify(original);
    flipVertical(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('rotate90', () => {
  it('顺时针 90°：2x3 -> 3x2', () => {
    expect(rotate90(grid2x3)).toEqual([
      [4, 1],
      [5, 2],
      [6, 3],
    ]);
  });

  it('旋转 4 次回到原样', () => {
    let g = grid2x3;
    g = rotate90(g);
    g = rotate90(g);
    g = rotate90(g);
    g = rotate90(g);
    expect(g).toEqual(grid2x3);
  });
});

describe('rotate270', () => {
  it('逆时针 90° = rotate90 三次', () => {
    const once = rotate270(grid2x3);
    const thrice = rotate90(rotate90(rotate90(grid2x3)));
    expect(once).toEqual(thrice);
  });

  it('逆时针 90°：2x3 -> 3x2', () => {
    expect(rotate270(grid2x3)).toEqual([
      [3, 6],
      [2, 5],
      [1, 4],
    ]);
  });
});

describe('applyTransform', () => {
  it('flipH 路由正确', () => {
    expect(applyTransform(grid2x3, 'flipH')).toEqual(flipHorizontal(grid2x3));
  });

  it('flipV 路由正确', () => {
    expect(applyTransform(grid2x3, 'flipV')).toEqual(flipVertical(grid2x3));
  });

  it('rotate90 路由正确', () => {
    expect(applyTransform(grid2x3, 'rotate90')).toEqual(rotate90(grid2x3));
  });

  it('rotate270 路由正确', () => {
    expect(applyTransform(grid2x3, 'rotate270')).toEqual(rotate270(grid2x3));
  });
});
