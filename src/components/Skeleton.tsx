import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  circle?: boolean;
  count?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * 通用骨架屏占位组件
 */
export default function Skeleton({
  width = '100%',
  height = 16,
  radius = 6,
  circle = false,
  count = 1,
  className = '',
  style,
}: SkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <>
      {items.map((_, i) => (
        <span
          key={i}
          className={`skeleton ${className}`}
          style={{
            width,
            height,
            borderRadius: circle ? '50%' : radius,
            ...style,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

/**
 * 模板卡片骨架屏
 */
export function TemplateCardSkeleton() {
  return (
    <div className="template-card-skeleton" aria-hidden="true">
      <Skeleton height={120} radius={8} className="template-card-skeleton__thumb" />
      <Skeleton height={14} width="70%" className="template-card-skeleton__name" />
      <Skeleton height={11} width="40%" />
      <div className="template-card-skeleton__meta">
        <Skeleton height={10} width="30%" />
        <Skeleton height={10} width="30%" />
      </div>
    </div>
  );
}

/**
 * 模板列表骨架屏
 */
export function TemplateListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="home-page__list">
      {Array.from({ length: count }).map((_, i) => (
        <TemplateCardSkeleton key={i} />
      ))}
    </div>
  );
}
