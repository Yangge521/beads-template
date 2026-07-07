/**
 * Dropdown：通用下拉菜单组件。
 *
 * 收敛项目中重复的下拉点击外部关闭逻辑。
 *
 * 用法：
 *   <Dropdown
 *     trigger={(props) => <button type="button" {...props}>打开</button>}
 *     items={[
 *       { label: '导出 PNG', onClick: () => exportPNG(tpl) },
 *       { divider: true },
 *       { label: '导出 SVG', onClick: () => exportSVG(tpl) },
 *     ]}
 *   />
 *
 * 或用于更灵活场景，直接用 useClickOutside hook 自行控制。
 */
import { useState, useRef, useCallback, type ReactNode } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

export interface DropdownItem {
  /** 菜单项文本或 ReactNode */
  label: ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 图标（放在 label 前） */
  icon?: ReactNode;
  /** 分隔符 */
  divider?: boolean;
}

interface DropdownProps {
  /** 触发器渲染函数，props 含 ref 和 onClick */
  trigger: (props: {
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
  }) => ReactNode;
  /** 菜单项 */
  items: DropdownItem[];
  /** 打开时对齐方式，默认 'end'（右对齐） */
  align?: 'start' | 'end';
  /** 菜单类名 */
  menuClassName?: string;
  /** 打开后是否在 trigger 下方，默认 true；为 false 时对齐到 trigger 顶部 */
  dropUp?: boolean;
}

export default function Dropdown({
  trigger,
  items,
  align = 'end',
  menuClassName = '',
  dropUp = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useClickOutside(ref, () => setOpen(false), { enabled: open });

  const handleTriggerClick = useCallback(() => {
    setOpen(o => !o);
  }, []);

  const handleItemClick = useCallback((item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    setOpen(false);
  }, []);

  return (
    <div ref={ref} className={`dropdown ${open ? 'dropdown--open' : ''}`}>
      {trigger({
        ref: triggerRef,
        onClick: handleTriggerClick,
        'aria-expanded': open,
        'aria-haspopup': 'menu',
      })}
      {open && (
        <ul
          className={`dropdown__menu dropdown__menu--${align} ${dropUp ? 'dropdown__menu--up' : ''} ${menuClassName}`}
          role="menu"
        >
          {items.map((item, idx) =>
            item.divider ? (
              <li key={`divider-${idx}`} className="dropdown__divider" role="separator" aria-hidden="true" />
            ) : (
              <li key={item.label?.toString() ?? `item-${idx}`} role="menuitem">
                <button
                  type="button"
                  className="dropdown__item"
                  disabled={item.disabled}
                  onClick={() => handleItemClick(item)}
                >
                  {item.icon && <span className="dropdown__item-icon" aria-hidden="true">{item.icon}</span>}
                  <span className="dropdown__item-label">{item.label}</span>
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
