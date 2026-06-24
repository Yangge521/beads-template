import type { BeadTemplate } from '../types/bead';
import TemplateCard from '../components/TemplateCard';
import { ArrowLeft } from 'lucide-react';

interface FavoritesPageProps {
  templates: BeadTemplate[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
  onNavigate: (hash: string) => void;
}

export default function FavoritesPage({
  templates,
  favorites,
  onToggleFavorite,
  onBack,
  onNavigate,
}: FavoritesPageProps) {
  const favoritedTemplates = templates.filter(t => favorites.includes(t.id));

  return (
    <div className="page favorites-page">
      <header className="favorites-page__header">
        <button className="favorites-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <h1 className="favorites-page__title">我的收藏 ({favoritedTemplates.length})</h1>
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
          </div>
        )}
      </main>
    </div>
  );
}
