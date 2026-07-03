/**
 * 社区模板分享：分享码编解码
 *
 * 将单个 BeadTemplate 压缩编码为短字符串（分享码），
 * 便于复制粘贴、二维码扫描、URL 传递。
 *
 * 编码格式：
 *   BTD1.<base64url(JSON)
 *
 * 其中 JSON 结构精简：用紧凑字段名减少体积。
 */

import type { BeadTemplate } from '../types/bead';

const PREFIX = 'BTD1.';

// 精简字段名，减少分享码体积
interface CompactTemplate {
  n: string;       // name
  c: string;       // category
  d: string;       // description
  g: number[][];   // grid
  cs: [string, string, number][]; // colors: [hex, name, count]
  b: number;       // beadCount
  df: 'easy' | 'medium' | 'hard';
  t: string[];     // tags
  s: string;       // source
}

function toCompact(tpl: BeadTemplate): CompactTemplate {
  return {
    n: tpl.name,
    c: tpl.category,
    d: tpl.description,
    g: tpl.grid,
    cs: tpl.colors.map(c => [c.hex, c.name, c.count]),
    b: tpl.beadCount,
    df: tpl.difficulty,
    t: tpl.tags,
    s: tpl.source,
  };
}

function fromCompact(c: CompactTemplate): BeadTemplate {
  return {
    id: `shared-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: c.n,
    category: 'custom',
    description: c.d,
    grid: c.g,
    colors: c.cs.map(([hex, name, count]) => ({ hex, name, count })),
    beadCount: c.b,
    difficulty: c.df,
    tags: [...(c.t || []), 'shared'],
    source: c.s || 'community',
  };
}

// base64url 编码（支持 UTF-8 中文）
function encodeBase64Url(str: string): string {
  // 使用 encodeURIComponent 处理 UTF-8
  const utf8 = unescape(encodeURIComponent(str));
  // btoa 仅支持 Latin1
  const b64 = btoa(utf8);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(str: string): string {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  const utf8 = atob(padded);
  return decodeURIComponent(escape(utf8));
}

/**
 * 将模板编码为分享码
 */
export function encodeShareCode(tpl: BeadTemplate): string {
  const compact = toCompact(tpl);
  const json = JSON.stringify(compact);
  return PREFIX + encodeBase64Url(json);
}

/**
 * 从分享码解码模板
 */
export function decodeShareCode(code: string): BeadTemplate | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith(PREFIX)) return null;
    const b64 = trimmed.slice(PREFIX.length);
    const json = decodeBase64Url(b64);
    const compact = JSON.parse(json) as CompactTemplate;
    // 基本校验
    if (!compact || !Array.isArray(compact.g) || !Array.isArray(compact.cs)) return null;
    if (compact.g.length === 0) return null;
    return fromCompact(compact);
  } catch {
    return null;
  }
}

/**
 * 从 URL 查询参数中提取分享码
 * 支持 ?share=BTD1.xxx 或 #share=BTD1.xxx
 */
export function extractShareCodeFromUrl(url: string = window.location.href): string | null {
  try {
    const u = new URL(url);
    const share = u.searchParams.get('share');
    if (share && share.startsWith(PREFIX)) return share;
    // hash 内查询
    const hash = u.hash.slice(1);
    if (hash.startsWith('share=')) {
      return hash.slice('share='.length);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 构建分享链接
 */
export function buildShareUrl(tpl: BeadTemplate): string {
  const code = encodeShareCode(tpl);
  const base = window.location.origin + window.location.pathname;
  return `${base}#share=${code}`;
}
