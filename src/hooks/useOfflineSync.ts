/**
 * 离线编辑与后台同步 hook
 *
 * - 监听网络状态（online/offline）
 * - 离线时通过 SW 的 IndexedDB 保存数据
 * - 恢复网络后接收 SW 的 APPLY_OFFLINE_CHANGES 消息并写入 localStorage
 * - 提供离线状态指示
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ToastContainer';
import { useTranslation } from '../context/LanguageContext';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);
  const { showToast } = useToast();
  const { t } = useTranslation();

  // 监听网络状态
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      showToast(t('pwa.online'), 'success');
    };
    const onOffline = () => {
      setIsOnline(false);
      showToast(t('pwa.offline'), 'info');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [showToast, t]);

  // 监听 Service Worker 消息
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'APPLY_OFFLINE_CHANGES' && Array.isArray(data.changes)) {
        // 应用离线变更到 localStorage
        for (const change of data.changes) {
          if (change.key && change.value !== undefined) {
            try {
              localStorage.setItem(change.key, change.value);
            } catch {
              // 忽略写入错误
            }
          }
        }
        // 触发 storage 事件以同步其他标签页
        window.dispatchEvent(new StorageEvent('storage', { key: null }));
        setPendingChanges(0);
        showToast(t('pwa.synced'), 'success');
      }
      if (data.type === 'SYNC_REQUEST') {
        // SW 不支持后台同步时的即时同步请求
        showToast(t('pwa.syncing'), 'info');
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [showToast, t]);

  /**
   * 发送离线保存到 Service Worker
   * 离线时数据写入 IndexedDB，恢复网络后同步
   */
  const offlineSave = useCallback((key: string, value: string) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      // 无 SW 控制器时直接写 localStorage
      try { localStorage.setItem(key, value); } catch { /* ignore */ }
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: 'OFFLINE_SAVE',
      key,
      value,
    });
    setPendingChanges(prev => prev + 1);
  }, []);

  return {
    isOnline,
    pendingChanges,
    offlineSave,
  };
}
