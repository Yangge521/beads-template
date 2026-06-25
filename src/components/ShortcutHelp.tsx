import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface Shortcut {
  keys: string[];
  desc: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['/'], desc: '聚焦搜索框' },
  { keys: ['Esc'], desc: '返回首页 / 关闭弹窗' },
  { keys: ['←', '→'], desc: '上一个 / 下一个模板（详情页）' },
  { keys: ['?'], desc: '显示 / 隐藏快捷键帮助' },
];

export default function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

      if (e.key === '?' && !inField) {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === 'Escape' && open) {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        ref={modalRef}
        className="modal shortcut-help"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
      >
        <div className="shortcut-help__header">
          <h3 id="shortcut-help-title" className="modal__title">键盘快捷键</h3>
          <button type="button" className="shortcut-help__close" onClick={close} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <ul className="shortcut-help__list">
          {shortcuts.map((s, i) => (
            <li key={i} className="shortcut-help__item">
              <span className="shortcut-help__desc">{s.desc}</span>
              <span className="shortcut-help__keys">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="shortcut-help__kbd">{k}</kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
