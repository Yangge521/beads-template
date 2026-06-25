import { Heart } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface FavoriteButtonProps {
  favorite: boolean;
  size?: number;
  onClick?: () => void;
}

export default function FavoriteButton({
  favorite,
  size = 20,
  onClick,
}: FavoriteButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`favorite-btn ${favorite ? 'favorite-btn--active' : ''}`}
      onClick={onClick}
      aria-label={favorite ? t('common.favorite.remove') : t('common.favorite.add')}
      aria-pressed={favorite}
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Heart
        size={size}
        fill={favorite ? '#ef4444' : 'none'}
        stroke={favorite ? '#ef4444' : 'currentColor'}
        className="favorite-btn__heart"
        style={{ transition: 'all 0.2s ease' }}
      />
    </button>
  );
}
