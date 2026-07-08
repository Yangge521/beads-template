/**
 * 键值对 Repository 抽象层
 *
 * 用于收藏/进度/库存/评分/评论等用户数据的存储抽象。
 * 当前使用 localStorage 实现，未来可切换为远程 KV 存储。
 */

/** KV Repository 接口 */
export interface KVRepository {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): boolean;
  remove(key: string): void;
  keys(): string[];
}

/** localStorage KV Repository 实现 */
export class LocalKVRepository implements KVRepository {
  get<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // 忽略
    }
  }

  keys(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) result.push(key);
    }
    return result;
  }
}

// 单例
let kvInstance: KVRepository | null = null;

/** 获取 KV Repository 单例 */
export function getKVRepository(): KVRepository {
  if (!kvInstance) {
    kvInstance = new LocalKVRepository();
  }
  return kvInstance;
}

/** 注入 KV Repository（用于测试） */
export function setKVRepository(repo: KVRepository): void {
  kvInstance = repo;
}
