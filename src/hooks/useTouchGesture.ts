import { useState, useCallback, useRef } from 'react';

/**
 * 触摸手势 hook：支持双指缩放和单指平移
 * 适用于移动端大网格浏览场景
 *
 * 交互逻辑：
 * - 默认缩放（scale === 1 且未外部放大）：单指滑动让页面正常滚动，不捕获手势
 * - 放大状态（scale > 1 或外部 zoom > 1）：单指滑动平移查看 PixelGrid
 * - 双击：在默认缩放与 2x 之间切换
 * - 双指捏合：缩放
 *
 * @param enabled 是否启用手势
 * @param panEnabled 是否允许单指平移（如外部 zoom > 1 时应传入 true）
 */

interface TouchState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const DOUBLE_TAP_THRESHOLD = 300;

export function useTouchGesture(enabled: boolean = true, panEnabled: boolean = false) {
  const [state, setState] = useState<TouchState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const lastTouchDist = useRef(0);
  const lastTouchCenter = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);
  const isPinching = useRef(false);
  // 跟踪当前 scale，用于判断是否启用单指平移
  const scaleRef = useRef(1);

  const reset = useCallback(() => {
    setState({ scale: 1, offsetX: 0, offsetY: 0 });
    scaleRef.current = 1;
  }, []);

  const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    if (e.touches.length === 2) {
      // 双指缩放开始
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      isPinching.current = true;
    } else if (e.touches.length === 1) {
      // 记录起始位置，用于后续平移计算
      lastTouchCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      // 检测双击
      const now = Date.now();
      if (now - lastTapTime.current < DOUBLE_TAP_THRESHOLD) {
        // 双击：在默认缩放与 2x 之间切换
        const newScale = scaleRef.current > 1.5 ? 1 : 2;
        scaleRef.current = newScale;
        setState({ scale: newScale, offsetX: 0, offsetY: 0 });
      }
      lastTapTime.current = now;
    }
  }, [enabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDist.current > 0) {
        const scaleFactor = dist / lastTouchDist.current;
        setState(prev => {
          const newScale = clampScale(prev.scale * scaleFactor);
          scaleRef.current = newScale;
          return { ...prev, scale: newScale };
        });
      }
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && !isPinching.current) {
      // 只在放大状态下（touch 自身 scale > 1 或外部 panEnabled）才启用单指平移；
      // 默认缩放时让页面正常滚动，避免滑动时模板被移走“丢失”
      if (scaleRef.current <= 1 && !panEnabled) return;
      e.preventDefault();
      const touch = e.touches[0];
      setState(prev => ({
        ...prev,
        offsetX: prev.offsetX + (touch.clientX - lastTouchCenter.current.x) * 0.5,
        offsetY: prev.offsetY + (touch.clientY - lastTouchCenter.current.y) * 0.5,
      }));
      lastTouchCenter.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [enabled, panEnabled]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    if (e.touches.length < 2) {
      isPinching.current = false;
      lastTouchDist.current = 0;
    }
    if (e.touches.length === 0) {
      lastTouchCenter.current = { x: 0, y: 0 };
    }
  }, [enabled]);

  // 滚轮缩放（桌面端兼容）
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!enabled) return;
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setState(prev => {
        const newScale = clampScale(prev.scale * delta);
        scaleRef.current = newScale;
        return { ...prev, scale: newScale };
      });
    }
  }, [enabled]);

  return {
    scale: state.scale,
    offsetX: state.offsetX,
    offsetY: state.offsetY,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onWheel,
    reset,
  };
}
