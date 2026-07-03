import { useCallback } from 'react';

/**
 * 按钮波纹效果 hook
 * 在按钮 onMouseDown 时调用，会在按钮上添加一个临时波纹 span。
 */
export function useRipple() {
  return useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    // 仅对鼠标左键生效
    if (e.button !== 0) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // 防止装饰元素被读屏
    ripple.setAttribute('aria-hidden', 'true');
    target.appendChild(ripple);

    // 动画结束后移除
    const remove = () => {
      ripple.remove();
      target.removeEventListener('pointerup', remove);
      target.removeEventListener('pointerleave', remove);
    };
    target.addEventListener('pointerup', remove);
    target.addEventListener('pointerleave', remove);
    // 兜底移除
    window.setTimeout(() => ripple.remove(), 700);
  }, []);
}
