/**
 * 预设形状库
 *
 * 每个形状用字符串数组定义（'#' = 填充, '.' = 空白），
 * 运行时转为 number[][]（1 = 填充, 0 = 空白）。
 * 盖印到编辑器网格时，1 会被替换为当前选中的颜色索引。
 */

export interface PresetShapeDef {
  id: string;
  /** i18n key: `editor.shapeLib.{id}` */
  nameKey: string;
  emoji: string;
  category: 'geo' | 'symbol' | 'letter' | 'number';
  /** 位图：'#' = 填充, '.' = 空白 */
  bitmap: string[];
}

const SHAPES: PresetShapeDef[] = [
  // ---------- 几何 ----------
  {
    id: 'triangle',
    nameKey: 'editor.shapeLib.triangle',
    emoji: '🔺',
    category: 'geo',
    bitmap: [
      '...#...',
      '..###..',
      '.#####.',
      '#######',
    ],
  },
  {
    id: 'hexagon',
    nameKey: 'editor.shapeLib.hexagon',
    emoji: '⬡',
    category: 'geo',
    bitmap: [
      '.####.',
      '######',
      '######',
      '######',
      '.####.',
    ],
  },
  {
    id: 'cross',
    nameKey: 'editor.shapeLib.cross',
    emoji: '✚',
    category: 'geo',
    bitmap: [
      '..#..',
      '..#..',
      '#####',
      '..#..',
      '..#..',
    ],
  },
  {
    id: 'arrowUp',
    nameKey: 'editor.shapeLib.arrowUp',
    emoji: '⬆',
    category: 'geo',
    bitmap: [
      '..#..',
      '.###.',
      '#####',
      '..#..',
      '..#..',
    ],
  },
  {
    id: 'arrowRight',
    nameKey: 'editor.shapeLib.arrowRight',
    emoji: '➡',
    category: 'geo',
    bitmap: [
      '..#..',
      '..##.',
      '#####',
      '..##.',
      '..#..',
    ],
  },
  {
    id: 'ring',
    nameKey: 'editor.shapeLib.ring',
    emoji: '⭕',
    category: 'geo',
    bitmap: [
      '.###.',
      '#...#',
      '#...#',
      '#...#',
      '.###.',
    ],
  },
  // ---------- 符号 ----------
  {
    id: 'sun',
    nameKey: 'editor.shapeLib.sun',
    emoji: '☀',
    category: 'symbol',
    bitmap: [
      '..#.#..',
      '#.###.#',
      '.#####.',
      '#.###.#',
      '..#.#..',
    ],
  },
  {
    id: 'moon',
    nameKey: 'editor.shapeLib.moon',
    emoji: '🌙',
    category: 'symbol',
    bitmap: [
      '..###.',
      '.#...#',
      '.#....',
      '.#...#',
      '..###.',
    ],
  },
  {
    id: 'cloud',
    nameKey: 'editor.shapeLib.cloud',
    emoji: '☁',
    category: 'symbol',
    bitmap: [
      '..##..',
      '.####.',
      '######',
      '######',
      '.####.',
    ],
  },
  {
    id: 'tree',
    nameKey: 'editor.shapeLib.tree',
    emoji: '🌲',
    category: 'symbol',
    bitmap: [
      '..#..',
      '.###.',
      '#####',
      '..#..',
      '..#..',
    ],
  },
  {
    id: 'bolt',
    nameKey: 'editor.shapeLib.bolt',
    emoji: '⚡',
    category: 'symbol',
    bitmap: [
      '..##.',
      '.#...',
      '###..',
      '.#...',
      '#....',
    ],
  },
  {
    id: 'crown',
    nameKey: 'editor.shapeLib.crown',
    emoji: '👑',
    category: 'symbol',
    bitmap: [
      '#...#',
      '##.##',
      '#####',
      '#####',
      '#####',
    ],
  },
  {
    id: 'music',
    nameKey: 'editor.shapeLib.music',
    emoji: '🎵',
    category: 'symbol',
    bitmap: [
      '..###.',
      '..#..#',
      '..#..#',
      '.#...#',
      '.#....',
      '###...',
    ],
  },
  {
    id: 'key',
    nameKey: 'editor.shapeLib.key',
    emoji: '🔑',
    category: 'symbol',
    bitmap: [
      '.###.',
      '#...#',
      '.#.#.',
      '..#..',
      '..##.',
      '..##.',
    ],
  },
  // ---------- 字母 ----------
  {
    id: 'letterA',
    nameKey: 'editor.shapeLib.letterA',
    emoji: 'A',
    category: 'letter',
    bitmap: [
      '.###.',
      '#...#',
      '#####',
      '#...#',
      '#...#',
    ],
  },
  {
    id: 'letterH',
    nameKey: 'editor.shapeLib.letterH',
    emoji: 'H',
    category: 'letter',
    bitmap: [
      '#...#',
      '#...#',
      '#####',
      '#...#',
      '#...#',
    ],
  },
  {
    id: 'letterI',
    nameKey: 'editor.shapeLib.letterI',
    emoji: 'I',
    category: 'letter',
    bitmap: [
      '#####',
      '..#..',
      '..#..',
      '..#..',
      '#####',
    ],
  },
  {
    id: 'letterO',
    nameKey: 'editor.shapeLib.letterO',
    emoji: 'O',
    category: 'letter',
    bitmap: [
      '.###.',
      '#...#',
      '#...#',
      '#...#',
      '.###.',
    ],
  },
  {
    id: 'letterX',
    nameKey: 'editor.shapeLib.letterX',
    emoji: 'X',
    category: 'letter',
    bitmap: [
      '#...#',
      '.#.#.',
      '..#..',
      '.#.#.',
      '#...#',
    ],
  },
  // ---------- 数字 ----------
  {
    id: 'num0',
    nameKey: 'editor.shapeLib.num0',
    emoji: '0',
    category: 'number',
    bitmap: [
      '.###.',
      '#..##',
      '#.#.#',
      '##..#',
      '.###.',
    ],
  },
  {
    id: 'num1',
    nameKey: 'editor.shapeLib.num1',
    emoji: '1',
    category: 'number',
    bitmap: [
      '..#..',
      '.##..',
      '..#..',
      '..#..',
      '.###.',
    ],
  },
  {
    id: 'num2',
    nameKey: 'editor.shapeLib.num2',
    emoji: '2',
    category: 'number',
    bitmap: [
      '.###.',
      '#...#',
      '..##.',
      '.#...',
      '#####',
    ],
  },
  {
    id: 'num5',
    nameKey: 'editor.shapeLib.num5',
    emoji: '5',
    category: 'number',
    bitmap: [
      '#####',
      '#....',
      '####.',
      '....#',
      '####.',
    ],
  },
  {
    id: 'num8',
    nameKey: 'editor.shapeLib.num8',
    emoji: '8',
    category: 'number',
    bitmap: [
      '.###.',
      '#...#',
      '.###.',
      '#...#',
      '.###.',
    ],
  },
];

export const PRESET_SHAPE_DEFS = SHAPES;

export const PRESET_SHAPE_CATEGORIES: { id: PresetShapeDef['category']; labelKey: string }[] = [
  { id: 'geo', labelKey: 'editor.shapeLib.cat.geo' },
  { id: 'symbol', labelKey: 'editor.shapeLib.cat.symbol' },
  { id: 'letter', labelKey: 'editor.shapeLib.cat.letter' },
  { id: 'number', labelKey: 'editor.shapeLib.cat.number' },
];

/** 把位图转为 number[][]（1 = 填充） */
export function bitmapToGrid(bitmap: string[]): number[][] {
  return bitmap.map(row =>
    row.split('').map(ch => (ch === '#' ? 1 : 0))
  );
}

/**
 * 把预设形状盖印到目标网格的指定位置。
 * 形状中的 1 会被替换为 value（当前选中颜色），0 保持原网格内容不变。
 *
 * @param grid 目标网格
 * @param bitmap 形状位图
 * @param startRow 盖印起点行（网格坐标）
 * @param startCol 盖印起点列（网格坐标）
 * @param value 要盖印的颜色索引
 * @returns 新网格
 */
export function stampShape(
  grid: number[][],
  bitmap: string[],
  startRow: number,
  startCol: number,
  value: number
): number[][] {
  const next = grid.map(row => [...row]);
  const rows = next.length;
  const cols = rows > 0 ? next[0].length : 0;
  for (let br = 0; br < bitmap.length; br++) {
    for (let bc = 0; bc < bitmap[br].length; bc++) {
      if (bitmap[br][bc] !== '#') continue;
      const r = startRow + br;
      const c = startCol + bc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        next[r][c] = value;
      }
    }
  }
  return next;
}

/**
 * 把形状盖印到网格中央。
 */
export function stampShapeCenter(
  grid: number[][],
  bitmap: string[],
  value: number
): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const shapeRows = bitmap.length;
  const shapeCols = bitmap[0]?.length ?? 0;
  const startRow = Math.floor((rows - shapeRows) / 2);
  const startCol = Math.floor((cols - shapeCols) / 2);
  return stampShape(grid, bitmap, startRow, startCol, value);
}

/**
 * 按 id 获取预设形状定义。
 */
export function getPresetShapeById(id: string): PresetShapeDef | undefined {
  return SHAPES.find(s => s.id === id);
}
