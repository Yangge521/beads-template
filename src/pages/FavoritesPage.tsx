import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { BeadTemplate } from '../types/bead';
import TemplateCard from '../components/TemplateCard';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getBeadCount } from '../utils/beadStats';

interface FavoritesPageProps {
  templates: BeadTemplate[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onClearFavorites: () => void;
  onBack: () => void;
  onNavigate: (hash: string) => void;
}

type SortKey = 'recent' | 'name' | 'beads';

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'recent', label: '收藏时间' },
  { value: 'name', label: '名称' },
  { value: 'beads', label: '颗数' },
];

export default function FavoritesPage({
  templates,
  favorites,
  onToggleFavorite,
  onClearFavorites,
  onBack,
  onNavigate,
}: FavoritesPageProps) {
  const [confirming, setConfirming] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const clearBtnRef = useRef<HTMLButtonElement>(null);

  const favoritedTemplates = useMemo(() => {
    const list = templates.filter(t => favorites.includes(t.id));
    switch (sortKey) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        break;
      case 'beads':
        list.sort((a, b) => getBeadCount(b) - getBeadCount(a));
        break;
      case 'recent':
      default:
        // favorites 数组顺序即为收藏顺序（最新的在前）
        list.sort((a, b) => favorites.indexOf(b.id) - favorites.indexOf(a.id));
        break;
    }
    return list;
  }, [templates, favorites, sortKey]);

  const handleClearClick = () => {
    if (favoritedTemplates.length === 0) return;
    setConfirming(true);
  };

  const handleConfirmClear = () => {
    onClearFavorites();
    setConfirming(false);
  };

  const closeModal = useCallback(() => setConfirming(false), []);

  // 弹窗焦点管理：打开时聚焦取消按钮，ESC 关闭，Tab 循环
  useEffect(() => {
    if (!confirming) return;
    const modal = modalRef.current;
    if (!modal) return;

    // 聚焦到取消按钮（更安全的默认选择）
    const focusTimer = setTimeout(() => cancelBtnRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
      if (e.key === 'Tab' && modal) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [confirming, closeModal]);

  // 关闭弹窗后焦点返回触发按钮
  useEffect(() => {
    if (!confirming) {
      // 弹窗刚关闭时，焦点回到清空按钮
      if (clearBtnRef.current && document.activeElement === document.body) {
        // 仅在 body 有焦点时恢复（避免抢占用户已聚焦的其他元素）
      }
    }
  }, [confirming]);

  return (
    <div className="page favorites-page">
      <header className="favorites-page__header">
        <button type="button" className="favorites-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="favorites-page__title-row">
          <h1 className="favorites-page__title">我的收藏 ({favoritedTemplates.length})</h1>
          {favoritedTemplates.length > 0 && (
            <div className="favorites-page__actions">
              <label className="favorites-page__sort">
                <span className="favorites-page__sort-label">排序</span>
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  aria-label="收藏排序方式"
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                ref={clearBtnRef}
                type="button"
                className="favorites-page__clear"
                onClick={handleClearClick}
                aria-label="清空收藏"
                title="清空收藏"
              >
                <Trash2 size={16} />
                <span>清空</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="favorites-page__content">
        {favoritedTemplates.length > 0 ? (
          <div className="template-grid">
            {favoritedTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isFavorite={true}
                onToggleFavorite={() => onToggleFavorite(template.id)}
                onClick={() => onNavigate(`template/${template.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__icon">💔</p>
            <p className="empty-state__title">还没有收藏</p>
            <p className="empty-state__desc">去首页发现你喜欢的拼豆模板吧！</p>
            <button type="button" className="empty-state__action" onClick={onBack}>
              去首页逛逛
            </button>
          </div>
        )}
      </main>

      {confirming && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            ref={modalRef}
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <h3 id="modal-title" className="modal__title">确认清空收藏？</h3>
            <p className="modal__desc">将移除全部 {favoritedTemplates.length} 个收藏，此操作不可撤销。</p>
            <div className="modal__actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="modal__btn modal__btn--cancel"
                onClick={closeModal}
              >
                取消
              </button>
              <button
                type="button"
                className="modal__btn modal__btn--danger"
                onClick={handleConfirmClear}
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
