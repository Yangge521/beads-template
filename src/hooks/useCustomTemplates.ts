import { useState, useCallback } from 'react';
import { useStorageSync } from './useStorageSync';
import type { BeadTemplate } from '../types/bead';

const STORAGE_KEY = 'beads-custom-templates';

function loadCustomTemplates(): BeadTemplate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is BeadTemplate =>
        t && typeof t.id === 'string' && Array.isArray(t.grid) && Array.isArray(t.colors)
    );
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates: BeadTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch { /* 隐私模式忽略 */ }
}

/** 生成唯一 id（时间戳 + 随机串） */
function genId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useCustomTemplates() {
  const [templates, setTemplates] = useState<BeadTemplate[]>(loadCustomTemplates);

  // 跨标签页同步
  useStorageSync(STORAGE_KEY, () => setTemplates(loadCustomTemplates()));

  const addTemplate = useCallback((template: Omit<BeadTemplate, 'id'>): BeadTemplate => {
    const newTemplate: BeadTemplate = { ...template, id: genId() };
    setTemplates(prev => {
      const next = [newTemplate, ...prev];
      saveCustomTemplates(next);
      return next;
    });
    return newTemplate;
  }, []);

  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      saveCustomTemplates(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setTemplates([]);
    saveCustomTemplates([]);
  }, []);

  return { templates, addTemplate, removeTemplate, clearAll };
}
