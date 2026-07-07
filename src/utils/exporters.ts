/**
 * 导出工具动态加载聚合模块。
 *
 * 用法（在懒加载页面 DetailPage/EditorPage 内）：
 *   const { exportTemplateToPNG } = await import('../utils/exportPNG');
 * 或更推荐：
 *   import { lazyExportPNG } from '../utils/exporters';
 *   await lazyExportPNG(template, ...);
 *
 * 这里只做轻量转发，Vite 会自动把 exportPNG/SVG/CSV/printChart 拆成独立 chunk。
 */

export async function lazyExportPNG(
  ...args: Parameters<typeof import('./exportPNG')['exportTemplateToPNG']>
): Promise<boolean> {
  const { exportTemplateToPNG } = await import('./exportPNG');
  return exportTemplateToPNG(...args);
}

export async function lazyExportSVG(
  ...args: Parameters<typeof import('./exportSVG')['exportTemplateToSVG']>
): Promise<void> {
  const { exportTemplateToSVG } = await import('./exportSVG');
  return exportTemplateToSVG(...args);
}

export async function lazyExportCSV(
  ...args: Parameters<typeof import('./exportCSV')['exportColorListCSV']>
): Promise<boolean> {
  const { exportColorListCSV } = await import('./exportCSV');
  return exportColorListCSV(...args);
}

export async function lazyExportMaterialCSV(
  ...args: Parameters<typeof import('./exportMaterialCSV')['exportMaterialListCSV']>
): Promise<boolean> {
  const { exportMaterialListCSV } = await import('./exportMaterialCSV');
  return exportMaterialListCSV(...args);
}

export async function lazyExportPrintChart(
  ...args: Parameters<typeof import('./exportPrintChart')['exportPrintChart']>
): Promise<boolean> {
  const { exportPrintChart } = await import('./exportPrintChart');
  return exportPrintChart(...args);
}

export async function lazyExportPDF(
  ...args: Parameters<typeof import('./exportPDF')['exportTemplateToPDF']>
): Promise<boolean> {
  const { exportTemplateToPDF } = await import('./exportPDF');
  return exportTemplateToPDF(...args);
}
