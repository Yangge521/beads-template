import type { BeadTemplate } from '../types/bead';

/**
 * 把模板的 grid 渲染到 canvas 并导出为 PNG 文件。
 * @param template 拼豆模板
 * @param cellSize 每格像素大小（默认 24px）
 * @param withGridLines 是否绘制网格线
 */
export function exportTemplateToPNG(
  template: BeadTemplate,
  cellSize = 24,
  withGridLines = false
): void {
  const { grid, colors, name } = template;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return;

  const canvas = document.createElement('canvas');
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 透明背景（不填白底，保留透明）
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v <= 0) continue;
      const color = colors[v - 1];
      if (!color) continue;
      ctx.fillStyle = color.hex;
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }

  // 网格线
  if (withGridLines) {
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize + 0.5);
      ctx.lineTo(cols * cellSize, r * cellSize + 0.5);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize + 0.5, 0);
      ctx.lineTo(c * cellSize + 0.5, rows * cellSize);
      ctx.stroke();
    }
  }

  // 触发下载
  canvas.toBlob(
    blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name || template.id}-拼豆图案.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 延迟释放，避免下载未开始就被 revoke
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    'image/png'
  );
}
