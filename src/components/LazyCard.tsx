import { useRef, useState, useEffect, type ReactNode } from 'react';

interface LazyCardProps {
  children: ReactNode;
  /** 预估高度，用于占位（px） */
  placeholderHeight?: number;
  /** 根元素类名 */
  className?: string;
}

/**
 * 列表项懒挂载包装：仅在进入视口附近时渲染 children。
 * - 用 IntersectionObserver 监听占位元素
 * - 一旦可见就标记为已可见，永久渲染（避免反复挂载开销）
 * - 视口外保持占位，节省 PixelGrid 等重子树渲染成本
 */
export default function LazyCard({ children, placeholderHeight = 240, className }: LazyCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    // 不支持 IO 时直接显示
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      // 提前 400px 触发，避免滚动时出现空白
      { rootMargin: '400px 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={className}
      style={!visible ? { minHeight: `${placeholderHeight}px` } : undefined}
    >
      {visible ? children : null}
    </div>
  );
}
