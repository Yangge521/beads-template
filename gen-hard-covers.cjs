/**
 * 为新增 hard 模板生成 SVG 封面
 * 结构：渐变背景 + 装饰粒子 + 卡片 + 像素预览 + 难度标签 + 模板名
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'src', 'data');
const COVER_DIR = path.join(__dirname, 'public', 'covers');

// 新增模板 ID 列表
const NEW_IDS = [
  'animals-lion-011', 'animals-peacock-012', 'animals-dragon-013', 'animals-phoenix-014',
  'anime-spirited-012', 'anime-naruto-013', 'anime-luffy-014', 'anime-demon-015',
  'food-cake-011', 'food-sushi-012', 'food-feast-013',
  'pokemon-mewtwo-012', 'pokemon-charizard-013', 'pokemon-lucario-014',
  'abstract-mondrian2-009', 'abstract-dali-010', 'abstract-picasso-011',
  'pixel3d-dragon3d-011', 'pixel3d-castle3d-012',
  'nature-aurora-009', 'nature-mountain-010',
];

// 生成单个 SVG 封面
function genCover(tpl) {
  const { id, name, grid, colors, beadCount } = tpl;
  const rows = grid.length;
  const cols = grid[0].length;

  // 卡片区域：204x232，像素预览区域 172x172（居中）
  const cardX = 138, cardY = 70, cardW = 204, cardH = 232;
  const previewSize = 172;
  const previewX = cardX + (cardW - previewSize) / 2;
  const previewY = cardY + 16;
  const cellSize = previewSize / Math.max(rows, cols);
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;
  const gridStartX = previewX + (previewSize - gridW) / 2;
  const gridStartY = previewY + (previewSize - gridH) / 2;

  // 渐变背景色（取前 3 种颜色）
  const gradColors = colors.slice(0, 3).map(c => c.hex);

  // 生成像素块
  const rects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v > 0 && v <= colors.length) {
        const x = (gridStartX + c * cellSize).toFixed(1);
        const y = (gridStartY + r * cellSize).toFixed(1);
        const w = cellSize.toFixed(1);
        const h = cellSize.toFixed(1);
        const fill = colors[v - 1].hex;
        rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="0.5"/>`);
      }
    }
  }

  // 装饰粒子
  const particles = [];
  for (let i = 0; i < 6; i++) {
    const px = 40 + i * 73;
    const py = 30 + i * 47;
    const pr = 3 + (i % 3);
    const pc = gradColors[i % gradColors.length];
    particles.push(`<circle cx="${px}" cy="${py}" r="${pr}" fill="${pc}" opacity="0.25"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360">
  <defs>
    <linearGradient id="bg${id.replace(/-/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradColors[0]}" stop-opacity="0.18"/>
      <stop offset="50%" stop-color="${gradColors[1] || gradColors[0]}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${gradColors[2] || gradColors[0]}" stop-opacity="0.18"/>
    </linearGradient>
    <linearGradient id="card${id.replace(/-/g, '')}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#f5f5f7" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <rect width="480" height="360" fill="url(#bg${id.replace(/-/g, '')})"/>
  <rect width="480" height="360" fill="${gradColors[0]}" opacity="0.04"/>
  ${particles.join('\n  ')}
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="18" fill="url(#card${id.replace(/-/g, '')})" stroke="#d2d2d7" stroke-width="1"/>
  ${rects.join('')}
  <rect x="390" y="20" width="70" height="22" rx="11" fill="#ff3b30"/>
  <text x="425" y="35" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" fill="#ffffff" text-anchor="middle">HARD</text>
  <text x="240" y="286" font-family="-apple-system, 'PingFang SC', sans-serif" font-size="16" font-weight="600" fill="#1d1d1f" text-anchor="middle">${name}</text>
  <text x="240" y="304" font-family="-apple-system, sans-serif" font-size="11" font-weight="400" fill="#86868b" text-anchor="middle">${beadCount} beads · ${rows}×${cols}</text>
</svg>
`;

  return svg;
}

// 主函数
function main() {
  let count = 0;
  for (const id of NEW_IDS) {
    // 从对应分类 JSON 找到模板
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
  console.log(`\nTotal: ${count} covers generated`);
}

main();
