/**
 * ARPreview：拼豆成品 AR 预览组件（MVP 版本）。
 *
 * 不引入 three.js，使用 CSS 3D transform 模拟一个可拖拽旋转的立方体，
 * 直观展示拼豆成品的实际尺寸（宽 × 高 × 厚）。
 *
 * 依赖：
 *   - lucide-react（已安装）：X / Camera / RotateCcw / Box 图标
 *   - html2canvas（可选）：若运行时可用则显示“拍照保存”按钮，否则隐藏
 *
 * 注：当前为硬编码中文，后续接入 i18n 时再替换。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Box, Camera, RotateCcw, X } from 'lucide-react';

interface ARPreviewProps {
  /** 成品实际宽度（cm） */
  width: number;
  /** 成品实际高度（cm） */
  height: number;
  /** 使用的颜色列表，count 为该色出现次数（用于推断主色调） */
  colors: Array<{ hex: string; count?: number }>;
  /** 关闭回调 */
  onClose: () => void;
}

/** 1cm 对应的像素数 */
const PX_PER_CM = 20;
/** 立方体任意边的最大像素值，避免成品过大溢出屏幕 */
const MAX_PX = 300;
/** 默认厚度（cm） */
const THICKNESS_CM = 0.5;

/** 将 hex 颜色按 factor 变暗（factor < 1 变暗），返回 #rrggbb */
function darken(hex: string, factor = 0.6): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map(c => c + c)
          .join('')
      : raw.padEnd(6, '0').slice(0, 6);
  const r = Math.round(parseInt(full.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(full.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(full.slice(4, 6), 16) * factor);
  return `#${[r, g, b]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export default function ARPreview({
  width,
  height,
  colors,
  onClose,
}: ARPreviewProps) {
  // 旋转角度（度）
  const [rotateX, setRotateX] = useState(-15);
  const [rotateY, setRotateY] = useState(-25);
  // 是否正在拖拽
  const [isDragging, setIsDragging] = useState(false);
  // html2canvas 是否可用（运行时探测）
  const [hasHtml2Canvas, setHasHtml2Canvas] = useState(false);

  // 拖拽起始信息：起始坐标 + 起始角度
  const dragStartRef = useRef<{
    x: number;
    y: number;
    rotateX: number;
    rotateY: number;
  } | null>(null);

  // 截图目标：包裹立方体的舞台容器
  const stageRef = useRef<HTMLDivElement>(null);

  // 浏览器是否支持 getUserMedia（不支持时显示提示）
  const cameraSupported = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function',
    []
  );

  // 主色调：出现次数最多的颜色，无则取第一个，再无则用默认灰
  const mainColor = useMemo(() => {
    if (!colors || colors.length === 0) return '#cccccc';
    return colors.reduce((best, cur) =>
      (cur.count ?? 0) > (best.count ?? 0) ? cur : best
    ).hex;
  }, [colors]);

  // 立方体三轴像素尺寸（按 1cm=20px 等比缩放，最大边不超过 300px）
  const { W, H, D } = useMemo(() => {
    const rawW = Math.max(width, 0) * PX_PER_CM;
    const rawH = Math.max(height, 0) * PX_PER_CM;
    const rawD = THICKNESS_CM * PX_PER_CM;
    const maxRaw = Math.max(rawW, rawH, rawD, 1);
    const scale = maxRaw > MAX_PX ? MAX_PX / maxRaw : 1;
    return {
      W: rawW * scale,
      H: rawH * scale,
      D: rawD * scale,
    };
  }, [width, height]);

  const sideColor = useMemo(() => darken(mainColor, 0.6), [mainColor]);
  const sideColorDeep = useMemo(() => darken(mainColor, 0.4), [mainColor]);

  // 运行时探测 html2canvas：优先用 window 上已挂载的实例，
  // 否则尝试动态加载（包未安装时静默失败，按钮保持隐藏）
  useEffect(() => {
    let active = true;
    const w = window as unknown as { html2canvas?: unknown };
    if (typeof w.html2canvas === 'function') {
      setHasHtml2Canvas(true);
      return;
    }
    const name = 'html2canvas';
    import(/* @vite-ignore */ name)
      .then(mod => {
        const fn = (mod as { default?: unknown })?.default ?? mod;
        if (active && typeof fn === 'function') setHasHtml2Canvas(true);
      })
      .catch(() => {
        /* 包未安装，保持按钮隐藏 */
      });
    return () => {
      active = false;
    };
  }, []);

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 拖拽中监听全局 move/up，确保鼠标移出立方体也能继续旋转
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (clientX: number, clientY: number) => {
      const start = dragStartRef.current;
      if (!start) return;
      // 灵敏度：每移动 1px 旋转 0.5 度
      const dx = clientX - start.x;
      const dy = clientY - start.y;
      setRotateY(start.rotateY + dx * 0.5);
      setRotateX(start.rotateX - dy * 0.5);
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => {
      dragStartRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const beginDrag = useCallback(
    (clientX: number, clientY: number) => {
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        rotateX,
        rotateY,
      };
      setIsDragging(true);
    },
    [rotateX, rotateY]
  );

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      beginDrag(e.clientX, e.clientY);
    },
    [beginDrag]
  );

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (e.touches[0]) beginDrag(e.touches[0].clientX, e.touches[0].clientY);
    },
    [beginDrag]
  );

  const handleReset = useCallback(() => {
    setRotateX(-15);
    setRotateY(-25);
  }, []);

  // 拍照保存：动态获取 html2canvas，对舞台截图并下载 PNG
  const handleCapture = useCallback(async () => {
    const target = stageRef.current;
    if (!target) return;
    const w = window as unknown as {
      html2canvas?: (
        el: HTMLElement,
        opts?: Record<string, unknown>
      ) => Promise<HTMLCanvasElement>;
    };
    let html2canvas = w.html2canvas;
    if (typeof html2canvas !== 'function') {
      try {
        const name = 'html2canvas';
        const mod = await import(/* @vite-ignore */ name);
        const fn = (mod as { default?: typeof html2canvas }).default ?? mod;
        if (typeof fn === 'function') html2canvas = fn;
      } catch {
        /* 忽略 */
      }
    }
    if (typeof html2canvas !== 'function') return;
    const canvas = await html2canvas(target, {
      backgroundColor: null,
      scale: 2,
    });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar-preview-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // 6 个面的样式（顶面用主色调，其余用稍暗版本）
  const faces = useMemo(() => {
    const halfW = W / 2;
    const halfH = H / 2;
    const halfD = D / 2;
    const base: CSSProperties = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      boxSizing: 'border-box',
      border: '1px solid rgba(0,0,0,0.25)',
    };
    return [
      // 前
      {
        key: 'front',
        style: {
          ...base,
          width: W,
          height: H,
          marginLeft: -halfW,
          marginTop: -halfH,
          background: sideColor,
          transform: `translateZ(${halfD}px)`,
        },
      },
      // 后
      {
        key: 'back',
        style: {
          ...base,
          width: W,
          height: H,
          marginLeft: -halfW,
          marginTop: -halfH,
          background: sideColorDeep,
          transform: `rotateY(180deg) translateZ(${halfD}px)`,
        },
      },
      // 右
      {
        key: 'right',
        style: {
          ...base,
          width: D,
          height: H,
          marginLeft: -halfD,
          marginTop: -halfH,
          background: sideColorDeep,
          transform: `rotateY(90deg) translateZ(${halfW}px)`,
        },
      },
      // 左
      {
        key: 'left',
        style: {
          ...base,
          width: D,
          height: H,
          marginLeft: -halfD,
          marginTop: -halfH,
          background: sideColorDeep,
          transform: `rotateY(-90deg) translateZ(${halfW}px)`,
        },
      },
      // 顶（主色调）
      {
        key: 'top',
        style: {
          ...base,
          width: W,
          height: D,
          marginLeft: -halfW,
          marginTop: -halfD,
          background: mainColor,
          transform: `rotateX(90deg) translateZ(${halfH}px)`,
        },
      },
      // 底
      {
        key: 'bottom',
        style: {
          ...base,
          width: W,
          height: D,
          marginLeft: -halfW,
          marginTop: -halfD,
          background: sideColorDeep,
          transform: `rotateX(-90deg) translateZ(${halfH}px)`,
        },
      },
    ];
  }, [W, H, D, mainColor, sideColor, sideColorDeep]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at 50% 40%, #1f2937 0%, #0b1220 70%)',
        color: '#fff',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="AR 成品预览"
    >
      {/* 顶部信息栏 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Box size={24} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            AR 成品预览 <span aria-hidden="true">📦</span>
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              opacity: 0.75,
            }}
          >
            实际尺寸：{width} × {height} × {THICKNESS_CM} cm
            <span aria-hidden="true"> · </span>
            主色调：
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                marginLeft: 4,
                marginRight: 4,
                background: mainColor,
                border: '1px solid rgba(255,255,255,0.4)',
                verticalAlign: 'middle',
                borderRadius: 2,
              }}
            />
            {mainColor}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      {/* 摄像头不支持提示 */}
      {!cameraSupported && (
        <div
          role="status"
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 8,
            fontSize: 13,
            color: '#fcd34d',
          }}
        >
          AR 预览需要摄像头权限
        </div>
      )}

      {/* 中央 3D 舞台 */}
      <div
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '900px',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: W,
            height: H,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {faces.map(face => (
            <div key={face.key} style={face.style} />
          ))}
        </div>
      </div>

      {/* 操作提示 */}
      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          opacity: 0.55,
          margin: '0 0 8px',
        }}
      >
        拖拽旋转查看 · ESC 关闭
      </p>

      {/* 底部按钮区 */}
      <footer
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          padding: '16px 20px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: '10px 18px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
          }}
        >
          <RotateCcw size={18} aria-hidden="true" />
          重置视角
        </button>

        {hasHtml2Canvas && (
          <button
            type="button"
            onClick={handleCapture}
            style={{
              minWidth: 44,
              minHeight: 44,
              padding: '10px 18px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}
          >
            <Camera size={18} aria-hidden="true" />
            拍照保存
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: '10px 22px',
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          关闭
        </button>
      </footer>
    </div>,
    document.body
  );
}
