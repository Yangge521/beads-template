/**
 * useClickOutside：点击元素外部时触发回调。
 *
 * 收敛项目中 4+ 处重复的 useEffect + pointerdown/mousedown + keydown(ESC) 逻辑：
 *   - HomePage 分类菜单
 *   - Navbar 用户菜单
 *   - AIGeneratePage 历史面板
 *   - DetailPage 导出下拉
 *
 * 用法：
 *   const ref = useRef<HTMLDivElement>(null);
 *   useClickOutside(ref, () => setOpen(false));
 *   // 或带 ESC 关闭：useClickOutside(ref, close, { escape: true })
 *
 * @param ref 目标元素 ref
 * @param onClickOutside 外部点击时的回调
 * @param options.escape 是否监听 ESC 键关闭（默认 true）
 * @param options.enabled 是否启用监听（false 时不注册，默认 true，用于条件控制）
 * @param options.events 监听的事件名数组，默认 ['pointerdown']
 */
import { useEffect, type RefObject } from 'react';

interface UseClickOutsideOptions {
  escape?: boolean;
  enabled?: boolean;
  events?: string[];
}

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClickOutside: () => void,
  options: UseClickOutsideOptions = {}
): void {
  const { escape = true, enabled = true, events = ['pointerdown'] } = options;

  useEffect(() => {
    if (!enabled) return;

    const onPointer = (e: Event) => {
      const el = ref.current;
      if (!el) return;
      const target = e.target as Node;
      // 点击在元素内则不处理
      if (el.contains(target)) return;
      // 点击在模态弹窗内也不处理（让弹窗自己处理）
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (dialog && dialog.contains(target)) return;
      onClickOutside();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 让弹窗优先处理 ESC
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        e.stopPropagation();
        onClickOutside();
      }
    };

    for (const ev of events) {
      document.addEventListener(ev, onPointer);
    }
    if (escape) {
      document.addEventListener('keydown', onKey, true);
    }
    return () => {
      for (const ev of events) {
        document.removeEventListener(ev, onPointer);
      }
      if (escape) {
        document.removeEventListener('keydown', onKey, true);
      }
    };
  }, [ref, onClickOutside, escape, enabled, events]);
}
