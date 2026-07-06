/**
 * 生成 hard 级别高复杂度模板
 * - 32x32 网格（1024 格）
 * - 14-16 种颜色
 * - 程序化生成有意义的对称/渐变图案
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'src', 'data');

// ============ 调色板（每个分类一套） ============
const PALETTES = {
  animals: [
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#1A1A1A' },
    { name: '深棕', hex: '#5D4037' },
    { name: '浅棕', hex: '#A1887F' },
    { name: '橙色', hex: '#FF8C42' },
    { name: '黄色', hex: '#F4D03F' },
    { name: '红色', hex: '#E74C3C' },
    { name: '粉色', hex: '#FFB6C1' },
    { name: '绿色', hex: '#66BB6A' },
    { name: '深绿', hex: '#2E7D32' },
    { name: '蓝色', hex: '#42A5F5' },
    { name: '深蓝', hex: '#1565C0' },
    { name: '紫色', hex: '#8E44AD' },
    { name: '灰色', hex: '#9E9E9E' },
  ],
  anime: [
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#1A1A1A' },
    { name: '深蓝', hex: '#1E3A8A' },
    { name: '蓝色', hex: '#3B82F6' },
    { name: '浅蓝', hex: '#93C5FD' },
    { name: '橙色', hex: '#FB923C' },
    { name: '黄色', hex: '#FBBF24' },
    { name: '红色', hex: '#EF4444' },
    { name: '粉色', hex: '#EC4899' },
    { name: '紫色', hex: '#A855F7' },
    { name: '绿色', hex: '#22C55E' },
    { name: '深绿', hex: '#15803D' },
    { name: '棕色', hex: '#92400E' },
    { name: '肤色', hex: '#FED7AA' },
    { name: '灰色', hex: '#9CA3AF' },
  ],
  food: [
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#1A1A1A' },
    { name: '奶油', hex: '#FFF8DC' },
    { name: '黄色', hex: '#F4D03F' },
    { name: '橙色', hex: '#FF8C42' },
    { name: '红色', hex: '#E74C3C' },
    { name: '粉色', hex: '#FFB6C1' },
    { name: '棕色', hex: '#8D6E63' },
    { name: '深棕', hex: '#4E342E' },
    { name: '绿色', hex: '#66BB6A' },
    { name: '深绿', hex: '#2E7D32' },
    { name: '蓝色', hex: '#42A5F5' },
    { name: '紫色', hex: '#8E44AD' },
    { name: '金色', hex: '#FFD700' },
  ],
  pokemon: [
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#1A1A1A' },
    { name: '红色', hex: '#EF4444' },
    { name: '橙色', hex: '#FB923C' },
    { name: '黄色', hex: '#FBBF24' },
    { name: '绿色', hex: '#22C55E' },
    { name: '深绿', hex: '#15803D' },
    { name: '蓝色', hex: '#3B82F6' },
    { name: '深蓝', hex: '#1E40AF' },
    { name: '浅蓝', hex: '#7DD3FC' },
    { name: '紫色', hex: '#A855F7' },
    { name: '粉色', hex: '#EC4899' },
    { name: '棕色', hex: '#92400E' },
    { name: '灰色', hex: '#9CA3AF' },
    { name: '金色', hex: '#FFD700' },
  ],
  abstract: [
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#000000' },
    { name: '红色', hex: '#E74C3C' },
    { name: '橙色', hex: '#FF8C42' },
    { name: '黄色', hex: '#F4D03F' },
    { name: '绿色', hex: '#66BB6A' },
    { name: '青色', hex: '#26C6DA' },
    { name: '蓝色', hex: '#42A5F5' },
    { name: '深蓝', hex: '#1565C0' },
    { name: '紫色', hex: '#8E44AD' },
    { name: '粉色', hex: '#EC4899' },
    { name: '灰色', hex: '#9E9E9E' },
    { name: '棕色', hex: '#795548' },
    { name: '金色', hex: '#FFD700' },
  ],
  nature: [
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#1A1A1A' },
    { name: '深蓝', hex: '#0F172A' },
    { name: '蓝色', hex: '#3B82F6' },
    { name: '浅蓝', hex: '#93C5FD' },
    { name: '青色', hex: '#06B6D4' },
    { name: '绿色', hex: '#22C55E' },
    { name: '深绿', hex: '#15803D' },
    { name: '黄色', hex: '#FBBF24' },
    { name: '橙色', hex: '#FB923C' },
    { name: '红色', hex: '#EF4444' },
    { name: '紫色', hex: '#A855F7' },
    { name: '粉色', hex: '#EC4899' },
    { name: '灰色', hex: '#6B7280' },
    { name: '棕色', hex: '#92400E' },
  ],
  pixel3d: [
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#1A1A1A' },
    { name: '深灰', hex: '#374151' },
    { name: '灰色', hex: '#9CA3AF' },
    { name: '浅灰', hex: '#E5E7EB' },
    { name: '红色', hex: '#EF4444' },
    { name: '橙色', hex: '#FB923C' },
    { name: '黄色', hex: '#FBBF24' },
    { name: '绿色', hex: '#22C55E' },
    { name: '蓝色', hex: '#3B82F6' },
    { name: '深蓝', hex: '#1E40AF' },
    { name: '紫色', hex: '#A855F7' },
    { name: '棕色', hex: '#92400E' },
    { name: '青色', hex: '#06B6D4' },
  ],
};

// ============ 图案生成器 ============
const SIZE = 32;

/** 空网格 */
function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

/** 设置像素 */
function setCell(grid, x, y, c) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  grid[y][x] = c;
}

/** 填充矩形区域 */
function fillRect(grid, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setCell(grid, x, y, c);
  }
}

/** 填充圆形（实心） */
function fillCircle(grid, cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setCell(grid, x, y, c);
    }
  }
}

/** 填充圆环 */
function fillRing(grid, cx, cy, rOut, rIn, c) {
  for (let y = Math.floor(cy - rOut); y <= Math.ceil(cy + rOut); y++) {
    for (let x = Math.floor(cx - rOut); x <= Math.ceil(cx + rOut); x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= rOut * rOut && d2 >= rIn * rIn) setCell(grid, x, y, c);
    }
  }
}

/** 画线段（Bresenham） */
function drawLine(grid, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  while (true) {
    setCell(grid, x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

/** 对称填充：水平镜像 */
function mirrorH(grid) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE / 2; x++) {
      grid[y][SIZE - 1 - x] = grid[y][x];
    }
  }
}

/** 对称填充：垂直镜像 */
function mirrorV(grid) {
  for (let y = 0; y < SIZE / 2; y++) {
    for (let x = 0; x < SIZE; x++) {
      grid[SIZE - 1 - y][x] = grid[y][x];
    }
  }
}

/** 渐变填充（基于位置选颜色） */
function gradientFill(grid, colors, colorAt) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (grid[y][x] === 0) {
        const idx = colorAt(x, y);
        if (idx >= 0) grid[y][x] = idx;
      }
    }
  }
}

/** 计算非空格数 */
function countBeads(grid) {
  let n = 0;
  for (const row of grid) for (const v of row) if (v > 0) n++;
  return n;
}

// ============ 各分类图案 ============

/** 狮子头：圆形脸 + 鬃毛辐射 */
function genLion(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 16;
  // 鬃毛：8 个方向的辐射线
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const ex = Math.round(cx + Math.cos(ang) * 14);
    const ey = Math.round(cy + Math.sin(ang) * 14);
    drawLine(g, cx, cy, ex, ey, 4); // 深棕鬃毛
  }
  // 鬃毛点缀
  for (let i = 0; i < 32; i++) {
    const ang = (i / 32) * Math.PI * 2;
    const r = 13 + (i % 2);
    const x = Math.round(cx + Math.cos(ang) * r);
    const y = Math.round(cy + Math.sin(ang) * r);
    setCell(g, x, y, 5); // 橙色点缀
  }
  // 脸：圆形
  fillCircle(g, cx, cy, 9, 1); // 白色脸
  // 耳朵
  fillCircle(g, cx - 8, cy - 8, 2, 5);
  fillCircle(g, cx + 8, cy - 8, 2, 5);
  // 眼睛
  fillCircle(g, cx - 3, cy - 1, 1, 2);
  fillCircle(g, cx + 3, cy - 1, 1, 2);
  // 鼻子
  fillCircle(g, cx, cy + 2, 1, 7);
  // 嘴巴
  drawLine(g, cx, cy + 3, cx - 2, cy + 5, 2);
  drawLine(g, cx, cy + 3, cx + 2, cy + 5, 2);
  return g;
}

/** 孔雀开屏：扇形尾羽 + 身体 */
function genPeacock(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 22;
  // 扇形尾羽：多层同心弧
  for (let r = 6; r <= 14; r += 2) {
    for (let a = -Math.PI / 2 - Math.PI / 3; a <= -Math.PI / 2 + Math.PI / 3; a += 0.05) {
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      setCell(g, x, y, (r / 2) % 3 === 0 ? 11 : 8); // 蓝/绿交替
    }
  }
  // 眼斑（尾羽末端）
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 - Math.PI / 4 + (i * Math.PI / 2) / 4;
    const x = Math.round(cx + Math.cos(ang) * 13);
    const y = Math.round(cy + Math.sin(ang) * 13);
    fillCircle(g, x, y, 2, 6); // 绿外圈
    fillCircle(g, x, y, 1, 11); // 蓝内圈
    setCell(g, x, y, 8); // 深蓝中心
  }
  // 身体
  fillCircle(g, cx, cy + 2, 3, 8);
  // 头部
  fillCircle(g, cx, cy - 2, 2, 11);
  // 眼睛
  setCell(g, cx, cy - 2, 2);
  return g;
}

/** 巨龙：龙首 + 鬃毛 */
function genDragon(palette) {
  const g = emptyGrid();
  // 龙头轮廓
  fillRect(g, 6, 8, 24, 20, 1); // 白色基底
  // 龙角
  drawLine(g, 8, 8, 4, 2, 4);
  drawLine(g, 24, 8, 28, 2, 4);
  // 鬃毛（头顶）
  for (let x = 10; x <= 22; x += 2) {
    drawLine(g, x, 8, x, 4, 6); // 绿色鬃毛
  }
  // 眼睛
  fillRect(g, 9, 12, 12, 14, 2);
  fillRect(g, 19, 12, 22, 14, 2);
  // 瞳孔（红色）
  setCell(g, 10, 13, 7);
  setCell(g, 20, 13, 7);
  // 鼻孔
  fillRect(g, 14, 16, 16, 17, 4);
  // 嘴巴 + 獠牙
  drawLine(g, 8, 19, 22, 19, 2);
  setCell(g, 9, 19, 1);
  setCell(g, 21, 19, 1);
  // 鳞片纹理
  for (let y = 10; y < 18; y += 2) {
    for (let x = 7 + (y % 4); x < 24; x += 4) {
      setCell(g, x, y, 13); // 灰色鳞片
    }
  }
  return g;
}

/** 凤凰：展翅 + 火焰尾 */
function genPhoenix(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 14;
  // 翅膀：左右对称
  for (let i = 0; i < 10; i++) {
    const y = cy - 5 + i;
    const w = 8 + Math.abs(5 - i);
    drawLine(g, cx - w, y, cx - 2, y, 7); // 红色左翅
    drawLine(g, cx + 2, y, cx + w, y, 7); // 红色右翅
  }
  // 翅膀尖端：橙色
  for (let i = 0; i < 5; i++) {
    const y = cy - 5 + i * 2;
    setCell(g, cx - 12, y, 5);
    setCell(g, cx + 12, y, 5);
    setCell(g, cx - 13, y + 1, 8); // 深蓝点缀
    setCell(g, cx + 13, y + 1, 8);
  }
  // 身体
  fillCircle(g, cx, cy, 3, 7);
  // 头部
  fillCircle(g, cx, cy - 5, 2, 5); // 橙色头
  // 眼睛
  setCell(g, cx, cy - 5, 2);
  // 喙
  setCell(g, cx, cy - 7, 6);
  // 尾羽：火焰
  for (let i = 0; i < 6; i++) {
    const x = cx - 5 + i * 2;
    drawLine(g, x, cy + 4, x, cy + 12 + (i % 3), i % 2 === 0 ? 7 : 5);
  }
  // 尾羽末端
  for (let i = 0; i < 6; i++) {
    const x = cx - 5 + i * 2;
    setCell(g, x, cy + 12 + (i % 3), 8); // 金色尖端
  }
  return g;
}

/** 千与千寻：无脸男 + 千寻剪影 */
function genSpirited(palette) {
  const g = emptyGrid();
  // 背景：渐变（紫到蓝）
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const t = y / SIZE;
      g[y][x] = t < 0.5 ? 10 : 8; // 紫色 / 深蓝
    }
  }
  // 无脸男（居中黑色剪影）
  fillRect(g, 12, 6, 20, 26, 2); // 黑色身体
  // 面具（白色）
  fillRect(g, 13, 10, 19, 14, 1);
  // 嘴巴（紫色）
  fillRect(g, 14, 12, 18, 13, 10);
  // 眼睛
  setCell(g, 14, 11, 2);
  setCell(g, 18, 11, 2);
  // 千寻（右侧剪影，红色）
  fillRect(g, 23, 14, 27, 26, 7);
  // 头部
  fillCircle(g, 25, 12, 2, 13); // 肤色
  // 头发（棕色）
  fillRect(g, 23, 10, 27, 11, 12);
  // 灯笼（左上角，黄色）
  fillCircle(g, 6, 6, 2, 6);
  // 星星点缀
  setCell(g, 4, 4, 6);
  setCell(g, 28, 4, 6);
  setCell(g, 4, 20, 6);
  return g;
}

/** 火影忍者：漩涡鸣人头像 */
function genNaruto(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 16;
  // 脸
  fillCircle(g, cx, cy, 10, 13); // 肤色
  // 头发（黄色，刺猬状）
  for (let i = 0; i < 16; i++) {
    const ang = -Math.PI / 2 - Math.PI / 3 + (i * Math.PI * 2 / 3) / 15;
    const x0 = Math.round(cx + Math.cos(ang) * 8);
    const y0 = Math.round(cy + Math.sin(ang) * 8);
    const x1 = Math.round(cx + Math.cos(ang) * 12);
    const y1 = Math.round(cy + Math.sin(ang) * 12);
    drawLine(g, x0, y0, x1, y1, 6); // 黄色头发
  }
  // 头带（蓝色）
  fillRect(g, cx - 10, cy - 5, cx + 10, cy - 3, 8);
  // 木叶标志（银色）
  setCell(g, cx - 1, cy - 4, 1);
  setCell(g, cx, cy - 4, 1);
  setCell(g, cx + 1, cy - 4, 1);
  // 眼睛（蓝色）
  fillRect(g, cx - 5, cy - 1, cx - 3, cy + 1, 8);
  fillRect(g, cx + 3, cy - 1, cx + 5, cy + 1, 8);
  // 瞳孔（黑色）
  setCell(g, cx - 4, cy, 2);
  setCell(g, cx + 4, cy, 2);
  // 胡须（三道线）
  for (let i = 0; i < 3; i++) {
    drawLine(g, cx - 9, cy + 3 + i, cx - 5, cy + 3 + i, 4);
    drawLine(g, cx + 5, cy + 3 + i, cx + 9, cy + 3 + i, 4);
  }
  // 嘴巴
  drawLine(g, cx - 1, cy + 5, cx + 1, cy + 5, 2);
  return g;
}

/** 海贼王：路飞草帽头像 */
function genLuffy(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 18;
  // 草帽（黄色）
  fillRect(g, 4, 6, 28, 9, 6);
  fillRect(g, 8, 4, 24, 6, 6);
  // 帽带（红色）
  fillRect(g, 4, 9, 28, 10, 7);
  // 脸
  fillCircle(g, cx, cy, 8, 13);
  // 头发（黑色，两侧）
  fillRect(g, 6, 14, 8, 22, 2);
  fillRect(g, 24, 14, 26, 22, 2);
  // 眼睛
  fillRect(g, cx - 5, cy - 2, cx - 3, cy, 2);
  fillRect(g, cx + 3, cy - 2, cx + 5, cy, 2);
  // 笑容（大嘴）
  for (let i = 0; i < 5; i++) {
    setCell(g, cx - 4 + i, cy + 4, 2);
  }
  // 疤痕
  drawLine(g, cx - 6, cy - 3, cx - 6, cy + 1, 7);
  return g;
}

/** 鬼灭之刃：炭治郎 + 水之呼吸 */
function genDemon(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 16;
  // 背景：深蓝渐变
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      g[y][x] = y < 16 ? 8 : 9; // 深蓝 / 浅蓝
    }
  }
  // 水波纹（青色）
  for (let r = 4; r < 16; r += 3) {
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        if (Math.random() > 0.5) setCell(g, x, y, 11); // 青色
      }
    }
  }
  // 人物剪影（黑色）
  fillRect(g, 12, 8, 20, 24, 2);
  // 头部
  fillCircle(g, 16, 10, 3, 13); // 肤色
  // 头发（黑色）
  fillRect(g, 13, 7, 19, 9, 2);
  // 眼睛（红色）
  setCell(g, 15, 10, 7);
  setCell(g, 17, 10, 7);
  // 刀（白色刀光）
  drawLine(g, 0, 28, 12, 16, 1);
  // 水滴
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(Math.random() * SIZE);
    const y = Math.floor(Math.random() * SIZE);
    if (g[y][x] !== 2 && g[y][x] !== 13) setCell(g, x, y, 11);
  }
  return g;
}

/** 超梦：紫色人形 */
function genMewtwo(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 16;
  // 身体（紫色）
  fillRect(g, 12, 10, 20, 24, 11);
  // 头部
  fillCircle(g, cx, cy - 4, 4, 11);
  // 颈部连接
  fillRect(g, cx - 2, cy, cx + 2, cy + 2, 11);
  // 眼睛（黑色）
  setCell(g, cx - 2, cy - 5, 2);
  setCell(g, cx + 2, cy - 5, 2);
  // 尾巴（弯曲紫色）
  drawLine(g, cx, cy + 8, cx - 8, cy + 14, 11);
  drawLine(g, cx - 8, cy + 14, cx - 4, cy + 10, 11);
  drawLine(g, cx - 4, cy + 10, cx, cy + 8, 11);
  // 手臂
  drawLine(g, cx - 4, cy + 2, cx - 8, cy + 6, 11);
  drawLine(g, cx + 4, cy + 2, cx + 8, cy + 6, 11);
  // 肚子（浅紫）
  fillCircle(g, cx, cy + 4, 2, 10);
  // 能量球（蓝色）
  fillCircle(g, cx, cy - 8, 2, 8);
  fillCircle(g, cx, cy - 8, 1, 11);
  return g;
}

/** 喷火龙：橙色龙 */
function genCharizard(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 16;
  // 身体（橙色）
  fillRect(g, 10, 10, 22, 22, 5);
  // 头部
  fillCircle(g, cx, cy - 6, 4, 5);
  // 翅膀（蓝色）
  for (let i = 0; i < 5; i++) {
    drawLine(g, cx - 6, cy - 4 + i, cx - 12, cy - 8 + i * 2, 8);
    drawLine(g, cx + 6, cy - 4 + i, cx + 12, cy - 8 + i * 2, 8);
  }
  // 翅膀膜（浅蓝）
  setCell(g, cx - 10, cy - 4, 9);
  setCell(g, cx + 10, cy - 4, 9);
  // 眼睛
  setCell(g, cx - 2, cy - 7, 2);
  setCell(g, cx + 2, cy - 7, 2);
  // 嘴巴
  drawLine(g, cx - 2, cy - 4, cx + 2, cy - 4, 2);
  // 尾巴火焰
  drawLine(g, cx, cy + 12, cx, cy + 18, 7);
  for (let i = 0; i < 4; i++) {
    setCell(g, cx - 1 + i, cy + 16, 5);
  }
  // 腹部（黄色）
  fillRect(g, cx - 2, cy + 2, cx + 2, cy + 8, 6);
  return g;
}

/** 路卡利欧：蓝色人形 */
function genLucario(palette) {
  const g = emptyGrid();
  const cx = 16, cy = 16;
  // 身体（蓝色）
  fillRect(g, 11, 10, 21, 22, 8);
  // 头部
  fillCircle(g, cx, cy - 6, 4, 8);
  // 耳朵（尖）
  drawLine(g, cx - 4, cy - 10, cx - 6, cy - 14, 8);
  drawLine(g, cx + 4, cy - 10, cx + 6, cy - 14, 8);
  // 面具（黑色）
  fillRect(g, cx - 3, cy - 7, cx + 3, cy - 5, 2);
  // 眼睛（红色）
  setCell(g, cx - 2, cy - 6, 7);
  setCell(g, cx + 2, cy - 6, 7);
  // 胸甲（黄色）
  fillRect(g, cx - 2, cy + 1, cx + 2, cy + 3, 6);
  // 手臂
  drawLine(g, cx - 5, cy + 2, cx - 9, cy + 6, 8);
  drawLine(g, cx + 5, cy + 2, cx + 9, cy + 6, 8);
  // 波导（蓝色能量球）
  fillCircle(g, cx, cy + 8, 2, 9);
  return g;
}

/** 精致蛋糕：多层 + 装饰 */
function genCake(palette) {
  const g = emptyGrid();
  // 底层（棕色）
  fillRect(g, 2, 22, 30, 28, 8);
  // 中层（粉色）
  fillRect(g, 6, 16, 26, 22, 7);
  // 顶层（白色）
  fillRect(g, 10, 10, 22, 16, 1);
  // 蜡烛
  drawLine(g, 16, 4, 16, 10, 14);
  drawLine(g, 16, 4, 16, 10, 14);
  // 火焰
  setCell(g, 16, 2, 5);
  setCell(g, 15, 3, 7);
  setCell(g, 17, 3, 7);
  // 装饰（彩色圆点）
  for (let x = 4; x < 30; x += 3) setCell(g, x, 25, 9);
  for (let x = 8; x < 26; x += 3) setCell(g, x, 19, 6);
  // 樱桃
  fillCircle(g, 16, 9, 1, 7);
  // 奶油花边
  for (let x = 2; x < 30; x += 2) setCell(g, x, 22, 1);
  for (let x = 6; x < 26; x += 2) setCell(g, x, 16, 1);
  return g;
}

/** 寿司拼盘 */
function genSushi(palette) {
  const g = emptyGrid();
  // 盘子（白色）
  fillCircle(g, 16, 16, 14, 1);
  fillRing(g, 16, 16, 14, 12, 13); // 灰色边
  // 三文鱼寿司（左上）
  fillRect(g, 6, 6, 10, 8, 1); // 米饭
  fillRect(g, 6, 4, 10, 6, 5); // 三文鱼
  // 鱼子酱寿司（右上）
  fillRect(g, 22, 6, 26, 8, 1);
  for (let y = 4; y < 6; y++) {
    for (let x = 22; x < 26; x++) setCell(g, x, y, 7);
  }
  // 玉子寿司（左下）
  fillRect(g, 6, 22, 10, 24, 1);
  fillRect(g, 6, 20, 10, 22, 6); // 黄色蛋
  // 鳗鱼寿司（右下）
  fillRect(g, 22, 22, 26, 24, 1);
  fillRect(g, 22, 20, 26, 22, 8); // 深棕鳗鱼
  // 酱油碟
  fillCircle(g, 16, 16, 2, 8);
  // 芥末（绿色）
  setCell(g, 16, 16, 10);
  // 红姜
  for (let i = 0; i < 4; i++) setCell(g, 14 + i, 14, 7);
  return g;
}

/** 满汉全席（简化版） */
function genFeast(palette) {
  const g = emptyGrid();
  // 长桌
  fillRect(g, 2, 14, 30, 18, 13); // 灰色桌布
  // 菜品 1：鱼（蓝色）
  fillCircle(g, 6, 8, 3, 8);
  setCell(g, 6, 8, 2);
  // 菜品 2：鸡（橙色）
  fillCircle(g, 16, 6, 3, 5);
  setCell(g, 16, 6, 7);
  // 菜品 3：蔬菜（绿色）
  fillCircle(g, 26, 8, 3, 10);
  // 菜品 4：汤（黄色）
  fillCircle(g, 6, 24, 3, 6);
  setCell(g, 6, 24, 14);
  // 菜品 5：虾（红色）
  fillCircle(g, 16, 26, 3, 7);
  // 菜品 6：饺子（白色）
  fillCircle(g, 26, 24, 3, 1);
  setCell(g, 26, 24, 6);
  // 中央装饰（金色）
  fillCircle(g, 16, 16, 1, 14);
  // 筷子
  drawLine(g, 0, 12, 31, 12, 8);
  drawLine(g, 0, 20, 31, 20, 8);
  return g;
}

/** 蒙德里安复杂版：多色块 */
function genMondrian2(palette) {
  const g = emptyGrid();
  // 黑色网格线
  for (let x = 0; x < SIZE; x++) { setCell(g, x, 0, 2); setCell(g, x, 10, 2); setCell(g, x, 20, 2); setCell(g, x, 31, 2); }
  for (let y = 0; y < SIZE; y++) { setCell(g, 0, y, 2); setCell(g, 10, y, 2); setCell(g, 21, y, 2); setCell(g, 31, y, 2); }
  // 红色块
  fillRect(g, 1, 1, 9, 9, 3);
  // 黄色块
  fillRect(g, 22, 11, 30, 19, 5);
  // 蓝色块
  fillRect(g, 11, 21, 20, 30, 8);
  // 红色块 2
  fillRect(g, 22, 21, 30, 30, 3);
  // 黄色块 2
  fillRect(g, 11, 1, 20, 9, 5);
  // 蓝色块 2
  fillRect(g, 1, 11, 9, 19, 8);
  return g;
}

/** 达利时钟：融化的时钟 */
function genDali(palette) {
  const g = emptyGrid();
  // 背景：渐变（橙到紫）
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const t = x / SIZE;
      g[y][x] = t < 0.5 ? 4 : 11;
    }
  }
  // 时钟轮廓（融化的椭圆，白色）
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = Math.round(16 + Math.cos(a) * 12);
    const y = Math.round(16 + Math.sin(a) * 6 + (Math.cos(a) > 0 ? 4 : 0));
    setCell(g, x, y, 1);
  }
  // 时刻（12 3 6 9 位置）
  setCell(g, 16, 9, 2);
  setCell(g, 28, 16, 2);
  setCell(g, 16, 23, 2);
  setCell(g, 4, 16, 2);
  // 指针
  drawLine(g, 16, 16, 16, 10, 2);
  drawLine(g, 16, 16, 22, 16, 2);
  // 中心点
  setCell(g, 16, 16, 3);
  return g;
}

/** 毕加索：立体派抽象脸 */
function genPicasso(palette) {
  const g = emptyGrid();
  // 脸轮廓（不规则）
  fillRect(g, 8, 6, 24, 26, 1);
  // 左眼（蓝色，正圆）
  fillCircle(g, 12, 12, 2, 8);
  setCell(g, 12, 12, 2);
  // 右眼（绿色，三角形）
  fillRect(g, 18, 10, 22, 14, 10);
  setCell(g, 20, 12, 2);
  // 鼻子（橙色，弯曲）
  drawLine(g, 16, 12, 14, 18, 4);
  drawLine(g, 14, 18, 18, 18, 4);
  // 嘴巴（红色，歪斜）
  drawLine(g, 12, 22, 20, 22, 3);
  // 装饰色块
  fillRect(g, 8, 6, 14, 8, 3); // 红色帽
  fillRect(g, 18, 6, 24, 8, 5); // 黄色帽
  // 几何线条
  drawLine(g, 8, 16, 24, 16, 2);
  drawLine(g, 16, 6, 16, 26, 2);
  return g;
}

/** 3D 立体龙 */
function gen3dDragon(palette) {
  const g = emptyGrid();
  // 龙身（等距视角）
  for (let i = 0; i < 20; i++) {
    const x = 4 + i;
    const y = 8 + Math.floor(i / 2);
    setCell(g, x, y, 9); // 龙背
    setCell(g, x, y + 1, 8); // 龙腹
  }
  // 龙头
  fillCircle(g, 26, 18, 2, 9);
  setCell(g, 26, 17, 2); // 眼睛
  // 翅膀
  for (let i = 0; i < 6; i++) {
    setCell(g, 10 + i * 2, 4 + i, 8);
    setCell(g, 10 + i * 2, 4 + i + 1, 9);
  }
  // 鳞片
  for (let i = 0; i < 10; i++) {
    setCell(g, 6 + i * 2, 9 + Math.floor(i / 2), 12); // 高光
    setCell(g, 6 + i * 2, 10 + Math.floor(i / 2), 4); // 阴影
  }
  // 火焰
  for (let i = 0; i < 4; i++) {
    setCell(g, 28 + i, 18, 6);
    setCell(g, 28 + i, 17, 3);
  }
  return g;
}

/** 3D 城堡 */
function gen3dCastle(palette) {
  const g = emptyGrid();
  // 地面（绿色）
  fillRect(g, 0, 24, 31, 31, 9);
  // 城墙（灰色）
  fillRect(g, 6, 12, 26, 24, 4);
  // 高光面（浅灰）
  fillRect(g, 6, 12, 10, 24, 5);
  // 阴影面（深灰）
  fillRect(g, 22, 12, 26, 24, 3);
  // 主塔
  fillRect(g, 14, 6, 18, 24, 4);
  fillRect(g, 14, 6, 15, 24, 5); // 高光
  // 塔顶（红色）
  fillRect(g, 13, 4, 19, 6, 6);
  // 城垛
  for (let x = 6; x < 26; x += 2) setCell(g, x, 12, 3);
  // 门（黑色）
  fillRect(g, 14, 18, 18, 24, 2);
  // 窗户
  fillRect(g, 8, 16, 9, 18, 11);
  fillRect(g, 23, 16, 24, 18, 11);
  fillRect(g, 15, 10, 17, 12, 11);
  // 旗杆
  drawLine(g, 16, 2, 16, 4, 2);
  setCell(g, 17, 2, 7); // 旗帜
  return g;
}

/** 极光：渐变天空 */
function genAurora2(palette) {
  const g = emptyGrid();
  // 深空背景
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      g[y][x] = 3; // 深蓝
    }
  }
  // 星星
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * SIZE);
    const y = Math.floor(Math.random() * 16);
    setCell(g, x, y, 1);
  }
  // 极光带（绿色 + 紫色波浪）
  for (let x = 0; x < SIZE; x++) {
    const y1 = 8 + Math.round(Math.sin(x * 0.4) * 3);
    const y2 = 12 + Math.round(Math.sin(x * 0.3) * 3);
    for (let y = y1; y < y2; y++) {
      setCell(g, x, y, 7); // 绿色
    }
    setCell(g, x, y1, 12); // 紫色边缘
    setCell(g, x, y2, 12);
  }
  // 第二层极光（青色）
  for (let x = 0; x < SIZE; x++) {
    const y = 14 + Math.round(Math.sin(x * 0.5 + 1) * 2);
    setCell(g, x, y, 6);
    setCell(g, x, y + 1, 6);
  }
  // 地平线（黑色山脉）
  for (let x = 0; x < SIZE; x++) {
    const h = 4 + Math.floor(Math.sin(x * 0.3) * 2);
    for (let y = SIZE - h; y < SIZE; y++) setCell(g, x, y, 2);
  }
  return g;
}

/** 雪山湖泊：倒影 */
function genMountain2(palette) {
  const g = emptyGrid();
  // 天空渐变
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < SIZE; x++) {
      g[y][x] = y < 6 ? 14 : 9; // 橙到浅蓝
    }
  }
  // 雪山（三角形）
  for (let x = 0; x < SIZE; x++) {
    const h1 = 12 - Math.abs(x - 10);
    const h2 = 10 - Math.abs(x - 22);
    const h = Math.max(h1, h2, 0);
    for (let y = 14 - h; y < 14; y++) {
      setCell(g, x, y, y < 14 - h + 2 ? 1 : 4); // 雪顶 / 山体
    }
  }
  // 湖面（蓝色倒影）
  for (let y = 14; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      g[y][x] = 8; // 深蓝
    }
  }
  // 倒影（浅色）
  for (let x = 0; x < SIZE; x++) {
    const h1 = 12 - Math.abs(x - 10);
    const h2 = 10 - Math.abs(x - 22);
    const h = Math.max(h1, h2, 0);
    for (let y = 14; y < 14 + h && y < SIZE; y++) {
      setCell(g, x, y, y > 14 + h - 2 ? 1 : 9);
    }
  }
  // 水波纹
  for (let x = 0; x < SIZE; x += 3) {
    setCell(g, x, 20, 9);
    setCell(g, x, 24, 9);
  }
  return g;
}

// ============ 模板定义 ============
const TEMPLATES = [
  // animals (4)
  { cat: 'animals', id: 'lion-011', name: '雄狮头', gen: genLion, desc: '雄狮威严正面像，鬃毛辐射展开，鬃毛点缀橙色高光，32x32 高复杂度。' },
  { cat: 'animals', id: 'peacock-012', name: '孔雀开屏', gen: genPeacock, desc: '孔雀开屏扇形尾羽，多层眼斑，蓝绿渐变，32x32 高复杂度。' },
  { cat: 'animals', id: 'dragon-013', name: '巨龙首', gen: genDragon, desc: '巨龙正面头像，龙角、鬃毛、鳞片纹理，红眼獠牙，32x32 高复杂度。' },
  { cat: 'animals', id: 'phoenix-014', name: '凤凰涅槃', gen: genPhoenix, desc: '凤凰展翅造型，火焰尾羽，红橙金渐变，对称构图，32x32 高复杂度。' },
  // anime (4)
  { cat: 'anime', id: 'spirited-012', name: '千与千寻', gen: genSpirited, desc: '千与千寻场景：无脸男 + 千寻剪影，紫蓝渐变背景，灯笼点缀，32x32 高复杂度。' },
  { cat: 'anime', id: 'naruto-013', name: '漩涡鸣人', gen: genNaruto, desc: '火影忍者鸣人头像：刺猬黄发、木叶头带、胡须纹路，32x32 高复杂度。' },
  { cat: 'anime', id: 'luffy-014', name: '草帽路飞', gen: genLuffy, desc: '海贼王路飞：草帽 + 标志性笑容，红色帽带，32x32 高复杂度。' },
  { cat: 'anime', id: 'demon-015', name: '鬼灭之刃', gen: genDemon, desc: '鬼灭之刃炭治郎水之呼吸场景，水波纹环绕人物剪影，32x32 高复杂度。' },
  // food (3)
  { cat: 'food', id: 'cake-011', name: '精致蛋糕', gen: genCake, desc: '三层精致蛋糕：底层巧克力、中层草莓、顶层奶油，彩色装饰，32x32 高复杂度。' },
  { cat: 'food', id: 'sushi-012', name: '寿司拼盘', gen: genSushi, desc: '四种寿司拼盘：三文鱼、鱼子酱、玉子、鳗鱼，芥末红姜点缀，32x32 高复杂度。' },
  { cat: 'food', id: 'feast-013', name: '满汉全席', gen: genFeast, desc: '满汉全席简化版：六菜一汤环绕长桌，鱼鸡虾饺蔬菜，32x32 高复杂度。' },
  // pokemon (3)
  { cat: 'pokemon', id: 'mewtwo-012', name: '超梦', gen: genMewtwo, desc: '超梦造型：紫色人形 + 弯曲尾巴 + 蓝色能量球，32x32 高复杂度。' },
  { cat: 'pokemon', id: 'charizard-013', name: '喷火龙', gen: genCharizard, desc: '喷火龙展翅造型：橙色身躯 + 蓝色翅膀 + 火焰尾巴，32x32 高复杂度。' },
  { cat: 'pokemon', id: 'lucario-014', name: '路卡利欧', gen: genLucario, desc: '路卡利欧造型：蓝色人形 + 尖耳 + 黄色胸甲 + 波导弹，32x32 高复杂度。' },
  // abstract (3)
  { cat: 'abstract', id: 'mondrian2-009', name: '蒙德里安构成 II', gen: genMondrian2, desc: '蒙德里安风格复杂版：多色块分割，红黄蓝三原色对比，32x32 高复杂度。' },
  { cat: 'abstract', id: 'dali-010', name: '达利融化时钟', gen: genDali, desc: '致敬达利《记忆的永恒》：融化时钟 + 渐变天空，32x32 高复杂度。' },
  { cat: 'abstract', id: 'picasso-011', name: '毕加索立体派', gen: genPicasso, desc: '毕加索立体派抽象脸：不对称五官 + 多色块，几何分割，32x32 高复杂度。' },
  // pixel3d (2)
  { cat: 'pixel3d', id: 'dragon3d-011', name: '3D 立体龙', gen: gen3dDragon, desc: '等距视角立体龙：龙身 + 翅膀 + 鳞片高光阴影，32x32 高复杂度。' },
  { cat: 'pixel3d', id: 'castle3d-012', name: '3D 立体城堡', gen: gen3dCastle, desc: '等距视角立体城堡：城墙 + 主塔 + 红色塔顶 + 城垛，32x32 高复杂度。' },
  // nature (2)
  { cat: 'nature', id: 'aurora-009', name: '极光夜空', gen: genAurora2, desc: '极光夜空：双层极光波浪带 + 满天星辰 + 山脉地平线，32x32 高复杂度。' },
  { cat: 'nature', id: 'mountain-010', name: '雪山湖泊', gen: genMountain2, desc: '雪山湖泊倒影：双峰雪山 + 蓝色湖面 + 渐变天空，32x32 高复杂度。' },
];

// ============ 生成 + 写入 ============
function makeTemplate(def) {
  const palette = PALETTES[def.cat];
  const grid = def.gen(palette);
  const beadCount = countBeads(grid);
  const colors = palette.map(c => ({ name: c.name, hex: c.hex }));
  return {
    id: `${def.cat}-${def.id}`,
    name: def.name,
    category: def.cat,
    description: def.desc,
    grid,
    colors,
    beadCount,
    difficulty: 'hard',
    tags: [def.name, '复杂', '32x32'],
    source: '原创设计',
  };
}

// 按分类分组写入
function main() {
  const byCat = {};
  for (const def of TEMPLATES) {
    if (!byCat[def.cat]) byCat[def.cat] = [];
    byCat[def.cat].push(def);
  }

  let totalAdded = 0;
  for (const [cat, defs] of Object.entries(byCat)) {
    const file = path.join(OUT_DIR, `${cat}.json`);
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    const newTemplates = defs.map(makeTemplate);
    existing.push(...newTemplates);
    fs.writeFileSync(file, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`+ ${cat}: ${newTemplates.length} templates (total ${existing.length})`);
    totalAdded += newTemplates.length;
  }
  console.log(`\nTotal added: ${totalAdded} hard templates`);
}

main();
