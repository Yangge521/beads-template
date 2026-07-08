import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateCard from '../TemplateCard';
import type { BeadTemplate } from '../../types/bead';

vi.mock('../../context/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const baseTemplate: BeadTemplate = {
  id: 't1',
  name: 'My Template',
  category: 'animals',
  description: '',
  grid: [[1, 0], [0, 1]],
  colors: [{ hex: '#ff0000', name: '红' }],
  beadCount: 2,
  difficulty: 'easy',
  tags: [],
  source: '',
};

interface RenderOpts {
  template?: BeadTemplate;
  isFavorite?: boolean;
  onClick?: () => void;
  onToggleFavorite?: () => void;
  highlight?: string;
  categoryName?: string;
}

function renderCard(opts: RenderOpts = {}) {
  const onClick = opts.onClick ?? vi.fn();
  const onToggleFavorite = opts.onToggleFavorite ?? vi.fn();
  const utils = render(
    <TemplateCard
      template={opts.template ?? baseTemplate}
      isFavorite={opts.isFavorite ?? false}
      onToggleFavorite={onToggleFavorite}
      onClick={onClick}
      highlight={opts.highlight ?? ''}
      categoryName={opts.categoryName}
    />,
  );
  return { ...utils, onClick, onToggleFavorite };
}

describe('TemplateCard', () => {
  it('渲染模板名称', () => {
    renderCard();
    expect(screen.getByText('My Template')).not.toBeNull();
  });

  it('渲染分类标签', () => {
    renderCard({ categoryName: 'Animals' });
    expect(screen.getByText('Animals')).not.toBeNull();
  });

  it('点击卡片触发回调', () => {
    const { container, onClick } = renderCard();
    const card = container.querySelector('.template-card') as HTMLElement;
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('键盘 Enter 触发回调', () => {
    const { container, onClick } = renderCard();
    const card = container.querySelector('.template-card') as HTMLElement;
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('无 image 时渲染 PixelGrid 缩略图', () => {
    const { container } = renderCard();
    expect(container.querySelector('.pixel-grid')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('有 image 时渲染 img 缩略图', () => {
    const template = { ...baseTemplate, image: 'cover.png' };
    const { container } = renderCard({ template });
    const img = container.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('My Template');
    expect(img?.getAttribute('src')).toContain('cover.png');
  });
});
