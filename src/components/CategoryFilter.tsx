import type { Category } from '../types/bead';

interface CategoryFilterProps {
  categories: Category[];
  active: string;
  onSelect: (id: string) => void;
}

export default function CategoryFilter({
  categories,
  active,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="category-filter">
      <div className="category-filter__list">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-pill ${active === cat.id ? 'category-pill--active' : ''}`}
            onClick={() => onSelect(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
