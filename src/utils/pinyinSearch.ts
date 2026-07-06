/**
 * 拼音搜索工具
 * 支持中文模板名的拼音首字母、全拼、原文字符三种匹配方式
 */
import { pinyin } from 'pinyin-pro';

export interface SearchableItem {
  /** 原始文本（模板名、标签等） */
  text: string;
}

export interface PinyinIndex {
  /** 原始文本 */
  original: string;
  /** 全拼（无空格，小写），如 "pi ka qiu" */
  pinyinFull: string;
  /** 首字母（小写），如 "pkq" */
  pinyinInitials: string;
  /** 全拼（带空格），如 "pi ka qiu" */
  pinyinSpaced: string;
}

const indexCache = new Map<string, PinyinIndex>();

/**
 * 为文本构建拼音索引（带缓存）
 */
export function buildPinyinIndex(text: string): PinyinIndex {
  const cached = indexCache.get(text);
  if (cached) return cached;

  // 提取中文字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);

  if (!hasChinese) {
    const result: PinyinIndex = {
      original: text,
      pinyinFull: text.toLowerCase(),
      pinyinInitials: text.toLowerCase(),
      pinyinSpaced: text.toLowerCase(),
    };
    indexCache.set(text, result);
    return result;
  }

  // 转换拼音：不带声调、小写
  const pinyinArr = pinyin(text, { toneType: 'none', type: 'array' }) as string[];
  const pinyinFull = pinyinArr.join('');
  const pinyinInitials = pinyinArr.map(p => p.charAt(0)).join('');
  const pinyinSpaced = pinyinArr.join(' ');

  const result: PinyinIndex = {
    original: text,
    pinyinFull: pinyinFull.toLowerCase(),
    pinyinInitials: pinyinInitials.toLowerCase(),
    pinyinSpaced: pinyinSpaced.toLowerCase(),
  };
  indexCache.set(text, result);
  return result;
}

/**
 * 模糊匹配：支持原文、拼音全拼、拼音首字母
 * @param text 目标文本（如模板名）
 * @param query 搜索词
 * @returns 是否匹配
 */
export function pinyinMatch(text: string, query: string): boolean {
  if (!query) return true;
  if (!text) return false;

  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 1. 原文子串匹配（包括中文、英文、数字）
  if (text.toLowerCase().includes(q)) return true;

  // 2. 拼音匹配
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  if (!hasChinese) return false;

  const idx = buildPinyinIndex(text);
  // 全拼匹配（如 "pikaqiu" 匹配 "皮卡丘"）
  if (idx.pinyinFull.includes(q)) return true;
  // 首字母匹配（如 "pkq" 匹配 "皮卡丘"）
  if (idx.pinyinInitials.includes(q)) return true;
  // 带空格全拼匹配（如 "pi ka" 匹配 "皮卡"）
  if (idx.pinyinSpaced.includes(q)) return true;

  return false;
}

/**
 * 多字段模糊匹配：对多个字段（name、tags、description）任一命中即返回 true
 */
export function multiFieldPinyinMatch(
  fields: (string | undefined | null)[],
  query: string
): boolean {
  if (!query) return true;
  const q = query.trim();
  if (!q) return true;
  return fields.some(field => field && pinyinMatch(field, q));
}
