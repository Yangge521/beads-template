/**
 * 用户数据导出/导入 —— 纯前端项目的"多设备同步"方案。
 * 用户在一台设备导出 JSON 文件，在另一台设备导入即可同步。
 * 涵盖：收藏、最近浏览、自定义模板、主题。
 */

import type { BeadTemplate, FavoriteEntry } from '../types/bead';

const FAVORITES_KEY = 'beads-favorites';
const RECENT_KEY = 'beads-recently-viewed';
const THEME_KEY = 'beads-theme';
const CUSTOM_KEY = 'beads-custom-templates';
const LIKES_KEY = 'beads-likes';

export interface ExportPayload {
  __type: 'beads-template-backup';
  __version: 1;
  __exportedAt: string;
  favorites: FavoriteEntry[];
  recentlyViewed: string[];
  customTemplates: BeadTemplate[];
  likes: string[];
  theme: string | null;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

/** 收集所有用户数据为可导出对象 */
export function exportUserData(): ExportPayload {
  return {
    __type: 'beads-template-backup',
    __version: 1,
    __exportedAt: new Date().toISOString(),
    favorites: readJson<FavoriteEntry[]>(FAVORITES_KEY, []),
    recentlyViewed: readJson<string[]>(RECENT_KEY, []),
    customTemplates: readJson<BeadTemplate[]>(CUSTOM_KEY, []),
    likes: readJson<string[]>(LIKES_KEY, []),
    theme: localStorage.getItem(THEME_KEY),
  };
}

/** 触发浏览器下载 JSON 备份文件 */
export function downloadBackupFile(): void {
  const payload = exportUserData();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `beads-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportResult {
  success: boolean;
  /** 结果消息的翻译键，由调用方用 t() 翻译 */
  messageKey: 'app.toast.importMerged' | 'app.toast.importReplaced' | 'app.toast.importFailed';
  counts: {
    favorites: number;
    recentlyViewed: number;
    customTemplates: number;
    likes: number;
  };
}

/** 校验单个模板的最小结构完整性（与 useCustomTemplates.loadCustomTemplates 一致） */
function isValidTemplate(t: unknown): t is BeadTemplate {
  return !!t
    && typeof t === 'object'
    && typeof (t as BeadTemplate).id === 'string'
    && Array.isArray((t as BeadTemplate).grid)
    && Array.isArray((t as BeadTemplate).colors);
}

/** 校验收藏项结构 */
function isValidFavoriteEntry(e: unknown): e is FavoriteEntry {
  return !!e && typeof e === 'object' && typeof (e as FavoriteEntry).templateId === 'string';
}

/** 解析并校验导入的 JSON 文本 */
export function parseBackupFile(text: string): ExportPayload | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    // 兼容：必须含 __type 标识或包含已知字段
    if (parsed.__type !== 'beads-template-backup' && !('favorites' in parsed)) return null;
    const rawFavorites = Array.isArray(parsed.favorites) ? parsed.favorites : [];
    const rawRecent = Array.isArray(parsed.recentlyViewed) ? parsed.recentlyViewed : [];
    const rawCustom = Array.isArray(parsed.customTemplates) ? parsed.customTemplates : [];
    const rawLikes = Array.isArray(parsed.likes) ? parsed.likes : [];
    return {
      __type: 'beads-template-backup',
      __version: parsed.__version || 1,
      __exportedAt: parsed.__exportedAt || new Date().toISOString(),
      favorites: rawFavorites.filter(isValidFavoriteEntry),
      recentlyViewed: rawRecent.filter((r: unknown): r is string => typeof r === 'string'),
      customTemplates: rawCustom.filter(isValidTemplate),
      likes: rawLikes.filter((l: unknown): l is string => typeof l === 'string'),
      theme: typeof parsed.theme === 'string' ? parsed.theme : null,
    };
  } catch {
    return null;
  }
}

/**
 * 合并导入数据到 localStorage。
 * 策略：自定义模板按 id 去重合并；收藏/最近浏览按 id 去重合并；主题直接覆盖。
 * 合并后派发 storage 事件让各 hook 重新读取（同标签页 storage 事件不会自动触发）。
 */
export function importUserData(payload: ExportPayload, mode: 'merge' | 'replace' = 'merge'): ImportResult {
  try {
    // 自定义模板
    if (mode === 'replace') {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(payload.customTemplates));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(payload.favorites));
      localStorage.setItem(RECENT_KEY, JSON.stringify(payload.recentlyViewed));
      localStorage.setItem(LIKES_KEY, JSON.stringify(payload.likes));
    } else {
      // 合并：去重
      const existingCustom = readJson<BeadTemplate[]>(CUSTOM_KEY, []);
      const customIds = new Set(existingCustom.map(t => t.id));
      const mergedCustom = [...existingCustom, ...payload.customTemplates.filter(t => !customIds.has(t.id))];
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(mergedCustom));

      const existingFav = readJson<FavoriteEntry[]>(FAVORITES_KEY, []);
      const favIds = new Set(existingFav.map(f => f.templateId));
      const mergedFav = [...existingFav, ...payload.favorites.filter(f => !favIds.has(f.templateId))];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(mergedFav));

      const existingRecent = readJson<string[]>(RECENT_KEY, []);
      const recentSet = new Set(existingRecent);
      const mergedRecent = [...existingRecent, ...payload.recentlyViewed.filter(r => !recentSet.has(r))];
      localStorage.setItem(RECENT_KEY, JSON.stringify(mergedRecent));

      const existingLikes = readJson<string[]>(LIKES_KEY, []);
      const likeSet = new Set(existingLikes);
      const mergedLikes = [...existingLikes, ...payload.likes.filter(l => !likeSet.has(l))];
      localStorage.setItem(LIKES_KEY, JSON.stringify(mergedLikes));
    }

    if (payload.theme) {
      localStorage.setItem(THEME_KEY, payload.theme);
    }

    // 手动派发 storage 事件，触发同标签页的 hook 同步
    [CUSTOM_KEY, FAVORITES_KEY, RECENT_KEY, LIKES_KEY, THEME_KEY].forEach(key => {
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: localStorage.getItem(key) }));
    });

    // 读取合并后的实际数量，确保 toast 文案准确
    const finalFav = readJson<FavoriteEntry[]>(FAVORITES_KEY, []);
    const finalRecent = readJson<string[]>(RECENT_KEY, []);
    const finalCustom = readJson<BeadTemplate[]>(CUSTOM_KEY, []);
    const finalLikes = readJson<string[]>(LIKES_KEY, []);

    return {
      success: true,
      messageKey: mode === 'replace' ? 'app.toast.importReplaced' : 'app.toast.importMerged',
      counts: {
        favorites: finalFav.length,
        recentlyViewed: finalRecent.length,
        customTemplates: finalCustom.length,
        likes: finalLikes.length,
      },
    };
  } catch {
    return {
      success: false,
      messageKey: 'app.toast.importFailed',
      counts: { favorites: 0, recentlyViewed: 0, customTemplates: 0, likes: 0 },
    };
  }
}
