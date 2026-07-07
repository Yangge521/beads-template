/**
 * 社区分享数据管理：保存分享过的模板、统计下载次数、跨标签页同步
 */

import { useState, useCallback } from 'react';
import { useStorageSync } from './useStorageSync';
import type { BeadTemplate } from '../types/bead';

const STORAGE_KEY = 'beads-shared-history';

export interface SharedRecord {
  code: string;
  template: BeadTemplate;
  sharedAt: number;
  downloads: number;
}

function load(): SharedRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function save(records: SharedRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  // 手动派发 storage 事件以触发同标签页 hook 同步
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

export function useSharedTemplates() {
  const [records, setRecords] = useState<SharedRecord[]>(() => load());

  useStorageSync(STORAGE_KEY, () => setRecords(load()));

  const addShared = useCallback((template: BeadTemplate, code: string) => {
    const list = load();
    const existing = list.find(r => r.code === code);
    if (existing) {
      // 已存在则更新时间
      existing.sharedAt = Date.now();
      save(list);
      setRecords(list);
      return existing;
    }
    const record: SharedRecord = {
      code,
      template,
      sharedAt: Date.now(),
      downloads: 0,
    };
    const next = [record, ...list].slice(0, 50);
    save(next);
    setRecords(next);
    return record;
  }, []);

  const incrementDownload = useCallback((code: string) => {
    const list = load();
    const r = list.find(x => x.code === code);
    if (r) {
      r.downloads += 1;
      save(list);
      setRecords(list);
    }
  }, []);

  const removeShared = useCallback((code: string) => {
    const list = load().filter(r => r.code !== code);
    save(list);
    setRecords(list);
  }, []);

  const clearShared = useCallback(() => {
    save([]);
    setRecords([]);
  }, []);

  return {
    records,
    addShared,
    incrementDownload,
    removeShared,
    clearShared,
  };
}
