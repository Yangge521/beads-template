import { useRef, useState, useEffect } from 'react';
import type { Category } from '../types/bead';
import {
  Grid, Sparkles, Gamepad2, Coffee, Dog, PartyPopper, Heart, Box, Smile, Star, Leaf, Upload,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

const iconMap: Record<string, LucideIcon> = {
  Grid, Sparkles, Gamepad2, Coffee, Dog, PartyPopper, Heart, Box, Smile, Star, Leaf, Upload,
};

interface CategoryFilterProps {
  categories: Category[];
  active: string;
  onSelect: (id: string) => void;
  counts?: Record<string, number>;
}

export default function CategoryFilter({
  categories,
  active,
  onSelect,
  counts,
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const updateScrollState = () => {
      const el = scrollRef.current;
      if (!el) return;
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  // 滚动到激活的分类，确保可见
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>(`[data-cat="${active}"]`);
    if (activeBtn) {
      const left = activeBtn.offsetLeft - el.clientWidth / 2 + activeBtn.offsetWidth / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }, [active]);

  return (
    <div className={`category-filter ${canLeft ? 'category-filter--left' : ''} ${canRight ? 'category-filter--right' : ''}`}>
      <div className="category-filter__list" ref={scrollRef}>
        {categories.map(cat => {
          const count = counts?.[cat.id];
          // 隐藏计数为 0 的非"全部"分类（如未上传模板时的"我的上传"）
          if (cat.id !== 'all' && count === 0) return null;
          const isActive = active === cat.id;
          const Icon = iconMap[cat.icon];
          return (
            <button
              key={cat.id}
              type="button"
              data-cat={cat.id}
              className={`category-pill ${isActive ? 'category-pill--active' : ''}`}
              onClick={() => onSelect(cat.id)}
              title={t(`category.${cat.id}.desc`)}
              aria-current={isActive ? 'true' : undefined}
            >
              {Icon && <Icon size={14} className="category-pill__icon" />}
              <span>{t(`category.${cat.id}.name`)}</span>
              {count !== undefined && (
                <span className="category-pill__count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
