/**
 * 导出 PDF：将拼豆模板生成包含图案、色卡图例和统计信息的 PDF 文档。
 *
 * 使用 jsPDF（动态导入，不进入首屏 bundle）：
 * - 首页：模板图案 + 名称
 * - 第二页：色卡图例（颜色列表 + 数量 + 占比）
 * - 第三页：可选的坐标网格图纸
 *
 * @param template 拼豆模板
 * @param labels 本地化文案
 * @param fileNameSuffix 文件名后缀（i18n）
 * @returns Promise<boolean>：true 表示成功，false 表示失败
 */
import type { BeadTemplate } from '../types/bead';
import { getBeadCount, getCorrectedColors } from './beadStats';

export interface PDFExportLabels {
  /** 模板标题标签（如"图案"） */
  titleLabel: string;
  /** 色卡图例页标题（如"色卡图例"） */
  legendTitle: string;
  /** 统计信息页标题 */
  statsTitle: string;
  /** 总数标签 */
  totalLabel: string;
  /** 占比标签 */
  ratioLabel: string;
  /** 颜色名称列 */
  colorNameLabel: string;
  /** 色号列 */
  colorCodeLabel: string;
  /** 数量列 */
  countLabel: string;
  /** 网格尺寸标签 */
  gridSizeLabel: string;
  /** 难度标签 */
  difficultyLabel: string;
  /** 难度映射 */
  difficultyText: (d: string) => string;
  /** 文件名后缀 */
  fileNameSuffix: string;
}

export async function exportTemplateToPDF(
  template: BeadTemplate,
  labels: PDFExportLabels,
): Promise<boolean> {
  const { grid, name, id, difficulty } = template;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return false;

  // 动态导入 jsPDF，避免影响首屏 bundle
  const { jsPDF } = await import('jspdf');
  const colors = getCorrectedColors(template);
  const totalBeads = getBeadCount(template);

  const doc = new jsPDF({
    orientation: cols > rows ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ============ 第一页：图案 + 标题 ============
  // 标题
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(name || id, margin, margin + 8);

  // 元信息
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const metaY = margin + 16;
  doc.text(`${labels.gridSizeLabel}: ${cols} x ${rows}`, margin, metaY);
  doc.text(`${labels.difficultyLabel}: ${labels.difficultyText(difficulty)}`, margin + 60, metaY);
  doc.text(`${labels.totalLabel}: ${totalBeads}`, margin + 120, metaY);

  // 图案区
  const gridAreaY = metaY + 6;
  const availW = pageW - margin * 2;
  const availH = pageH - gridAreaY - margin;
  const cellSize = Math.min(availW / cols, availH / rows);
  const gridW = cols * cellSize;
  const gridX = (pageW - gridW) / 2;
  const gridY = gridAreaY + 4;

  // 透明背景：只画有色格子
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v <= 0) continue;
      const color = colors[v - 1];
      if (!color) continue;
      const rgb = hexToRgb(color.hex);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(gridX + c * cellSize, gridY + r * cellSize, cellSize, cellSize, 'F');
    }
  }

  // ============ 第二页：色卡图例 + 统计 ============
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.legendTitle, margin, margin + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // 表头
  let y = margin + 20;
  const colWidths = [15, 30, 60, 25, 25]; // 序号/色号/名称/数量/占比
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2], margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]];

  doc.setFont('helvetica', 'bold');
  doc.text('#', colX[0], y);
  doc.text(labels.colorCodeLabel, colX[1], y);
  doc.text(labels.colorNameLabel, colX[2], y);
  doc.text(labels.countLabel, colX[3], y);
  doc.text(labels.ratioLabel, colX[4], y);
  y += 6;

  doc.setDrawColor(200);
  doc.line(margin, y - 2, pageW - margin, y - 2);
  y += 2;

  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const count = color.count ?? 0;
    if (count === 0) continue;

    // 自动分页
    if (y > pageH - margin - 8) {
      doc.addPage();
      y = margin + 8;
    }

    // 颜色色块
    const rgb = hexToRgb(color.hex);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(colX[0], y - 4, 8, 5, 'F');
    doc.setTextColor(0);
    doc.text(String(i + 1), colX[0] + 10, y);
    doc.text(color.hex, colX[1], y);
    doc.text(color.name, colX[2], y);
    doc.text(String(count), colX[3], y);
    const ratio = totalBeads > 0 ? ((count / totalBeads) * 100).toFixed(1) + '%' : '0%';
    doc.text(ratio, colX[4], y);
    y += 6;
  }

  // 合计
  y += 4;
  doc.setDrawColor(150);
  doc.line(margin, y - 2, pageW - margin, y - 2);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(labels.totalLabel, colX[2], y);
  doc.text(String(totalBeads), colX[3], y);
  doc.text('100%', colX[4], y);

  // 保存
  doc.save(`${name || id}-${labels.fileNameSuffix}.pdf`);
  return true;
}

/** hex 颜色 → [r, g, b]（0-255） */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}
