/**
 * AI 图像风格化预设库
 *
 * 用于 Agnes AI 图像生成 API（agnes-image-2.1-flash）的文生图 / 图生图。
 * 每个预设包含一段完整的英文提示词，可直接拼接到用户的图像生成请求中，
 * 将输入图像或文字转换为对应的艺术风格。
 */

/**
 * AI 图像风格化预设
 */
export interface AIStylePreset {
  /** 唯一标识 */
  id: string;
  /** 中文显示名 */
  nameZh: string;
  /** 英文显示名 */
  nameEn: string;
  /** 英文提示词（可直接拼接到图像生成请求中） */
  prompt: string;
  /** 装饰性 emoji */
  emoji: string;
  /** 简短描述 */
  description: string;
}

/**
 * AI 图像风格化预设列表
 *
 * 共 8 种风格，覆盖像素艺术、动漫、赛博朋克、传统绘画等主流美术方向。
 */
export const AI_STYLE_PRESETS: AIStylePreset[] = [
  {
    id: 'classic',
    nameZh: '经典像素艺术',
    nameEn: 'Classic Pixel Art',
    prompt:
      'in the style of classic pixel art, retro 8-bit and 16-bit video game graphics, blocky pixels, limited color palette, nostalgic arcade aesthetic, crisp pixelated edges, retro game sprite design, sharp and clean pixel grid',
    emoji: '👾',
    description: '复古游戏机风格的像素艺术，适合还原经典 8bit 画面',
  },
  {
    id: 'ghibli',
    nameZh: '吉卜力风',
    nameEn: 'Studio Ghibli',
    prompt:
      'in the style of Studio Ghibli animation, hand-painted watercolor backgrounds, soft pastel colors, dreamy atmosphere, gentle natural lighting, lush greenery and fluffy clouds, warm and whimsical anime aesthetic, detailed painted scenery',
    emoji: '🌸',
    description: '宫崎骏动画般温暖柔和的手绘水彩风',
  },
  {
    id: 'cyberpunk',
    nameZh: '赛博朋克',
    nameEn: 'Cyberpunk',
    prompt:
      'in a cyberpunk style, neon glowing lights, dark futuristic cityscape, holographic displays, high-tech low-life aesthetic, vibrant magenta and cyan neon reflections, rainy neon-lit streets, dystopian sci-fi atmosphere, dramatic high contrast lighting',
    emoji: '🤖',
    description: '霓虹灯闪烁的暗黑未来都市风',
  },
  {
    id: 'watercolor',
    nameZh: '水彩',
    nameEn: 'Watercolor',
    prompt:
      'as a watercolor painting, soft bleeding edges, translucent washes of color, wet-on-wet technique, delicate brush strokes, light and airy composition, hand-painted traditional watercolor illustration, subtle paper texture',
    emoji: '💧',
    description: '晕染柔和、通透轻盈的传统水彩画风',
  },
  {
    id: 'monet',
    nameZh: '莫奈印象派',
    nameEn: 'Monet Impressionism',
    prompt:
      'in the style of Claude Monet impressionist painting, visible thick brush strokes, dappled light and shadow, soft broken color, impressionist landscape, vibrant yet harmonious palette, plein air atmosphere, dreamy optical color blending',
    emoji: '🌻',
    description: '莫奈式笔触斑驳的印象派光影画风',
  },
  {
    id: 'vintage',
    nameZh: '复古',
    nameEn: 'Vintage',
    prompt:
      'in a vintage retro style, faded muted colors, aged paper texture, nostalgic 1950s aesthetic, sepia tones, old photograph look, weathered and worn surfaces, classic mid-century illustration, warm nostalgic mood',
    emoji: '📷',
    description: '褪色泛黄、充满年代感的怀旧复古风',
  },
  {
    id: 'kawaii',
    nameZh: '可爱风',
    nameEn: 'Kawaii',
    prompt:
      'in kawaii cute Japanese style, adorable chibi proportions, pastel color palette, soft and round shapes, big sparkly eyes, fluffy and sweet, Sanrio-style mascot aesthetic, gentle and joyful mood, decorated with small stars and hearts',
    emoji: '🍡',
    description: '日系卡哇伊萌系配色，圆润可爱的造型',
  },
  {
    id: 'oil',
    nameZh: '油画',
    nameEn: 'Oil Painting',
    prompt:
      'as a classical oil painting, rich textured brushwork, layered impasto technique, deep saturated colors, dramatic chiaroscuro lighting, traditional Renaissance master style, museum-quality fine art, visible canvas texture, warm golden tones',
    emoji: '🎨',
    description: '古典油画质感，厚涂笔触与戏剧性光影',
  },
];

/**
 * 根据风格 id 获取预设
 * @param id 风格预设的唯一标识
 * @returns 匹配到的预设，未找到时返回 undefined
 */
export function getStylePresetById(id: string): AIStylePreset | undefined {
  return AI_STYLE_PRESETS.find(preset => preset.id === id);
}
