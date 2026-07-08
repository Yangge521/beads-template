/**
 * 拼豆采购清单计算与导出工具
 *
 * 根据模板颜色用量计算建议采购数量（含损耗）、单价、小计，
 * 并支持导出 CSV 清单和生成淘宝搜索链接。
 */

/** 采购清单项 */
export interface PurchaseItem {
  hex: string;            // 色号
  name: string;           // 颜色名称
  count: number;          // 实际需要数量
  purchaseCount: number;  // 建议采购数量（含损耗）
  unitPrice: number;      // 单价（元/颗）
  subtotal: number;       // 小计
  brand?: string;         // 品牌色号
}

/** calculatePurchaseList 选项 */
export interface CalculatePurchaseOptions {
  /** 损耗率，默认 0.1（10%） */
  wasteRate?: number;
  /** 单价（元/颗），默认 0.05 */
  unitPrice?: number;
  /** 根据 hex 查询品牌色号的回调 */
  brandLookup?: (hex: string) => string | undefined;
}

/**
 * 根据颜色用量列表计算采购清单。
 * - wasteRate 默认 0.1（10% 损耗）
 * - unitPrice 默认 0.05（5 分钱一颗）
 * - purchaseCount = Math.ceil(count * (1 + wasteRate))，至少 1
 * - subtotal = purchaseCount * unitPrice
 */
export function calculatePurchaseList(
  colors: Array<{ hex: string; name: string; count?: number }>,
  options?: CalculatePurchaseOptions,
): PurchaseItem[] {
  const wasteRate = options?.wasteRate ?? 0.1;
  const unitPrice = options?.unitPrice ?? 0.05;
  const brandLookup = options?.brandLookup;

  return colors.map(color => {
    const count = color.count ?? 0;
    // 建议采购数量：含损耗向上取整，至少 1 颗
    const purchaseCount = Math.max(1, Math.ceil(count * (1 + wasteRate)));
    const subtotal = purchaseCount * unitPrice;
    const brand = brandLookup ? brandLookup(color.hex) : undefined;
    return {
      hex: color.hex,
      name: color.name,
      count,
      purchaseCount,
      unitPrice,
      subtotal,
      brand,
    };
  });
}

/** 合计结果 */
export interface PurchaseTotal {
  totalBeads: number;  // 建议采购总数
  totalCost: number;   // 总费用
}

/**
 * 计算采购清单合计。
 * - totalBeads = sum(purchaseCount)
 * - totalCost = sum(subtotal)
 */
export function calculateTotal(items: PurchaseItem[]): PurchaseTotal {
  return items.reduce(
    (acc, item) => {
      acc.totalBeads += item.purchaseCount;
      acc.totalCost += item.subtotal;
      return acc;
    },
    { totalBeads: 0, totalCost: 0 },
  );
}

/**
 * 导出采购清单为 CSV 文件（Excel 兼容，含 BOM 头确保中文不乱码）。
 * - 表头：序号,色号,名称,数量,建议采购,单价,小计
 * - 末行：合计
 * - 文件名格式：拼豆采购清单_YYYYMMDD.csv
 * @returns true 成功，false 失败
 */
export function exportPurchaseCSV(
  items: PurchaseItem[],
  total: { totalBeads: number; totalCost: number },
): boolean {
  try {
    const BOM = '\uFEFF';
    // 表头
    const header = ['序号', '色号', '名称', '数量', '建议采购', '单价', '小计'].join(',');
    // 数据行
    const rows = items.map((item, idx) => {
      // CSV 转义：含逗号的字段用双引号包裹
      const name = item.name.includes(',') ? `"${item.name}"` : item.name;
      return [
        String(idx + 1),
        item.hex,
        name,
        String(item.count),
        String(item.purchaseCount),
        item.unitPrice.toFixed(2),
        item.subtotal.toFixed(2),
      ].join(',');
    });
    // 合计行
    const totalRow = [
      '',
      '',
      '合计',
      '',
      String(total.totalBeads),
      '',
      total.totalCost.toFixed(2),
    ].join(',');
    const csv = BOM + [header, ...rows, totalRow].join('\r\n');

    // Blob + URL.createObjectURL + a 标签触发下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    // 文件名格式：拼豆采购清单_YYYYMMDD.csv
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    a.href = url;
    a.download = `拼豆采购清单_${y}${m}${d}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成淘宝搜索 URL，把前 5 个颜色的名称作为搜索关键词。
 * 格式：https://s.taobao.com/search?q=关键词1+关键词2+...
 */
export function generateTaobaoSearchUrl(items: PurchaseItem[]): string {
  const keywords = items
    .slice(0, 5)
    .map(item => encodeURIComponent(item.name))
    .join('+');
  return `https://s.taobao.com/search?q=${keywords}`;
}
