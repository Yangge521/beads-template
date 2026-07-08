/**
 * 模板 Remix/Fork 工具
 *
 * 用于从已有模板派生出新模板，并附加派生元数据用于溯源。
 */

/** 父模板输入 */
interface RemixParent {
  id: string;
  name: string;
  category: string;
}

/** 子模板输入：派生模板的基本内容 */
interface RemixChild {
  name: string;
  grid: number[][];
  colors: Array<{ hex: string; name: string }>;
}

/** Remix 派生元数据，附加到新模板上用于溯源 */
export interface RemixMeta {
  originParentId: string;
  originParentName: string;
  remixDepth: number;
  isRemix: true;
}

/**
 * 根据父模板与子模板内容，生成 Remix 派生元数据。
 *
 * @param parent 被 Fork 的父模板（id/名称/分类）
 * @param child  派生出的新模板（名称/网格/颜色）
 * @returns 可附加到新模板的 RemixMeta（remixDepth 固定为 1，表示直接派生）
 */
export function createRemix(
  parent: RemixParent,
  child: RemixChild
): RemixMeta {
  // 基础校验：派生模板必须有非空网格与颜色
  if (child.grid.length === 0 || child.colors.length === 0) {
    throw new Error('invalid remix child: empty grid or colors');
  }
  return {
    originParentId: parent.id,
    originParentName: parent.name,
    remixDepth: 1,
    isRemix: true,
  };
}

/**
 * 生成 Remix 名称：在父名称后追加后缀。
 *
 * @param parentName 父模板名称
 * @param suffix     后缀，默认 ' Remix'
 * @returns 如 '爱心 Remix'
 */
export function buildRemixName(parentName: string, suffix = ' Remix'): string {
  return `${parentName}${suffix}`;
}
