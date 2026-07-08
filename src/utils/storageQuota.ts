/**
 * localStorage 容量治理
 *
 * 功能：
 * 1. 检测当前 localStorage 使用量
 * 2. 当接近配额上限时发出告警
 * 3. 提供清理建议（按 key 占用排序）
 * 4. 提供 safeWrite 包装，写入失败时自动清理过期数据
 *
 * 浏览器 localStorage 通常限制 5MB，项目用多个 key 存储：
 * - beads-custom-templates（自定义模板，可能较大）
 * - beads-favorites, beads-likes, beads-ratings, beads-progress
 * - beads-inventory, beads-compare, beads-search-history
 * - beads-comments, beads-shared-templates, beads-ai-history 等
 */

/** localStorage 估算配额上限（字节），保守取 4.5MB */
const QUOTA_WARN_THRESHOLD = 4.5 * 1024 * 1024;
const QUOTA_CRITICAL_THRESHOLD = 4.8 * 1024 * 1024;

export interface StorageUsage {
  key: string;
  sizeBytes: number;
  sizeKB: number;
}

export interface StorageQuotaStatus {
  totalBytes: number;
  totalKB: number;
  totalMB: number;
  usage: StorageUsage[];
  status: 'ok' | 'warning' | 'critical';
  /** 可安全清理的 key（如搜索历史） */
  cleanableKeys: string[];
}

/** 可安全清理的 key 前缀（非核心数据） */
const CLEANABLE_KEY_PREFIXES = [
  'beads-search-history',
  'beads-ai-history',
  'beads-recently-viewed',
];

/**
 * 获取 localStorage 使用情况
 */
export function getStorageUsage(): StorageQuotaStatus {
  const usage: StorageUsage[] = [];
  let totalBytes = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      const value = localStorage.getItem(key) ?? '';
      const sizeBytes = new Blob([value]).size + key.length;
      totalBytes += sizeBytes;
      usage.push({
        key,
        sizeBytes,
        sizeKB: Math.round(sizeBytes / 1024 * 10) / 10,
      });
    } catch {
      // 忽略读取失败
    }
  }

  usage.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const status: StorageQuotaStatus['status'] =
    totalBytes >= QUOTA_CRITICAL_THRESHOLD ? 'critical' :
    totalBytes >= QUOTA_WARN_THRESHOLD ? 'warning' : 'ok';

  return {
    totalBytes,
    totalKB: Math.round(totalBytes / 1024 * 10) / 10,
    totalMB: Math.round(totalBytes / 1024 / 1024 * 100) / 100,
    usage,
    status,
    cleanableKeys: usage
      .filter(u => CLEANABLE_KEY_PREFIXES.some(p => u.key.startsWith(p)))
      .map(u => u.key),
  };
}

/**
 * 清理可安全删除的数据（搜索历史、AI 历史等非核心数据）
 * @returns 释放的字节数
 */
export function cleanStorage(): number {
  let freed = 0;
  const status = getStorageUsage();
  for (const key of status.cleanableKeys) {
    try {
      const value = localStorage.getItem(key) ?? '';
      freed += new Blob([value]).size + key.length;
      localStorage.removeItem(key);
    } catch {
      // 忽略
    }
  }
  return freed;
}

/**
 * 安全写入 localStorage：配额不足时自动清理后重试
 * @returns true 写入成功，false 写入失败
 */
export function safeWriteStorage<T>(key: string, value: T): boolean {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
    return true;
  } catch {
    // 配额不足，尝试清理后重试
    const freed = cleanStorage();
    if (freed > 0) {
      try {
        localStorage.setItem(key, json);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
