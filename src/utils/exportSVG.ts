import type { BeadTemplate } from '../types/bead';

/**
 * 把模板的 grid 渲染为 SVG 字符串并下载。
 * SVG 是矢量格式，无限缩放不失真，文件体积小，非常适合拼豆网格图。
 * @param template 拼豆模板
 * @param cellSize 每格像素大小（默认 24）
 * @param withGridLines 是否绘制网格线
 * @param fileNameSuffix 文件名后缀（i18n 文案，由调用方传入）
 */
export function exportTemplateToSVG(
  template: BeadTemplate,
  cellSize = 24,
  withGridLines = false,
  fileNameSuffix = 'pattern'
): void {
  const { grid, colors, name, id } = template;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return;

  const width = cols * cellSize;
  const height = rows * cellSize;

  // 按颜色索引分组：把同色 rect 合并到单个 <path>，大幅减小 SVG 体积。
  // 例：50x50 网格 1500 格 → 原本 1500 个 <rect>，现在 ≤ 颜色数 个 <path>。
  const byColor = new Map<number, string[]>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v <= 0) continue;
      const color = colors[v - 1];
      if (!color) continue;
      const x = c * cellSize;
      const y = r * cellSize;
      const d = `M${x} ${y}h${cellSize}v${cellSize}h-${cellSize}z`;
      let arr = byColor.get(v);
      if (!arr) { arr = []; byColor.set(v, arr); }
      arr.push(d);
    }
  }

  const parts: string[] = [];
  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>`
  );
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`
  );
  // 标题（无障碍）
  parts.push(`<title>${escapeXML(name || id)}</title>`);

  // 同色合并 path：一个颜色一个 <path d="..."> 节点
  for (const [v, dList] of byColor) {
    const color = colors[v - 1];
    if (!color) continue;
    parts.push(
      `<path d="${dList.join('')}" fill="${escapeXML(color.hex)}"/>`
    );
  }

  // 网格线：用一个 path 绘制所有横竖线，减少节点数
  if (withGridLines) {
    const lines: string[] = [];
    for (let r = 0; r <= rows; r++) {
      const y = r * cellSize;
      lines.push(`M0 ${y}H${width}`);
    }
    for (let c = 0; c <= cols; c++) {
      const x = c * cellSize;
      lines.push(`M${x} 0V${height}`);
    }
    parts.push(
      `<path d="${lines.join('')}" stroke="rgba(0,0,0,0.25)" stroke-width="1" fill="none"/>`
    );
  }

  parts.push('</svg>');
  const svgStr = parts.join('');

  // 触发下载
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

/** XML 转义：& < > " ' */
function escapeXML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
