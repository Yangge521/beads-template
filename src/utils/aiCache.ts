/**
 * AI 响应缓存 + 请求重试工具
 *
 * - 使用 IndexedDB 缓存 AI 响应（key = prompt+options 哈希），TTL 24h
 * - 提供重试包装函数，网络错误自动重试 1 次
 * - 纯前端项目，缓存仅本地，不跨设备
 */

import { openDB, idbGet, idbPut } from './idbRepository';

const CACHE_STORE = 'kv';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时

interface CacheEntry {
  value: string;
  timestamp: number;
  ttl: number;
}

/** 简单字符串哈希（djb2 算法），用于生成缓存 key */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff; // 转为 32 位整数
  }
  // 转 hex 字符串
  return (hash >>> 0).toString(16);
}

/** 生成缓存 key：agnes-cache-<hash> */
export function buildCacheKey(prompt: string, options?: Record<string, unknown>): string {
  const sig = JSON.stringify({ prompt, options });
  return `agnes-cache-${hashString(sig)}`;
}

/**
 * 从 IndexedDB 读取缓存
 * @returns 缓存的字符串，未命中或过期返回 null
 */
export async function getCache(key: string): Promise<string | null> {
  try {
    const entry = await idbGet<CacheEntry>(CACHE_STORE, key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      // 过期，不返回（清理留给写入时覆盖）
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

/**
 * 写入缓存到 IndexedDB
 */
export async function setCache(key: string, value: string): Promise<void> {
  try {
    const entry: CacheEntry = {
      value,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
    };
    await idbPut(CACHE_STORE, entry, key);
  } catch {
    // 缓存写入失败静默忽略
  }
}

/**
 * 重试包装器
 * @param fn 要执行的异步函数
 * @param retries 重试次数（默认 1）
 * @param delay 重试间隔毫秒（默认 1000）
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  delay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      // AbortError 不重试
      if (e instanceof Error && e.name === 'AbortError') throw e;
      // 最后一次尝试不再等待
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * 带缓存的 AI 调用包装
 * - 先查缓存，命中则直接返回
 * - 未命中则调用 fn，成功后写入缓存
 * - 支持 abort signal（缓存命中时也会检查 signal）
 */
export async function callWithCache(
  cacheKey: string,
  fn: () => Promise<string>,
  signal?: AbortSignal
): Promise<string> {
  // 检查是否已取消
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // 尝试缓存
  const cached = await getCache(cacheKey);
  if (cached !== null) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    return cached;
  }

  // 调用并缓存
  const result = await fn();
  await setCache(cacheKey, result);
  return result;
}

// 预热 IndexedDB（模块加载时不阻塞，异步打开）
openDB().catch(() => { /* 隐私模式静默 */ });
