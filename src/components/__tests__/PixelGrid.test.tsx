import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PixelGrid from '../PixelGrid';
import type { ColorInfo } from '../../types/bead';

vi.mock('../../context/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const colors: ColorInfo[] = [{ hex: '#ff0000', name: '红' }];

describe('PixelGrid', () => {
  it('渲染 2x2 网格共 4 个 cell', () => {
    const grid = [[0, 0], [0, 0]];
    const { container } = render(<PixelGrid grid={grid} colors={colors} />);
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(4);
  });

  it('空格子（grid 值 0）背景透明', () => {
    const grid = [[0, 0], [0, 0]];
    const { container } = render(<PixelGrid grid={grid} colors={colors} />);
    const cell = container.querySelector('[data-cell="0-0"]') as HTMLElement;
    expect(cell.style.backgroundColor).toMatch(/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/);
  });

  it('有色格子（grid 值 1）背景对应 colors[0].hex', () => {
    const grid = [[1, 0], [0, 0]];
    const { container } = render(<PixelGrid grid={grid} colors={colors} />);
    const cell = container.querySelector('[data-cell="0-0"]') as HTMLElement;
    // colors[0].hex = '#ff0000'，jsdom 会规范化为 rgb(255, 0, 0)
    expect(cell.style.backgroundColor).toMatch(/rgb\(255,\s*0,\s*0\)/);
  });

  it('interactive 模式下有色格子 role=gridcell', () => {
    const grid = [[1, 0], [0, 1]];
    render(<PixelGrid grid={grid} colors={colors} interactive />);
    // 两个非空格子各有一个 gridcell
    expect(screen.getAllByRole('gridcell')).toHaveLength(2);
  });

  it('非交互模式容器 role=img', () => {
    render(<PixelGrid grid={[[1]]} colors={colors} />);
    // 非交互模式容器为 role="img"
    expect(screen.getByRole('img')).not.toBeNull();
  });

  it('interactive + onCellClick：点击非空格子触发回调', () => {
    const grid = [[1, 0], [0, 1]];
    const onCellClick = vi.fn();
    render(
      <PixelGrid grid={grid} colors={colors} interactive onCellClick={onCellClick} />,
    );
    const cells = screen.getAllByRole('gridcell');
    fireEvent.click(cells[0]);
    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });

  it('completedCells：已完成格子带 pixel-cell--completed class', () => {
    const grid = [[1, 0], [0, 0]];
    const { container } = render(
      <PixelGrid grid={grid} colors={colors} completedCells={new Set(['0-0'])} />,
    );
    const cell = container.querySelector('[data-cell="0-0"]') as HTMLElement;
    expect(cell.classList.contains('pixel-cell--completed')).toBe(true);
  });
});
