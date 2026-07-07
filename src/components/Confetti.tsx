import { useEffect, useState } from 'react';

interface ConfettiProps {
  /** 触发庆祝的唯一 key（变化时触发一次） */
  trigger: string | number | null;
  duration?: number;
}

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotate: number;
  drift: number;
}

const COLORS = ['#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#14b8a6', '#eab308'];

/**
 * 撒花庆祝动画组件。
 * 当 trigger 变化（且非 null）时播放一次。
 */
export default function Confetti({ trigger, duration = 3000 }: ConfettiProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === null || trigger === undefined) return;
    // 减少运动偏好时不播放
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const newPieces: Piece[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2000 + Math.random() * 1500,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      drift: -50 + Math.random() * 100,
    }));
    setPieces(newPieces);
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
      setPieces([]);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [trigger, duration]);

  if (!visible) return null;

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti__piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}ms`,
            '--confetti-rotate': `${p.rotate}deg`,
            '--confetti-drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
