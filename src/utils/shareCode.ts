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

// 字段长度上限，防止恶意超长字符串
const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 500;
const MAX_TAGS = 20;
const MAX_TAG_LEN = 30;
const MAX_GRID_DIM = 128;       // 单边最大 128（128*128=16384）
const MAX_COLORS = 256;
const MAX_COLOR_NAME_LEN = 50;

// 合法 hex 颜色正则（#rrggbb）
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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
    cs: tpl.colors.map(c => [c.hex, c.name, c.count ?? 0]),
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
 * 校验分享码解码后的 CompactTemplate 是否合法
 * 校验：字段类型、长度上限、grid 数值范围、hex 格式、difficulty 枚举
 */
function validateCompact(c: unknown): c is CompactTemplate {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  // 字符串字段
  if (typeof o.n !== 'string' || o.n.length === 0 || o.n.length > MAX_NAME_LEN) return false;
  if (typeof o.d !== 'string' || o.d.length > MAX_DESC_LEN) return false;
  if (typeof o.c !== 'string' || o.c.length > MAX_NAME_LEN) return false;
  if (typeof o.s !== 'string' || o.s.length > MAX_NAME_LEN) return false;
  // difficulty 枚举
  if (o.df !== 'easy' && o.df !== 'medium' && o.df !== 'hard') return false;
  // beadCount 非负整数
  if (typeof o.b !== 'number' || !Number.isFinite(o.b) || o.b < 0 || o.b > MAX_GRID_DIM * MAX_GRID_DIM) return false;
  // grid: number[][]
  if (!Array.isArray(o.g) || o.g.length === 0 || o.g.length > MAX_GRID_DIM) return false;
  const cols = o.g[0];
  if (!Array.isArray(cols) || cols.length === 0 || cols.length > MAX_GRID_DIM) return false;
  const colLen = cols.length;
  for (const row of o.g) {
    if (!Array.isArray(row) || row.length !== colLen) return false;
    for (const v of row) {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < -1 || v >= MAX_COLORS) return false;
    }
  }
  // colors: [hex, name, count][]
  if (!Array.isArray(o.cs) || o.cs.length === 0 || o.cs.length > MAX_COLORS) return false;
  for (const item of o.cs) {
    if (!Array.isArray(item) || item.length !== 3) return false;
    const [hex, name, count] = item;
    if (typeof hex !== 'string' || !HEX_RE.test(hex)) return false;
    if (typeof name !== 'string' || name.length > MAX_COLOR_NAME_LEN) return false;
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return false;
  }
  // tags: string[]
  if (!Array.isArray(o.t) || o.t.length > MAX_TAGS) return false;
  for (const tag of o.t) {
    if (typeof tag !== 'string' || tag.length > MAX_TAG_LEN) return false;
  }
  return true;
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
    const parsed = JSON.parse(json);
    if (!validateCompact(parsed)) return null;
    return fromCompact(parsed);
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
