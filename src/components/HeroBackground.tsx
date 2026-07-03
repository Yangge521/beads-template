import { useMemo } from 'react';

interface HeroBackgroundProps {
  variant?: 'blobs' | 'particles';
}

interface Particle {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

const PALETTE = ['#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

/**
 * Hero 区动态背景：彩色光晕浮动 + 漂浮粒子。
 * 纯装饰，已加 aria-hidden。
 */
export default function HeroBackground({ variant = 'blobs' }: HeroBackgroundProps) {
  const particles = useMemo<Particle[]>(() => {
    const count = variant === 'particles' ? 18 : 12;
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 8,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    }));
  }, [variant]);

  return (
    <div className="hero-bg" aria-hidden="true">
      <div className="hero-bg__blob hero-bg__blob--1" />
      <div className="hero-bg__blob hero-bg__blob--2" />
      <div className="hero-bg__blob hero-bg__blob--3" />
      {particles.map((p, i) => (
        <span
          key={i}
          className="hero-bg__particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
