import { useEffect, useRef, useState, type ReactNode } from 'react';

interface PageTransitionProps {
  /** 切换时的唯一 key（通常是路由 hash） */
  pageKey: string;
  children: ReactNode;
}

/**
 * 页面切换淡入淡出包装。
 * 当 pageKey 变化时，先 fade-out 旧内容，再 fade-in 新内容。
 */
export default function PageTransition({ pageKey, children }: PageTransitionProps) {
  const [displayKey, setDisplayKey] = useState(pageKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (pageKey === displayKey) return;
    // 减少运动偏好时直接切换
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayKey(pageKey);
      setDisplayChildren(children);
      return;
    }
    setPhase('out');
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setDisplayKey(pageKey);
      setDisplayChildren(children);
      setPhase('in');
    }, 160);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  // 始终使用最新的 children（用于非切换时的正常更新）
  useEffect(() => {
    if (pageKey === displayKey) {
      setDisplayChildren(children);
    }
  }, [children, pageKey, displayKey]);

  return (
    <div className={`page-transition page-transition--${phase}`} key={displayKey}>
      {displayChildren}
    </div>
  );
}
