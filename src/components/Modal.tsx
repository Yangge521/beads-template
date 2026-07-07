/**
 * Modal：通用模态弹窗组件。
 *
 * 收敛项目中 6+ 处重复实现的模态逻辑：
 *   - FavoritesPage 清空确认
 *   - ShortcutHelp 快捷键面板
 *   - StepGuidePanel 步骤引导
 *   - CommandPalette 命令面板
 *   - EditorHistoryPanel 历史面板
 *   - ShapeLibraryPanel 形状库
 *
 * 提供：
 *   - Portal 渲染到 document.body
 *   - focus trap（焦点限制在模态内）
 *   - ESC 关闭（按需，受 closeOnEscape 控制）
 *   - 点击遮罩关闭（受 closeOnOverlay 控制）
 *   - aria-modal + aria-labelledby 完整无障碍
 *   - 打开时记录上次焦点，关闭时恢复
 *   - body 滚动锁定
 */
import { useEffect, useRef, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调（点击遮罩或 ESC 时触发） */
  onClose: () => void;
  /** 标题（用于 aria-labelledby，对应 id = modal-title-<random>） */
  'aria-labelledby'?: string;
  /** 不点遮罩关闭（默认 false，即点遮罩可关闭） */
  closeOnOverlay?: boolean;
  /** 不按 ESC 关闭（默认 false，即 ESC 可关闭） */
  closeOnEscape?: boolean;
  /** 自定义遮罩类名 */
  overlayClassName?: string;
  /** 自定义内容类名 */
  className?: string;
  children: ReactNode;
}

export default function Modal({
  open,
  onClose,
  'aria-labelledby': labelledBy,
  closeOnOverlay = true,
  closeOnEscape = true,
  overlayClassName = '',
  className = '',
  children,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // 关闭时恢复焦点
  const handleClose = useCallback(() => {
    lastFocusedRef.current?.focus();
    onClose();
  }, [onClose]);

  // 打开时记录焦点 + 锁滚动；关闭时恢复
  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onKey = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
        return;
      }
      // Tab 焦点陷阱
      if (e.key === 'Tab') {
        const focusable = overlay.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey, true);
    // 初始聚焦到模态
    const focusable = overlay.querySelector<HTMLElement>('[autofocus], button:not([disabled])');
    if (focusable) focusable.focus();

    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, closeOnEscape, handleClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={`modal-overlay ${overlayClassName}`}
      onClick={e => {
        if (closeOnOverlay && e.target === e.currentTarget) handleClose();
      }}
      role="presentation"
    >
      <div
        className={`modal ${className}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
