/**
 * usePersistentState：localStorage 持久化 + 跨标签同步的底层 hook。
 *
 * 收敛 13 个 hook 中重复的 4 步逻辑：
 *   1. 初始加载（含 try/catch + 校验）
 *   2. useState 持有状态
 *   3. useStorageSync 跨标签同步
 *   4. 写入时 save 到 localStorage
 *
 * 业务方法（toggle/set/clear 等）仍由各 hook 自定义。
 *
 * @param key localStorage 键名（null 表示不持久化，仅内存）
 * @param loader 加载函数（含校验逻辑，失败应返回默认值）
 * @returns [state, setStateAndPersist]
 *   - state: 当前状态
 *   - setStateAndPersist: 更新状态并同步到 localStorage
 *     接受新值或 updater 函数；updater 接收 prev 返回 next
 */
import { useState, useCallback } from 'react';
import { useStorageSync } from './useStorageSync';

export type PersistentStateSetter<T> = (
  update: T | ((prev: T) => T)
) => void;

export function usePersistentState<T>(
  key: string | null,
  loader: () => T
): [T, PersistentStateSetter<T>] {
  const [state, setState] = useState<T>(loader);

  // 跨标签页同步：其他标签修改 storage 时重新加载
  useStorageSync(key, () => setState(loader()));

  const setStateAndPersist = useCallback(
    (update: T | ((prev: T) => T)) => {
      setState(prev => {
        const next = typeof update === 'function'
          ? (update as (p: T) => T)(prev)
          : update;
        if (key) {
          try {
            localStorage.setItem(key, JSON.stringify(next));
          } catch {
            // 忽略写入失败（隐私模式、配额超限）
          }
        }
        return next;
      });
    },
    [key]
  );

  return [state, setStateAndPersist];
}
