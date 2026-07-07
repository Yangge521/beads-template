import { describe, it, expect, beforeAll } from 'vitest';
import { encodeShareCode, decodeShareCode, extractShareCodeFromUrl, buildShareUrl } from '../shareCode';
import type { BeadTemplate } from '../../types/bead';

// shareCode 依赖 window.location，vitest 默认 node 环境无 window，注入桩
beforeAll(() => {
  const stub = {
    origin: 'https://example.com',
    pathname: '/share',
    href: 'https://example.com/share',
  };
  // @ts-expect-error 测试桩，只赋 shareCode 实际访问的字段
  globalThis.window = { location: stub };
  // @ts-expect-error 同上
  globalThis.location = stub;
});

const sampleTpl: BeadTemplate = {
  id: 'test-1',
  name: '测试模板',
  category: 'anime',
  description: '一个用于测试的模板',
  grid: [
    [1, 0, 2],
    [0, 3, 0],
  ],
  colors: [
    { hex: '#ff0000', name: '红', count: 1 },
    { hex: '#00ff00', name: '绿', count: 1 },
    { hex: '#0000ff', name: '蓝', count: 1 },
  ],
  beadCount: 3,
  difficulty: 'easy',
  tags: ['test', 'sample'],
  source: 'AI',
};

describe('encodeShareCode / decodeShareCode', () => {
  it('编码后以 BTD1. 前缀开头', () => {
    const code = encodeShareCode(sampleTpl);
    expect(code.startsWith('BTD1.')).toBe(true);
  });

  it('解码后还原模板字段（id 除外，因为会重新生成）', () => {
    const code = encodeShareCode(sampleTpl);
    const decoded = decodeShareCode(code);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe('测试模板');
    expect(decoded!.description).toBe('一个用于测试的模板');
    expect(decoded!.grid).toEqual(sampleTpl.grid);
    expect(decoded!.colors).toEqual(sampleTpl.colors);
    expect(decoded!.beadCount).toBe(3);
    expect(decoded!.difficulty).toBe('easy');
    expect(decoded!.tags).toContain('shared');
    expect(decoded!.tags).toContain('test');
    expect(decoded!.category).toBe('custom');
  });

  it('中文内容编解码保持完整', () => {
    const cnTpl: BeadTemplate = {
      ...sampleTpl,
      name: '皮卡丘',
      description: '电属性宝可梦',
      colors: [{ hex: '#ffcb05', name: '皮卡丘黄', count: 10 }],
    };
    const decoded = decodeShareCode(encodeShareCode(cnTpl));
    expect(decoded!.name).toBe('皮卡丘');
    expect(decoded!.description).toBe('电属性宝可梦');
    expect(decoded!.colors[0].name).toBe('皮卡丘黄');
  });

  it('解码非法字符串返回 null', () => {
    expect(decodeShareCode('')).toBeNull();
    expect(decodeShareCode('invalid')).toBeNull();
    expect(decodeShareCode('BTD1.!!!invalid base64!!!')).toBeNull();
  });

  it('解码空 grid 返回 null', () => {
    const emptyTpl: BeadTemplate = { ...sampleTpl, grid: [] };
    expect(decodeShareCode(encodeShareCode(emptyTpl))).toBeNull();
  });

  it('id 每次解码都不同（基于时间戳+随机）', () => {
    const code = encodeShareCode(sampleTpl);
    const d1 = decodeShareCode(code);
    const d2 = decodeShareCode(code);
    expect(d1!.id).not.toBe(d2!.id);
  });
});

describe('extractShareCodeFromUrl', () => {
  it('从 query 参数 ?share=BTD1.xxx 提取', () => {
    const code = encodeShareCode(sampleTpl);
    const url = `https://example.com/?share=${code}`;
    expect(extractShareCodeFromUrl(url)).toBe(code);
  });

  it('从 hash #share=BTD1.xxx 提取', () => {
    const code = encodeShareCode(sampleTpl);
    const url = `https://example.com/#share=${code}`;
    expect(extractShareCodeFromUrl(url)).toBe(code);
  });

  it('无 share 参数返回 null', () => {
    expect(extractShareCodeFromUrl('https://example.com/')).toBeNull();
    expect(extractShareCodeFromUrl('https://example.com/?other=foo')).toBeNull();
  });

  it('非法 URL 返回 null', () => {
    expect(extractShareCodeFromUrl('not-a-url')).toBeNull();
  });

  it('默认使用 window.location.href', () => {
    // 在 jsdom 环境下 location.href 是 http://localhost/
    expect(extractShareCodeFromUrl()).toBeNull();
  });
});

describe('buildShareUrl', () => {
  it('返回包含 share= 的 URL', () => {
    const url = buildShareUrl(sampleTpl);
    expect(url).toContain('#share=BTD1.');
  });

  it('URL 中包含的分享码可被 extractShareCodeFromUrl 提取', () => {
    const url = buildShareUrl(sampleTpl);
    const code = extractShareCodeFromUrl(url);
    expect(code).not.toBeNull();
    expect(code!.startsWith('BTD1.')).toBe(true);
  });
});
