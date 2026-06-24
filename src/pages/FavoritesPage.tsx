import { useState } from 'react';
import type { BeadTemplate } from '../types/bead';
import TemplateCard from '../components/TemplateCard';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface FavoritesPageProps {
  templates: BeadTemplate[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onClearFavorites: () => void;
  onBack: () => void;
  onNavigate: (hash: string) => void;
}

export default function FavoritesPage({
  templates,
  favorites,
  onToggleFavorite,
  onClearFavorites,
  onBack,
  onNavigate,
}: FavoritesPageProps) {
  const [confirming, setConfirming] = useState(false);
  const favoritedTemplates = templates.filter(t => favorites.includes(t.id));

  const handleClearClick = () => {
    if (favoritedTemplates.length === 0) return;
    setConfirming(true);
  };

  const handleConfirmClear = () => {
    onClearFavorites();
    setConfirming(false);
  };

  return (
    <div className="page favorites-page">
      <header className="favorites-page__header">
        <button className="favorites-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="favorites-page__title-row">
          <h1 className="favorites-page__title">我的收藏 ({favoritedTemplates.length})</h1>
          {favoritedTemplates.length > 0 && (
            <button
              className="favorites-page__clear"
              onClick={handleClearClick}
              aria-label="清空收藏"
              title="清空收藏"
            >
              <Trash2 size={16} />
              <span>清空</span>
            </button>
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
            <button className="empty-state__action" onClick={onBack}>
              去首页逛逛
            </button>
          </div>
        )}
      </main>

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="modal__title">确认清空收藏？</h3>
            <p className="modal__desc">将移除全部 {favoritedTemplates.length} 个收藏，此操作不可撤销。</p>
            <div className="modal__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setConfirming(false)}>
                取消
              </button>
              <button className="modal__btn modal__btn--danger" onClick={handleConfirmClear}>
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
