/**
 * AI 生成风格预设
 * 影响生成结果的配色方案和后处理
 */

export interface StylePreset {
  id: string;
  /** 中文显示名 */
  name: string;
  /** 英文显示名 */
  nameEn: string;
  /** 风格描述 */
  description: string;
  /** 配色方案（hex 数组，生成时使用） */
  palette: string[];
  /** 颜色名称（与 palette 一一对应） */
  colorNames: string[];
  /** emoji 图标（装饰用） */
  icon: string;
}

/**
 * 风格预设列表
 * 每种风格有独特的配色方案，影响 preset 模式的颜色选择
 */
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'classic',
    name: '经典像素',
    nameEn: 'Classic Pixel',
    description: '鲜艳明快的标准像素配色',
    palette: [
      '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
      '#00C7BE', '#007AFF', '#5856D6', '#AF52DE',
      '#FFFFFF',
    ],
    colorNames: ['红', '橙', '黄', '绿', '青', '蓝', '紫', '品红', '白'],
    icon: '🎨',
  },
  {
    id: 'retro',
    name: '复古 8bit',
    nameEn: 'Retro 8bit',
    description: 'FC 红白机风格有限配色',
    palette: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
    ],
    colorNames: ['黑', '深蓝', '紫红', '深绿', '棕', '灰', '浅灰', '白', '红', '橙', '黄', '亮绿', '蓝', '灰紫', '粉', '浅橙'],
    icon: '👾',
  },
  {
    id: 'minimal',
    name: '极简主义',
    nameEn: 'Minimal',
    description: '黑白灰极简配色，适合 logo',
    palette: [
      '#FFFFFF', '#000000', '#9CA3AF', '#6B7280', '#374151',
    ],
    colorNames: ['白', '黑', '浅灰', '中灰', '深灰'],
    icon: '⚪',
  },
  {
    id: 'pastel',
    name: '马卡龙',
    nameEn: 'Pastel',
    description: '柔和甜蜜的马卡龙配色',
    palette: [
      '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
      '#BAE1FF', '#E0BBE4', '#FEC8D8', '#FFB6C1',
      '#FAFAFA',
    ],
    colorNames: ['粉红', '橙黄', '鹅黄', '薄荷', '天蓝', '薰衣草', '蜜桃', '樱粉', '米白'],
    icon: '🌸',
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    nameEn: 'Cyberpunk',
    description: '霓虹夜光高对比配色',
    palette: [
      '#FF00FF', '#00FFFF', '#FF006E', '#8338EC',
      '#3A86FF', '#06FFA5', '#FB5607', '#FFBE0B',
      '#0A0A0A',
    ],
    colorNames: ['洋红', '青', '霓虹粉', '紫', '电蓝', '荧光绿', '橙红', '黄', '黑'],
    icon: '🤖',
  },
  {
    id: 'natural',
    name: '自然大地',
    nameEn: 'Natural Earth',
    description: '温和的大地色系',
    palette: [
      '#8B4513', '#A0522D', '#CD853F', '#DEB887',
      '#F5DEB3', '#556B2F', '#6B8E23', '#90EE90',
      '#87CEEB',
    ],
    colorNames: ['棕褐', '鞍棕', '秘鲁', '硬木', '麦色', '橄榄绿', '深橄榄', '浅绿', '天蓝'],
    icon: '🌿',
  },
];

/** 根据风格 id 获取预设 */
export function getStylePreset(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find(s => s.id === id);
}

/** 默认风格（classic）的配色 */
export const DEFAULT_PALETTE = STYLE_PRESETS[0].palette;
export const DEFAULT_COLOR_NAMES = STYLE_PRESETS[0].colorNames;
