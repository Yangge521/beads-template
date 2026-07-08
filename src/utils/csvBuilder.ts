/**
 * CSV 导出共享工具
 *
 * 收敛 exportCSV.ts 和 exportMaterialCSV.ts 中重复的逻辑：
 * - BOM 头处理（确保中文在 Excel 中不乱码）
 * - CSV 字段转义
 * - Blob 下载触发
 */

const BOM = '\uFEFF';
const CSV_MIME = 'text/csv;charset=utf-8;';

/** CSV 字段转义：包含逗号、双引号或换行则用双引号包裹，内部双引号转义为两个双引号 */
export function escapeCSVField(value: string): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** 将数组拼接为 CSV 行（逗号分隔） */
export function buildCSVRow(fields: string[]): string {
  return fields.map(escapeCSVField).join(',');
}

export interface DownloadCSVOptions {
  /** 文件名（不含扩展名） */
  fileName: string;
  /** 文件名后缀，默认 'csv' */
  fileSuffix?: string;
}

/**
 * 触发 CSV 文件下载
 * @param rows CSV 行数组（每行是字段数组）
 * @param options 下载选项
 * @returns true 成功，false 失败
 */
export function downloadCSV(rows: string[][], options: DownloadCSVOptions): boolean {
  try {
    const csvContent = BOM + rows.map(buildCSVRow).join('\r\n');
    const blob = new Blob([csvContent], { type: CSV_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const suffix = options.fileSuffix ?? 'csv';
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${options.fileName}-${suffix}-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
