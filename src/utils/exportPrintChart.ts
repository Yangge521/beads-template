import type { BeadTemplate } from '../types/bead';
import { getBeadCount } from './beadStats';

/**
 * 导出可打印的坐标网格图纸（SVG）。
 * 这是 pixelbeads 类工具的核心差异化功能：带行列坐标 + 每 5 格加粗分组 +
 * 每格标注颜色编号 + 底部色卡图例，打印后即可直接对照拼制，无需反复看屏幕。
 * @param template 拼豆模板
 * @param labels 本地化文案 { title, colLabel, rowLabel, legendTitle, countLabel, totalLabel }
 * @param fileNameSuffix 文件名后缀（i18n）
 */
export interface PrintChartLabels {
  chartTitle: string;      // 图纸标题前缀
  colLabel: string;        // 列坐标说明
  rowLabel: string;        // 行坐标说明
  legendTitle: string;     // 色卡图例标题
  countLabel: string;      // "数量"
  totalLabel: string;      // "合计"
  beadUnit: string;        // "颗"
}

export function exportPrintChart(
  template: BeadTemplate,
  labels: PrintChartLabels,
  fileNameSuffix = 'chart'
): void {
  const { grid, colors, name, id } = template;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return;

  const cellSize = 32;       // 格子尺寸（含编号文字）
  const labelSize = 28;      // 坐标条宽/高
  const padding = 32;        // 外边距
  const majorEvery = 5;      // 每 5 格加粗分组（拼豆计数惯例）
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;

  // 统计每种颜色数量
  const counts: number[] = new Array(colors.length).fill(0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v > 0 && v <= colors.length) counts[v - 1]++;
    }
  }
  const totalBeads = getBeadCount(template);

  // 图例：按编号顺序，跳过未使用的颜色
  const legendItems = colors
    .map((color, idx) => ({ color, idx, count: counts[idx] }))
    .filter(item => item.count > 0);
  const legendCols = Math.min(4, legendItems.length);
  const legendItemW = 180;
  const legendItemH = 26;
  const legendRows = Math.ceil(legendItems.length / legendCols);
  const legendH = legendRows * legendItemH + 40;

  const totalW = padding + labelSize + gridW + padding;
  const totalH = padding + labelSize + gridH + padding + 50 + legendH + padding;

  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" font-family="system-ui, -apple-system, sans-serif">`
  );
  parts.push(`<title>${escapeXML(name || id)} - ${escapeXML(labels.chartTitle)}</title>`);

  // 背景
  parts.push(`<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="#ffffff"/>`);

  const gridX = padding + labelSize;
  const gridY = padding + labelSize;

  // ---- 标题 ----
  parts.push(
    `<text x="${padding}" y="${padding - 8}" font-size="16" font-weight="700" fill="#111">${escapeXML(name || id)}</text>`
  );
  parts.push(
    `<text x="${padding}" y="${padding + 6}" font-size="11" fill="#555">${escapeXML(labels.colLabel)}: ${cols} · ${escapeXML(labels.rowLabel)}: ${rows} · ${escapeXML(labels.totalLabel)}: ${totalBeads} ${escapeXML(labels.beadUnit)}</text>`
  );

  // ---- 列坐标（顶部 1..cols）----
  for (let c = 0; c < cols; c++) {
    const cx = gridX + c * cellSize + cellSize / 2;
    const isMajor = (c + 1) % majorEvery === 0;
    parts.push(
      `<text x="${cx}" y="${gridY - 8}" font-size="${isMajor ? 11 : 9}" font-weight="${isMajor ? 700 : 400}" text-anchor="middle" fill="${isMajor ? '#111' : '#888'}">${c + 1}</text>`
    );
  }

  // ---- 行坐标（左侧 1..rows）----
  for (let r = 0; r < rows; r++) {
    const cy = gridY + r * cellSize + cellSize / 2 + 3;
    const isMajor = (r + 1) % majorEvery === 0;
    parts.push(
      `<text x="${gridX - 6}" y="${cy}" font-size="${isMajor ? 11 : 9}" font-weight="${isMajor ? 700 : 400}" text-anchor="end" fill="${isMajor ? '#111' : '#888'}">${r + 1}</text>`
    );
  }

  // ---- 色块 + 格内颜色编号 ----
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      const x = gridX + c * cellSize;
      const y = gridY + r * cellSize;
      if (v > 0 && v <= colors.length) {
        const color = colors[v - 1];
        parts.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${escapeXML(color.hex)}"/>`);
        // 格内标注颜色编号（1-based），用对比色保证可读
        const textColor = isLightColor(color.hex) ? '#000' : '#fff';
        parts.push(
          `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 3}" font-size="10" font-weight="600" text-anchor="middle" fill="${textColor}">${v}</text>`
        );
      }
    }
  }

  // ---- 网格线（细线）----
  const thinLines: string[] = [];
  for (let r = 0; r <= rows; r++) {
    const y = gridY + r * cellSize;
    thinLines.push(`M${gridX} ${y}H${gridX + gridW}`);
  }
  for (let c = 0; c <= cols; c++) {
    const x = gridX + c * cellSize;
    thinLines.push(`M${x} ${gridY}V${gridY + gridH}`);
  }
  parts.push(`<path d="${thinLines.join('')}" stroke="#ccc" stroke-width="0.5" fill="none"/>`);

  // ---- 每 5 格加粗线（便于计数）----
  const boldLines: string[] = [];
  for (let r = 0; r <= rows; r += majorEvery) {
    const y = gridY + r * cellSize;
    boldLines.push(`M${gridX} ${y}H${gridX + gridW}`);
  }
  for (let c = 0; c <= cols; c += majorEvery) {
    const x = gridX + c * cellSize;
    boldLines.push(`M${x} ${gridY}V${gridY + gridH}`);
  }
  parts.push(`<path d="${boldLines.join('')}" stroke="#333" stroke-width="1.5" fill="none"/>`);

  // ---- 底部色卡图例 ----
  const legendY = gridY + gridH + padding;
  parts.push(
    `<text x="${padding}" y="${legendY}" font-size="13" font-weight="700" fill="#111">${escapeXML(labels.legendTitle)}</text>`
  );
  legendItems.forEach((item, i) => {
    const col = i % legendCols;
    const row = Math.floor(i / legendCols);
    const lx = padding + col * legendItemW;
    const ly = legendY + 16 + row * legendItemH;
    parts.push(`<rect x="${lx}" y="${ly}" width="16" height="16" fill="${escapeXML(item.color.hex)}" stroke="#333" stroke-width="0.5"/>`);
    parts.push(
      `<text x="${lx + 22}" y="${ly + 12}" font-size="11" fill="#111">${item.idx + 1}. ${escapeXML(item.color.name)} · ${escapeXML(labels.countLabel)} ${item.count}</text>`
    );
  });

  parts.push('</svg>');
  const svgStr = parts.join('');

  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || id}-${fileNameSuffix}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 判断颜色是否为浅色（用于决定格内编号文字用黑还是白）*/
function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  // 相对亮度（W3C 公式简化）
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

/** XML 转义：& < > " ' */
function escapeXML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
