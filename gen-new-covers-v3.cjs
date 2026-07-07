/**
 * 通用封面生成器 v3
 * 为指定 ID 列表的所有模板生成 SVG 封面
 * 支持所有分类和难度级别
 *
 * 用法：node gen-new-covers-v3.cjs
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'src', 'data');
const COVER_DIR = path.join(__dirname, 'public', 'covers');

// 分类主题色（背景渐变 + 装饰色 + 标签）
const CATEGORY_THEMES = {
  animals:    { bg: ['#FF8C42', '#A1887F'], accent: '#5D4037', label: 'ANIMAL' },
  anime:      { bg: ['#EC4899', '#3B82F6'], accent: '#A855F7', label: 'ANIME' },
  food:       { bg: ['#FB923C', '#FBBF24'], accent: '#E74C3C', label: 'FOOD' },
  pokemon:    { bg: ['#EF4444', '#FBBF24'], accent: '#3B82F6', label: 'GAME' },
  abstract:   { bg: ['#A855F7', '#EF4444'], accent: '#22C55E', label: 'ABSTRACT' },
  pixel3d:    { bg: ['#3B82F6', '#06B6D4'], accent: '#FB923C', label: '3D' },
  nature:     { bg: ['#15803D', '#0F172A'], accent: '#7DD3FC', label: 'NATURE' },
  celebrity:  { bg: ['#A855F7', '#EC4899'], accent: '#F59E0B', label: 'CELEB' },
  holiday:    { bg: ['#EF4444', '#16A34A'], accent: '#FBBF24', label: 'HOLIDAY' },
  kawaii:     { bg: ['#F472B6', '#A78BFA'], accent: '#22C55E', label: 'KAWAII' },
  pixelart:   { bg: ['#6366F1', '#8B5CF6'], accent: '#F59E0B', label: 'ART' },
  emoji:      { bg: ['#FBBF24', '#F59E0B'], accent: '#EF4444', label: 'EMOJI' },
  seasonal:   { bg: ['#22C55E', '#EAB308'], accent: '#EF4444', label: 'SEASON' },
  collab:     { bg: ['#8B5CF6', '#EC4899'], accent: '#22C55E', label: 'COLLAB' },
  portrait:   { bg: ['#D97706', '#92400E'], accent: '#FBBF24', label: 'PORTRAIT' },
  logo:       { bg: ['#1F2937', '#374151'], accent: '#3B82F6', label: 'LOGO' },
};

// 难度配色
const DIFFICULTY_STYLES = {
  easy:   { bg: '#22c55e', label: 'EASY' },
  medium: { bg: '#f59e0b', label: 'MEDIUM' },
  hard:   { bg: '#ef4444', label: 'HARD' },
};

function genCover(tpl) {
  const { id, name, grid, colors, beadCount, difficulty } = tpl;
  const rows = grid.length;
  const cols = grid[0].length;
  const cat = id.split('-')[0];
  const theme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.anime;
  const diff = DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.medium;

  // 卡片布局
  const cardX = 138, cardY = 70, cardW = 204, cardH = 232;
  const previewSize = 168;
  const previewX = cardX + (cardW - previewSize) / 2;
  const previewY = cardY + 18;

  // 裁剪到图案实际边界框，让稀疏图案填满预览区域
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
  if (maxR < 0) { minR = 0; maxR = rows - 1; minC = 0; maxC = cols - 1; }
  const cropRows = maxR - minR + 1;
  const cropCols = maxC - minC + 1;

  const cellSize = previewSize / Math.max(cropRows, cropCols);
  const gridW = cropCols * cellSize;
  const gridH = cropRows * cellSize;
  const gridStartX = previewX + (previewSize - gridW) / 2;
  const gridStartY = previewY + (previewSize - gridH) / 2;

  const colorLookup = colors.map(c => c.hex);

  // 像素块（带圆角）
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
        const rx = Math.min(1.5, cellSize * 0.12).toFixed(2);
        rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`);
      }
    }
  }

  // 装饰粒子
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

  const decoLines = [
    `<path d="M 0 340 Q 240 320 480 340" stroke="${theme.accent}" stroke-width="1" fill="none" opacity="0.15"/>`,
    `<path d="M 0 20 Q 240 0 480 20" stroke="${theme.bg[0]}" stroke-width="1" fill="none" opacity="0.2"/>`,
  ];

  const idSafe = id.replace(/-/g, '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360">
  <defs>
    <linearGradient id="bg${idSafe}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg[0]}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${theme.bg[1]}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="card${idSafe}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#f5f5f7" stop-opacity="0.95"/>
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
  <rect x="${previewX - 4}" y="${previewY - 4}" width="${previewSize + 8}" height="${previewSize + 8}" rx="6" fill="#f5f5f7" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
  ${rects.join('')}
  <rect x="390" y="20" width="70" height="22" rx="11" fill="${diff.bg}"/>
  <text x="425" y="35" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" fill="#ffffff" text-anchor="middle">${diff.label}</text>
  <rect x="20" y="20" width="${theme.label.length * 8 + 16}" height="22" rx="11" fill="${theme.accent}" opacity="0.9"/>
  <text x="${20 + (theme.label.length * 8 + 16) / 2}" y="35" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="#ffffff" text-anchor="middle">${theme.label}</text>
  <text x="240" y="286" font-family="-apple-system, 'PingFang SC', sans-serif" font-size="16" font-weight="600" fill="#1d1d1f" text-anchor="middle">${name}</text>
  <text x="240" y="304" font-family="-apple-system, sans-serif" font-size="11" font-weight="400" fill="#86868b" text-anchor="middle">${beadCount} beads · ${rows}×${cols}</text>
</svg>
`;
}

// 扫描所有数据文件，找出缺失封面的模板
function main() {
  let count = 0;
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    for (const tpl of arr) {
      if (!tpl.image) continue;
      const coverFile = path.join(COVER_DIR, path.basename(tpl.image));
      if (!fs.existsSync(coverFile)) {
        const svg = genCover(tpl);
        fs.writeFileSync(coverFile, svg, 'utf8');
        console.log(`+ ${tpl.id}.svg`);
        count++;
      }
    }
  }
  console.log(`\nTotal: ${count} covers generated`);
}

main();
