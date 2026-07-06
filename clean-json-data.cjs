/**
 * 清理 JSON 模板数据：
 * 1. 删除 colors 数组中未被 grid 引用的项（死色卡）
 * 2. 重新映射 grid 中的颜色索引（保持连续）
 * 3. 重算 beadCount（非空格子数）
 * 4. 重算 colors[].count
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'src', 'data');
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

let totalCleaned = 0;
let totalBeadCountFixed = 0;
let totalDeadColors = 0;

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let fileCleaned = 0;
  let fileDeadColors = 0;
  let fileBeadCountFixed = 0;

  for (const tpl of arr) {
    const grid = tpl.grid;
    if (!Array.isArray(grid) || grid.length === 0) continue;
    const rows = grid.length;
    const cols = grid[0].length;

    // 找出 grid 中实际使用的颜色索引（1-based）
    const usedSet = new Set();
    for (const row of grid) {
      for (const v of row) {
        if (v > 0) usedSet.add(v);
      }
    }
    const usedIndices = Array.from(usedSet).sort((a, b) => a - b);

    // 检测死色卡
    const oldColorsLen = tpl.colors.length;
    const deadCount = oldColorsLen - usedIndices.length;
    if (deadCount > 0) {
      // 构建索引映射：旧索引 -> 新索引
      const indexMap = new Map();
      usedIndices.forEach((oldIdx, newIdx) => {
        indexMap.set(oldIdx, newIdx + 1);
      });

      // 过滤 colors 数组
      tpl.colors = usedIndices.map(oldIdx => tpl.colors[oldIdx - 1]);

      // 重新映射 grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = grid[r][c];
          if (v > 0) {
            grid[r][c] = indexMap.get(v) || 0;
          }
        }
      }
      fileDeadColors += deadCount;
    }

    // 重算 beadCount
    let realBeadCount = 0;
    for (const row of grid) {
      for (const v of row) {
        if (v > 0) realBeadCount++;
      }
    }
    if (tpl.beadCount !== realBeadCount) {
      tpl.beadCount = realBeadCount;
      fileBeadCountFixed++;
    }

    // 重算 colors[].count
    const counts = new Array(tpl.colors.length).fill(0);
    for (const row of grid) {
      for (const v of row) {
        if (v > 0 && v <= counts.length) counts[v - 1]++;
      }
    }
    tpl.colors.forEach((c, i) => { c.count = counts[i]; });

    if (deadCount > 0) fileCleaned++;
  }

  if (fileCleaned > 0 || fileBeadCountFixed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
    console.log(`${file}: ${fileCleaned} templates cleaned (${fileDeadColors} dead colors removed), ${fileBeadCountFixed} beadCount fixed`);
    totalCleaned += fileCleaned;
    totalDeadColors += fileDeadColors;
    totalBeadCountFixed += fileBeadCountFixed;
  }
}

console.log(`\nTotal: ${totalCleaned} templates cleaned, ${totalDeadColors} dead colors removed, ${totalBeadCountFixed} beadCount fixed`);
