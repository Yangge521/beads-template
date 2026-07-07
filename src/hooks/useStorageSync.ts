import { useEffect } from 'react';

/**
 * 跨标签页 localStorage 同步监听。
 *
 * 当指定 key 的 localStorage 在其他标签页被修改时，触发回调。
 * - 同一 key 仅注册一个 storage 监听器，避免多个 hook 各自监听造成重复回调
 * - 兼容自定义 StorageEvent（同标签页内通过 dispatchEvent 触发的同步通知）
 *
 * @param key 监听的 localStorage key（null 表示监听任意 key 变化）
 * @param onChange storage 事件触发时的回调（通常重新从 localStorage 读取并 setState）
 */
export function useStorageSync(
  key: string | null,
  onChange: (event: StorageEvent) => void
): void {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // key === null 表示监听所有 key 的变化（用于通用同步刷新）
      if (key === null || e.key === key) {
        onChange(e);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, onChange]);
}
