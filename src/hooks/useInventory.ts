import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'beads-inventory';

/** 库存颜色项：hex + 可选备注（如品牌色号）+ 可选数量 */
export interface InventoryItem {
  hex: string;
  note?: string;
  /** 拥有的数量（颗数）。undefined 表示未录入数量 */
  count?: number;
}

/** 加载库存数据 */
function loadInventory(): InventoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((x: unknown): x is InventoryItem =>
            !!x && typeof x === 'object' && typeof (x as InventoryItem).hex === 'string'
          )
          .map(x => ({
            hex: (x.hex as string).toLowerCase(),
            note: typeof x.note === 'string' ? x.note : undefined,
            count: typeof x.count === 'number' && x.count >= 0 ? x.count : undefined,
          }));
      }
    }
  } catch {}
  return [];
}

function saveInventory(items: InventoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

/**
 * 颜色库存管理 hook。
 * 用户录入"我有的颜色"，用于颜色替换/缺色检测。
 * localStorage 持久化 + 跨标签页 storage 事件同步。
 */
export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>(loadInventory);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setInventory(loadInventory());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** 添加颜色到库存（hex 去重，大小写不敏感） */
  const addColor = useCallback((hex: string, note?: string) => {
    const normalized = hex.trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return;
    setInventory(prev => {
      if (prev.some(x => x.hex === normalized)) return prev;
      const next = [...prev, { hex: normalized, note: note?.trim() || undefined }];
      saveInventory(next);
      return next;
    });
  }, []);

  /** 移除库存颜色 */
  const removeColor = useCallback((hex: string) => {
    const normalized = hex.toLowerCase();
    setInventory(prev => {
      const next = prev.filter(x => x.hex !== normalized);
      saveInventory(next);
      return next;
    });
  }, []);

  /** 清空库存 */
  const clearInventory = useCallback(() => {
    setInventory(prev => {
      if (prev.length === 0) return prev;
      saveInventory([]);
      return [];
    });
  }, []);

  /** 设置某颜色的库存数量（传入 undefined 或负数则清除数量） */
  const setCount = useCallback((hex: string, count: number | undefined) => {
    const normalized = hex.toLowerCase();
    setInventory(prev => {
      const next = prev.map(item =>
        item.hex === normalized
          ? { ...item, count: typeof count === 'number' && count >= 0 ? count : undefined }
          : item
      );
      saveInventory(next);
      return next;
    });
  }, []);

  /** 检查某颜色是否在库存中（大小写不敏感） */
  const hasColor = useCallback((hex: string) => {
    const normalized = hex.toLowerCase();
    return inventory.some(x => x.hex === normalized);
  }, [inventory]);

  /** 获取库存所有 hex 数组（便于传给 findClosestColor） */
  const inventoryHexes = useCallback(() => inventory.map(x => x.hex), [inventory]);

  return {
    inventory,
    addColor,
    removeColor,
    clearInventory,
    hasColor,
    inventoryHexes,
    setCount,
  };
}
