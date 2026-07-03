import { useState } from 'react';
import { Shapes, ChevronDown, ChevronUp } from 'lucide-react';
import { PRESET_SHAPE_DEFS, PRESET_SHAPE_CATEGORIES, bitmapToGrid } from '../utils/presetShapes';
import PixelGrid from './PixelGrid';
import { useTranslation } from '../context/LanguageContext';

interface ShapeLibraryPanelProps {
  /** 当前选中颜色索引（用于预览） */
  selectedColorIdx: number;
  /** 当前色板 */
  colors: { hex: string; name: string }[];
  /** 点击形状时回调 */
  onStamp: (shapeId: string) => void;
}

/**
 * 预设形状库面板（可折叠）。
 * 按类别分组显示几何、符号、字母、数字形状。
 * 点击形状即盖印到网格中央。
 */
export default function ShapeLibraryPanel({
  selectedColorIdx,
  colors,
  onStamp,
}: ShapeLibraryPanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('geo');

  // 预览用色：选中色板里的颜色，回退到默认
  const previewColor = colors[selectedColorIdx - 1]?.hex ?? '#f59e0b';
  // 预览用色板（仅 2 色：空 + 当前色）
  const previewColors = [
    { hex: '#000000', name: 'bg', count: 0 },
    { hex: previewColor, name: 'fg', count: 1 },
  ];

  const visibleShapes = PRESET_SHAPE_DEFS.filter(s => s.category === activeCategory);

  return (
    <section className="shape-library" aria-label={t('editor.shapeLib.title')}>
      <button
        type="button"
        className="shape-library__header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls="shape-library-body"
      >
        <Shapes size={18} aria-hidden="true" />
        <span className="shape-library__title">{t('editor.shapeLib.title')}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div id="shape-library-body" className="shape-library__body">
          <div className="shape-library__tabs" role="tablist">
            {PRESET_SHAPE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={`shape-library__tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
          <div className="shape-library__grid">
            {visibleShapes.map(shape => {
              const grid = bitmapToGrid(shape.bitmap);
              return (
                <button
                  key={shape.id}
                  type="button"
                  className="shape-library__item"
                  onClick={() => onStamp(shape.id)}
                  title={t(shape.nameKey)}
                  aria-label={t(shape.nameKey)}
                >
                  <div className="shape-library__thumb">
                    <PixelGrid grid={grid} colors={previewColors} />
                  </div>
                  <span className="shape-library__emoji" aria-hidden="true">{shape.emoji}</span>
                </button>
              );
            })}
          </div>
          <p className="shape-library__hint">{t('editor.shapeLib.hint')}</p>
        </div>
      )}
    </section>
  );
}
