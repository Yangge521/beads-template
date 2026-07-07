import type { BeadTemplate } from '../types/bead';
import { getCorrectedColors, getBeadCount } from './beadStats';

/**
 * 导出 CSV 色号清单（Excel 兼容）。
 * 竞品 PixelBeads 的核心功能：行列坐标 + 色号 + 名称 + 数量，可直接用 Excel/WPS 打开。
 * 包含 BOM 头确保中文在 Excel 中不乱码。
 * @param template 拼豆模板
 * @param labels 本地化文案
 * @param fileNameSuffix 文件名后缀（i18n）
 */
export interface CSVExportLabels {
  headerNo: string;          // 序号
  headerHex: string;         // 色号
  headerName: string;        // 颜色名称
  headerCount: string;       // 数量
  headerRatio: string;       // 占比
  headerPositions: string;   // 位置坐标
  totalLabel: string;        // 合计
}

export function exportColorListCSV(
  template: BeadTemplate,
  labels: CSVExportLabels,
  fileNameSuffix = 'color-list'
): boolean {
  const { grid, name, id } = template;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return false;

  const colors = getCorrectedColors(template);
  const totalBeads = getBeadCount(template);

  // 收集每种颜色的位置坐标（行列，1-based）
  const positions: string[][] = colors.map(() => []);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v > 0 && v <= colors.length) {
        positions[v - 1].push(`R${r + 1}C${c + 1}`);
      }
    }
  }

  // 构建 CSV 行
  const csvLines: string[] = [];
  // 表头
  csvLines.push([
    labels.headerNo,
    labels.headerHex,
    labels.headerName,
    labels.headerCount,
    labels.headerRatio,
    labels.headerPositions,
  ].map(escapeCSV).join(','));

  // 数据行
  colors.forEach((color, idx) => {
    const count = color.count ?? 0;
    const ratio = totalBeads > 0 ? ((count / totalBeads) * 100).toFixed(1) + '%' : '0%';
    // 位置坐标：如果太多则截断显示前 50 个 + 省略号
    const posList = positions[idx];
    const posStr = posList.length > 50
      ? posList.slice(0, 50).join(' ') + ` ... (${posList.length})`
      : posList.join(' ');
    csvLines.push([
      String(idx + 1),
      color.hex,
      color.name,
      String(count),
      ratio,
      posStr,
    ].map(escapeCSV).join(','));
  });

  // 合计行
  csvLines.push([
    '',
    '',
    labels.totalLabel,
    String(totalBeads),
    totalBeads > 0 ? '100%' : '0%',
    '',
  ].map(escapeCSV).join(','));

  // 添加 BOM 头确保 Excel 正确识别 UTF-8 中文
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || id}-${fileNameSuffix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** CSV 字段转义：包含逗号、双引号或换行则用双引号包裹，内部双引号转义为两个双引号 */
function escapeCSV(value: string): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
