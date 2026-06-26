import type { MaterialSummaryItem } from './aggregateMaterials';
import { getTotalBeads } from './aggregateMaterials';

/**
 * 导出跨模板材料汇总 CSV（Excel 兼容，含 BOM 头确保中文不乱码）。
 * 列：序号、色号、颜色名称、总数量、占比、涉及模板数。
 * @returns boolean：true 成功，false 失败
 */
export interface MaterialCSVLabels {
  headerNo: string;
  headerHex: string;
  headerName: string;
  headerCount: string;
  headerRatio: string;
  headerTemplates: string;
  totalLabel: string;
}

export function exportMaterialListCSV(
  items: MaterialSummaryItem[],
  labels: MaterialCSVLabels,
  fileNameSuffix = 'material-list'
): boolean {
  if (items.length === 0) return false;
  try {
    const total = getTotalBeads(items);
    const BOM = '\uFEFF';
    const header = [
      labels.headerNo,
      labels.headerHex,
      labels.headerName,
      labels.headerCount,
      labels.headerRatio,
      labels.headerTemplates,
    ].join(',');
    const rows = items.map((item, i) => {
      const ratio = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
      // CSV 转义：含逗号的字段用双引号包裹
      const name = item.name.includes(',') ? `"${item.name}"` : item.name;
      return [
        String(i + 1),
        item.hex,
        name,
        String(item.count),
        `${ratio}%`,
        String(item.templateCount),
      ].join(',');
    });
    const totalRow = [
      '',
      '',
      labels.totalLabel,
      String(total),
      '100%',
      '',
    ].join(',');
    const csv = BOM + [header, ...rows, totalRow].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${fileNameSuffix}-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
