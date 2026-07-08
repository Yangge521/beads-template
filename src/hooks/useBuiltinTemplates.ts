/**
 * 内置模板懒加载 hook（渐进式加载策略）
 *
 * 用 import.meta.glob 让 Vite 把每个 JSON 文件拆成独立 chunk。
 *
 * 加载策略（渐进式）：
 * 1. 首屏优先加载首页常用分类（anime/pokemon/celebrity/food），立即可见
 * 2. 其余分类在浏览器空闲时（requestIdleCallback）后台加载
 * 3. 所有分类加载完成后合并为完整列表
 * 4. 组件卸载时通过 cancelled 标志丢弃过时结果
 *
 * 这样既保证首屏速度，又保持 API 兼容（调用方拿到的 templates 会逐步增长）。
 */
import { useEffect, useState, useRef } from 'react';
import type { BeadTemplate } from '../types/bead';

// Vite 在构建时把 src/data/*.json 每个文件拆成独立动态 import chunk
const loaders = import.meta.glob<{ default: BeadTemplate[] }>('../data/*.json');

// 首屏优先加载的分类（首页热门分类），其余空闲时加载
const PRIORITY_CATEGORIES = ['anime', 'pokemon', 'celebrity', 'food', 'animals'];

export interface UseBuiltinTemplatesResult {
  templates: BeadTemplate[];
  loading: boolean;
}

export function useBuiltinTemplates(): UseBuiltinTemplatesResult {
  const [templates, setTemplates] = useState<BeadTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadCategory = async (category: string, loader: () => Promise<{ default: BeadTemplate[] }>) => {
      if (cancelled || loadedRef.current.has(category)) return;
      try {
        const mod = await loader();
        if (cancelled) return;
        const list = mod.default;
        if (Array.isArray(list)) {
          loadedRef.current.add(category);
          setTemplates(prev => [...prev, ...list]);
        }
      } catch {
        // 单个分类加载失败不阻塞其他分类
      }
    };

    const entries = Object.entries(loaders);

    // 分类文件名提取：../data/anime.json -> anime
    const getCategoryName = (path: string): string => {
      const match = path.match(/\/([^/]+)\.json$/);
      return match ? match[1] : path;
    };

    // 分为优先组和延迟组
    const priority: Array<[string, () => Promise<{ default: BeadTemplate[] }>]> = [];
    const deferred: Array<[string, () => Promise<{ default: BeadTemplate[] }>]> = [];

    for (const [path, loader] of entries) {
      const cat = getCategoryName(path);
      if (PRIORITY_CATEGORIES.includes(cat)) {
        priority.push([cat, loader]);
      } else {
        deferred.push([cat, loader]);
      }
    }

    // 第 1 阶段：并发加载优先分类
    Promise.all(priority.map(([cat, loader]) => loadCategory(cat, loader)))
      .then(() => {
        if (cancelled) return;
        // 优先分类加载完成，标记 loading=false（首屏已有内容）
        setLoading(false);

        // 第 2 阶段：浏览器空闲时加载其余分类
        const loadDeferred = () => {
          if (cancelled) return;
          Promise.all(deferred.map(([cat, loader]) => loadCategory(cat, loader)))
            .catch(() => { /* 忽略 */ });
        };

        // 使用 requestIdleCallback 在空闲时加载，不支持时用 setTimeout 兜底
        const ric = (window as unknown as { requestIdleCallback?: typeof window.requestIdleCallback }).requestIdleCallback;
        if (typeof ric === 'function') {
          ric(loadDeferred, { timeout: 3000 });
        } else {
          setTimeout(loadDeferred, 200);
        }
      })
      .catch(() => {
        // 优先分类加载失败也标记完成，降级为空模板
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { templates, loading };
}
