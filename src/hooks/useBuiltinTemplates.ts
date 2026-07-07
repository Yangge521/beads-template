/**
 * 内置模板懒加载 hook：
 *
 * 用 import.meta.glob 让 Vite 把每个 JSON 文件拆成独立 chunk，
 * 首屏 JS 不再内联 900KB 模板数据。
 *
 * 加载策略：
 * - 并行 Promise.all 拉取所有分类（一次网络并发，总时长≈最慢一个）
 * - 加载期间 loading=true，调用方可显示骨架屏
 * - 加载完成一次性合并并 setState
 * - 组件卸载时通过 cancelled 标志丢弃过时结果
 */
import { useEffect, useState } from 'react';
import type { BeadTemplate } from '../types/bead';

// Vite 在构建时把 src/data/*.json 每个文件拆成独立动态 import chunk
const loaders = import.meta.glob<{ default: BeadTemplate[] }>('../data/*.json');

export interface UseBuiltinTemplatesResult {
  templates: BeadTemplate[];
  loading: boolean;
}

export function useBuiltinTemplates(): UseBuiltinTemplatesResult {
  const [templates, setTemplates] = useState<BeadTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(loaders);
    Promise.all(entries.map(([, loader]) => loader()))
      .then(modules => {
        if (cancelled) return;
        const all: BeadTemplate[] = [];
        for (const mod of modules) {
          const list = mod.default;
          if (Array.isArray(list)) all.push(...list);
        }
        setTemplates(all);
        setLoading(false);
      })
      .catch(() => {
        // 加载失败不阻塞应用：保留空模板列表，用户仍可访问自定义模板/上传等功能
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { templates, loading };
}
