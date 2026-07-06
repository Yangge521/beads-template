/**
 * 重生成 hard 模板封面（优化版）
 * 改进：
 * 1. 背景渐变使用分类主题色（而非模板前 3 色），确保色彩鲜明
 * 2. 像素预览区域加深色底板，让白色像素可见
 * 3. 增大像素块圆角，提升精致感
 * 4. 装饰粒子使用主题对比色
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'src', 'data');
const COVER_DIR = path.join(__dirname, 'public', 'covers');

// 分类主题色（背景渐变用）—— 鲜明、有辨识度
const CATEGORY_THEMES = {
  animals:  { bg: ['#FF8C42', '#A1887F'], accent: '#5D4037', label: 'ANIMAL' },
  anime:    { bg: ['#EC4899', '#3B82F6'], accent: '#A855F7', label: 'ANIME' },
  food:     { bg: ['#FB923C', '#FBBF24'], accent: '#E74C3C', label: 'FOOD' },
  pokemon:  { bg: ['#EF4444', '#FBBF24'], accent: '#3B82F6', label: 'POKEMON' },
  abstract: { bg: ['#A855F7', '#EF4444'], accent: '#22C55E', label: 'ABSTRACT' },
  pixel3d:  { bg: ['#3B82F6', '#06B6D4'], accent: '#FB923C', label: '3D' },
  nature:   { bg: ['#15803D', '#0F172A'], accent: '#7DD3FC', label: 'NATURE' },
};

// 新增 hard 模板 ID
const NEW_IDS = [
  'animals-lion-011', 'animals-peacock-012', 'animals-dragon-013', 'animals-phoenix-014',
  'anime-spirited-012', 'anime-naruto-013', 'anime-luffy-014', 'anime-demon-015',
  'food-cake-011', 'food-sushi-012', 'food-feast-013',
  'pokemon-mewtwo-012', 'pokemon-charizard-013', 'pokemon-lucario-014',
  'abstract-mondrian2-009', 'abstract-dali-010', 'abstract-picasso-011',
  'pixel3d-dragon3d-011', 'pixel3d-castle3d-012',
  'nature-aurora-009', 'nature-mountain-010',
];

function genCover(tpl) {
  const { id, name, grid, colors, beadCount } = tpl;
  const rows = grid.length;
  const cols = grid[0].length;
  const cat = id.split('-')[0];
  const theme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.animals;

  // 卡片布局
  const cardX = 138, cardY = 70, cardW = 204, cardH = 232;
  const previewSize = 168;
  const previewX = cardX + (cardW - previewSize) / 2;
  const previewY = cardY + 18;

  // 裁剪到图案实际边界框，避免稀疏图案在 32x32 网格中显得空旷
  let minR = rows, maxR = -1, minC = cols, maxC = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] > 0) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  // 边界保护（全空网格回退到完整网格）
  if (maxR < 0) { minR = 0; maxR = rows - 1; minC = 0; maxC = cols - 1; }
  const cropRows = maxR - minR + 1;
  const cropCols = maxC - minC + 1;

  // 像素块大小：基于裁剪后的边界框，让图案填满预览区域
  const cellSize = previewSize / Math.max(cropRows, cropCols);
  const gridW = cropCols * cellSize;
  const gridH = cropRows * cellSize;
  const gridStartX = previewX + (previewSize - gridW) / 2;
  const gridStartY = previewY + (previewSize - gridH) / 2;

  // 颜色查找表
  const colorLookup = colors.map(c => c.hex);

  // 生成像素块（仅渲染边界框内的格子）
  const rects = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const v = grid[r][c];
      if (v > 0 && v <= colorLookup.length) {
        const x = (gridStartX + (c - minC) * cellSize).toFixed(2);
        const y = (gridStartY + (r - minR) * cellSize).toFixed(2);
        const w = cellSize.toFixed(2);
        const h = cellSize.toFixed(2);
        const fill = colorLookup[v - 1];
        rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
      }
    }
  }

  // 装饰粒子（使用主题对比色）
  const particles = [];
  const particleColors = [theme.bg[0], theme.bg[1], theme.accent];
  for (let i = 0; i < 8; i++) {
    const px = 30 + (i * 56) % 440;
    const py = 25 + (i * 47) % 320;
    const pr = 2 + (i % 4);
    const pc = particleColors[i % 3];
    const op = 0.15 + (i % 3) * 0.08;
    particles.push(`<circle cx="${px}" cy="${py}" r="${pr}" fill="${pc}" opacity="${op}"/>`);
  }

  // 装饰几何线条（增加层次感）
  const decoLines = [
    `<path d="M 0 340 Q 240 320 480 340" stroke="${theme.accent}" stroke-width="1" fill="none" opacity="0.15"/>`,
    `<path d="M 0 20 Q 240 0 480 20" stroke="${theme.bg[0]}" stroke-width="1" fill="none" opacity="0.2"/>`,
  ];

  const idSafe = id.replace(/-/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360">
  <defs>
    <linearGradient id="bg${idSafe}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg[0]}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${theme.bg[1]}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="card${idSafe}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#f5f5f7" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="board${idSafe}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1d1d1f" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#1d1d1f" stop-opacity="0.08"/>
    </linearGradient>
    <filter id="shadow${idSafe}" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
      <feOffset dx="0" dy="2"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.15"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="480" height="360" fill="#fafafa"/>
  <rect width="480" height="360" fill="url(#bg${idSafe})"/>
  ${decoLines.join('\n  ')}
  ${particles.join('\n  ')}
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="18" fill="url(#card${idSafe})" stroke="rgba(0,0,0,0.06)" stroke-width="1" filter="url(#shadow${idSafe})"/>
  <!-- 像素预览底板（深色，让浅色像素可见） -->
  <rect x="${previewX - 4}" y="${previewY - 4}" width="${previewSize + 8}" height="${previewSize + 8}" rx="6" fill="#f5f5f7" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
  <!-- 像素网格 -->
  ${rects.join('')}
  <!-- 难度标签 -->
  <rect x="390" y="20" width="70" height="22" rx="11" fill="#ff3b30"/>
  <text x="425" y="35" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" fill="#ffffff" text-anchor="middle">HARD</text>
  <!-- 分类标签 -->
  <rect x="20" y="20" width="${theme.label.length * 8 + 16}" height="22" rx="11" fill="${theme.accent}" opacity="0.9"/>
  <text x="${20 + (theme.label.length * 8 + 16) / 2}" y="35" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="#ffffff" text-anchor="middle">${theme.label}</text>
  <!-- 模板名 -->
  <text x="240" y="286" font-family="-apple-system, 'PingFang SC', sans-serif" font-size="16" font-weight="600" fill="#1d1d1f" text-anchor="middle">${name}</text>
  <text x="240" y="304" font-family="-apple-system, sans-serif" font-size="11" font-weight="400" fill="#86868b" text-anchor="middle">${beadCount} beads · ${rows}×${cols}</text>
</svg>
`;

  return svg;
}

function main() {
  let count = 0;
  for (const id of NEW_IDS) {
    const cat = id.split('-')[0];
    const file = path.join(DATA_DIR, `${cat}.json`);
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    const tpl = arr.find(t => t.id === id);
    if (!tpl) {
      console.error(`NOT FOUND: ${id}`);
      continue;
    }
    const svg = genCover(tpl);
    const coverFile = path.join(COVER_DIR, `${id}.svg`);
    fs.writeFileSync(coverFile, svg, 'utf8');
    console.log(`+ ${id}.svg`);
    count++;
  }
  console.log(`\nTotal: ${count} covers regenerated`);
}

main();
