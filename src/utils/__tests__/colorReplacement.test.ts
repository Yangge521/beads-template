import { describe, it, expect } from 'vitest';
import {
  detectMissingColors,
  applyColorReplacements,
  isSameColor,
  getDistanceLevel,
  type MissingColorInfo,
} from '../colorReplacement';
import type { BeadTemplate, ColorInfo } from '../../types/bead';

const makeTemplate = (colors: ColorInfo[], grid: number[][]): BeadTemplate => ({
  id: 'test',
  name: 'test',
  category: 'anime',
  description: '',
  grid,
  colors,
  beadCount: grid.flat().filter(v => v > 0).length,
  difficulty: 'easy',
  tags: [],
  source: 'AI',
});

describe('detectMissingColors', () => {
  it('库存为空时所有用到的颜色都返回', () => {
    const tpl = makeTemplate(
      [{ hex: '#ff0000', name: '红', count: 2 }],
      [[1, 1], [0, 0]]
    );
    const result = detectMissingColors(tpl, []);
    expect(result.length).toBe(1);
    expect(result[0].hex).toBe('#ff0000');
    expect(result[0].count).toBe(2);
    expect(result[0].replacement).toBeNull();
    expect(result[0].distance).toBe(Infinity);
  });

  it('库存包含该颜色时跳过', () => {
    const tpl = makeTemplate(
      [{ hex: '#ff0000', name: '红', count: 1 }],
      [[1, 0]]
    );
    expect(detectMissingColors(tpl, ['#ff0000'])).toEqual([]);
  });

  it('大小写不敏感匹配', () => {
    const tpl = makeTemplate(
      [{ hex: '#FF0000', name: '红', count: 1 }],
      [[1]]
    );
    expect(detectMissingColors(tpl, ['#ff0000'])).toEqual([]);
  });

  it('按 count 降序排序', () => {
    const tpl = makeTemplate(
      [
        { hex: '#ff0000', name: '红', count: 1 },
        { hex: '#00ff00', name: '绿', count: 5 },
      ],
      [
        [1, 2, 2, 2, 2, 2],
        [0, 0, 0, 0, 0, 0],
      ]
    );
    const result = detectMissingColors(tpl, []);
    expect(result[0].hex).toBe('#00ff00');
    expect(result[1].hex).toBe('#ff0000');
  });

  it('grid 中未使用的颜色（count=0）被跳过', () => {
    const tpl = makeTemplate(
      [
        { hex: '#ff0000', name: '红', count: 0 },
        { hex: '#00ff00', name: '绿', count: 1 },
      ],
      [[2]]
    );
    const result = detectMissingColors(tpl, []);
    expect(result.length).toBe(1);
    expect(result[0].hex).toBe('#00ff00');
  });

  it('阈值内推荐替换色', () => {
    const tpl = makeTemplate(
      [{ hex: '#ff0000', name: '红', count: 1 }],
      [[1]]
    );
    // #ff0001 与 #ff0000 极接近
    const result = detectMissingColors(tpl, ['#ff0001']);
    expect(result[0].replacement).toBe('#ff0001');
  });

  it('超过阈值时 replacement 为 null', () => {
    const tpl = makeTemplate(
      [{ hex: '#ff0000', name: '红', count: 1 }],
      [[1]]
    );
    // #0000ff 与 #ff0000 距离很远
    const result = detectMissingColors(tpl, ['#0000ff'], 0.01);
    expect(result[0].replacement).toBeNull();
  });
});

describe('applyColorReplacements', () => {
  it('应用确认的替换', () => {
    const colors: ColorInfo[] = [
      { hex: '#ff0000', name: '红', count: 1 },
      { hex: '#00ff00', name: '绿', count: 1 },
    ];
    const replacements: MissingColorInfo[] = [
      { hex: '#FF0000', name: '红', count: 1, replacement: '#ff0001', distance: 0.01 },
    ];
    const result = applyColorReplacements(colors, replacements);
    expect(result[0].hex).toBe('#ff0001');
    expect(result[1].hex).toBe('#00ff00'); // 未在 replacements 中，不变
  });

  it('replacement 为 null 的不替换', () => {
    const colors: ColorInfo[] = [{ hex: '#ff0000', name: '红', count: 1 }];
    const replacements: MissingColorInfo[] = [
      { hex: '#ff0000', name: '红', count: 1, replacement: null, distance: Infinity },
    ];
    const result = applyColorReplacements(colors, replacements);
    expect(result[0].hex).toBe('#ff0000');
  });

  it('空 replacements 数组返回原 colors', () => {
    const colors: ColorInfo[] = [{ hex: '#ff0000', name: '红', count: 1 }];
    expect(applyColorReplacements(colors, [])).toEqual(colors);
  });
});

describe('isSameColor', () => {
  it('大小写不敏感比较', () => {
    expect(isSameColor('#FF0000', '#ff0000')).toBe(true);
    expect(isSameColor('#ff0000', '#ff0000')).toBe(true);
    expect(isSameColor('#ff0000', '#00ff00')).toBe(false);
  });
});

describe('getDistanceLevel', () => {
  it('distance <= 0.05 返回 close', () => {
    expect(getDistanceLevel(0)).toBe('close');
    expect(getDistanceLevel(0.05)).toBe('close');
  });
  it('0.05 < distance <= 0.12 返回 medium', () => {
    expect(getDistanceLevel(0.06)).toBe('medium');
    expect(getDistanceLevel(0.12)).toBe('medium');
  });
  it('distance > 0.12 返回 far', () => {
    expect(getDistanceLevel(0.13)).toBe('far');
    expect(getDistanceLevel(1)).toBe('far');
  });
});
