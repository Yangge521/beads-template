import { useCallback, useRef, useState } from 'react';

interface TiltStyle {
  transform: string;
  transition: string;
}

/**
 * 3D 倾斜 hook：根据鼠标在元素上的位置计算 rotateX/rotateY。
 * 用于卡片/网格的交互式 3D 预览效果。
 */
export function useTilt(maxTilt = 8): {
  ref: React.RefObject<HTMLDivElement | null>;
  style: TiltStyle;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<TiltStyle>({
    transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform 0.2s ease-out',
  });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height; // 0..1
    const rotateY = (x - 0.5) * 2 * maxTilt;
    const rotateX = -(y - 0.5) * 2 * maxTilt;
    setStyle({
      transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
      transition: 'transform 0.05s ease-out',
    });
  }, [maxTilt]);

  const onMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 0.4s ease-out',
    });
  }, []);

  return { ref, style, onMouseMove, onMouseLeave };
}
