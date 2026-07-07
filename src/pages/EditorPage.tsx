import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  ArrowLeft, Brush, Eraser, PaintBucket, Pipette, Undo2, Redo2,
  Trash2, Save, Plus, Minus, Grid3x3, Check, X,
  Minus as LineIcon, Square, Circle, SquareDashed, CircleDashed,
  FlipHorizontal, FlipVertical, Grid2x2, Image as ImageIcon,
  RotateCw, RotateCcw, Download
} from 'lucide-react';
import type { BeadTemplate, ColorInfo } from '../types/bead';
import { BEAD_COLOR_GROUPS } from '../data/beadColors';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { useSnapshots } from '../hooks/useSnapshots';
import { useTranslation } from '../context/LanguageContext';
import { useToast } from '../components/ToastContainer';
import EditorHistoryPanel from '../components/EditorHistoryPanel';
import ShapeLibraryPanel from '../components/ShapeLibraryPanel';
import { floodFill, resizeGrid, compactColors, countColorUsage } from '../utils/gridEdit';
import { drawShapeWithSymmetry, paintWithSymmetry } from '../utils/shapeEdit';
import type { ShapeTool, SymmetryMode } from '../utils/shapeEdit';
import { getPresetShapeById, stampShapeCenter } from '../utils/presetShapes';
import { applyTransform, type TransformType } from '../utils/transformGrid';
import { exportTemplateToPNG } from '../utils/exportPNG';
import { exportTemplateToSVG } from '../utils/exportSVG';
import { exportColorListCSV } from '../utils/exportCSV';

type ToolMode = 'paint' | 'erase' | 'fill' | 'picker' | 'line' | 'rect' | 'rectFill' | 'circle' | 'circleFill';

interface EditorPageProps {
  /** 基于现有模板编辑（不传则为空白新建） */
  initialTemplate?: BeadTemplate;
  onBack: () => void;
  onSave: (template: Omit<BeadTemplate, 'id'>) => BeadTemplate;
  onNavigate: (id: string) => void;
}

/** 默认空白网格尺寸 */
const DEFAULT_ROWS = 16;
const DEFAULT_COLS = 16;
/** 色板最大颜色数 */
const MAX_PALETTE = 30;

export default function EditorPage({ initialTemplate, onBack, onSave, onNavigate }: EditorPageProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // 初始化网格与色板
  const initialGrid = initialTemplate?.grid ?? Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill(0));
  const initialColors = initialTemplate?.colors ?? [];

  const { grid, commit, undo, redo, canUndo, canRedo, clearHistory, undoCount, redoCount } = useEditorHistory(initialGrid);
  const { snapshots, addSnapshot, removeSnapshot, clearSnapshots } = useSnapshots();
  const [palette, setPalette] = useState<ColorInfo[]>(initialColors);
  const [selectedColorIdx, setSelectedColorIdx] = useState(1); // 1-based，0 = 空白
  const [toolMode, setToolMode] = useState<ToolMode>('paint');
  const [templateName, setTemplateName] = useState(initialTemplate?.name ?? '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // 对称模式
  const [symmetry, setSymmetry] = useState<SymmetryMode>('none');
  // 参考底图
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  // 导出下拉菜单
  const [showExportMenu, setShowExportMenu] = useState(false);

  // 拖拽绘制状态
  const isDrawing = useRef(false);
  const lastCell = useRef<string>('');
  // 形状绘制起点（用于直线/矩形/圆拖拽）
  const shapeStart = useRef<[number, number] | null>(null);
  // 形状预览网格（拖拽中临时显示）
  const [shapePreview, setShapePreview] = useState<number[][] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const totalBeads = useMemo(() => grid.flat().filter(v => v > 0).length, [grid]);

  // 标记脏状态
  const markDirty = useCallback(() => setIsDirty(true), []);

  // 绘制单个格子（支持对称）
  const paintCell = useCallback((r: number, c: number) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    let next: number[][];
    let newValue: number;
    if (toolMode === 'erase') {
      newValue = 0;
    } else if (toolMode === 'paint') {
      newValue = selectedColorIdx;
    } else {
      return; // fill/picker/shape 不在此处理
    }
    if (symmetry === 'none') {
      next = grid.map(row => [...row]);
      if (next[r][c] === newValue) return;
      next[r][c] = newValue;
    } else {
      next = paintWithSymmetry(grid, r, c, newValue, symmetry);
      if (next === grid) return;
    }
    commit(next);
    markDirty();
  }, [grid, rows, cols, toolMode, selectedColorIdx, symmetry, commit, markDirty]);

  // 形状工具是否激活
  const isShapeTool = toolMode === 'line' || toolMode === 'rect' || toolMode === 'rectFill' || toolMode === 'circle' || toolMode === 'circleFill';

  // 形状预览：拖拽中实时计算
  const updateShapePreview = useCallback((r1: number, c1: number) => {
    const start = shapeStart.current;
    if (!start) return;
    const [r0, c0] = start;
    const shape = toolMode as ShapeTool;
    const preview = drawShapeWithSymmetry(grid, r0, c0, r1, c1, selectedColorIdx, shape, symmetry);
    setShapePreview(preview);
  }, [grid, toolMode, selectedColorIdx, symmetry]);

  // 填充工具
  const handleFill = useCallback((r: number, c: number) => {
    const next = floodFill(grid, r, c, selectedColorIdx);
    if (next === grid) return;
    commit(next);
    markDirty();
  }, [grid, selectedColorIdx, commit, markDirty]);

  // 拾色器
  const handlePick = useCallback((r: number, c: number) => {
    const v = grid[r]?.[c] ?? 0;
    if (v > 0) {
      setSelectedColorIdx(v);
      setToolMode('paint');
      showToast(t('editor.picked', { name: palette[v - 1]?.name ?? '' }), 'success');
    }
  }, [grid, palette, showToast, t]);

  // 格子点击/拖拽处理
  const handleCellDown = useCallback((r: number, c: number) => {
    if (toolMode === 'fill') {
      handleFill(r, c);
      return;
    }
    if (toolMode === 'picker') {
      handlePick(r, c);
      return;
    }
    if (isShapeTool) {
      // 形状工具：记录起点
      shapeStart.current = [r, c];
      isDrawing.current = true;
      return;
    }
    // paint / erase
    isDrawing.current = true;
    lastCell.current = `${r}-${c}`;
    paintCell(r, c);
  }, [toolMode, isShapeTool, handleFill, handlePick, paintCell]);

  const handleCellEnter = useCallback((r: number, c: number) => {
    if (!isDrawing.current) return;
    if (isShapeTool) {
      // 形状拖拽中：更新预览
      updateShapePreview(r, c);
      return;
    }
    const key = `${r}-${c}`;
    if (lastCell.current === key) return;
    lastCell.current = key;
    paintCell(r, c);
  }, [isShapeTool, updateShapePreview, paintCell]);

  const handleMouseUp = useCallback(() => {
    if (isShapeTool && isDrawing.current) {
      // 形状工具松手：提交形状
      // 使用最后预览的终点（通过 shapePreview 反推或用 shapeStart 之外的值）
      // 简化：如果还在拖拽，从 shapePreview 推断终点不可靠，直接用 start 作为单点
      // 更好的方式：在 mouseenter 时记录最后坐标
      const start = shapeStart.current;
      if (start) {
        // 用最后预览网格与当前 grid 比较，找出差异点作为终点
        // 简化方案：直接提交当前 shapePreview
        if (shapePreview) {
          commit(shapePreview);
          markDirty();
        }
        shapeStart.current = null;
        setShapePreview(null);
      }
    }
    isDrawing.current = false;
    lastCell.current = '';
  }, [isShapeTool, shapePreview, commit, markDirty]);

  // 全局 mouseup 监听（离开网格时也能停止）
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+Z 撤销, Ctrl+Y / Ctrl+Shift+Z 重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'b' || e.key === 'B') {
        setToolMode('paint');
      } else if (e.key === 'e' || e.key === 'E') {
        setToolMode('erase');
      } else if (e.key === 'f' || e.key === 'F') {
        setToolMode('fill');
      } else if (e.key === 'i' || e.key === 'I') {
        setToolMode('picker');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // 调整网格尺寸
  const handleResize = useCallback((deltaRows: number, deltaCols: number) => {
    const newRows = Math.max(4, Math.min(64, rows + deltaRows));
    const newCols = Math.max(4, Math.min(64, cols + deltaCols));
    if (newRows === rows && newCols === cols) return;
    const next = resizeGrid(grid, newRows, newCols);
    commit(next);
    markDirty();
  }, [grid, rows, cols, commit, markDirty]);

  // 清空网格
  const handleClear = useCallback(() => {
    if (totalBeads === 0) return;
    if (confirm(t('editor.clearConfirm'))) {
      const next = Array.from({ length: rows }, () => Array(cols).fill(0));
      commit(next);
      markDirty();
    }
  }, [totalBeads, rows, cols, t, commit, markDirty]);

  // 添加颜色到色板
  const handleAddColor = useCallback((hex: string, name: string) => {
    if (palette.length >= MAX_PALETTE) {
      showToast(t('editor.paletteFull', { max: MAX_PALETTE }), 'info');
      return;
    }
    // 去重
    if (palette.some(c => c.hex.toLowerCase() === hex.toLowerCase())) {
      showToast(t('editor.colorExists'), 'info');
      return;
    }
    setPalette(prev => [...prev, { hex, name, count: 0 }]);
    // 自动选中新添加的颜色
    setSelectedColorIdx(palette.length + 1);
    setShowColorPicker(false);
  }, [palette, showToast, t]);

  // 形状库：盖印预设形状到网格中央
  const handleStampShape = useCallback((shapeId: string) => {
    const shape = getPresetShapeById(shapeId);
    if (!shape) return;
    if (palette.length === 0) {
      showToast(t('editor.shapeLib.needColor'), 'info');
      return;
    }
    const next = stampShapeCenter(grid, shape.bitmap, selectedColorIdx);
    commit(next);
    markDirty();
    showToast(t('editor.shapeLib.stamped', { name: t(shape.nameKey) }), 'success');
  }, [grid, palette, selectedColorIdx, commit, markDirty, showToast, t]);

  // 整体变换（翻转/旋转）
  const handleTransform = useCallback((type: TransformType) => {
    const next = applyTransform(grid, type);
    commit(next);
    markDirty();
  }, [grid, commit, markDirty]);

  // 导出当前编辑结果为 PNG/SVG/CSV
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'csv') => {
    if (totalBeads === 0) {
      showToast(t('editor.emptyGrid'), 'info');
      return;
    }
    const { grid: compactedGrid, colors: compactedColors } = compactColors(grid, palette);
    const usage = countColorUsage(compactedGrid);
    const finalColors = compactedColors.map((c, i) => ({ ...c, count: usage.get(i + 1) || 0 }));
    const name = templateName.trim() || t('editor.untitled');
    const tpl: BeadTemplate = {
      id: 'editor-export',
      name,
      category: 'custom',
      description: '',
      grid: compactedGrid,
      colors: finalColors,
      beadCount: totalBeads,
      difficulty: 'easy',
      tags: ['custom', 'editor'],
      source: t('editor.source'),
    };
    try {
      if (format === 'png') {
        await exportTemplateToPNG(tpl);
      } else if (format === 'svg') {
        exportTemplateToSVG(tpl);
      } else {
        exportColorListCSV(tpl, {
          headerNo: t('detail.csv.headerNo'),
          headerHex: t('detail.csv.headerHex'),
          headerName: t('detail.csv.headerName'),
          headerCount: t('detail.csv.headerCount'),
          headerRatio: t('detail.csv.headerRatio'),
          headerPositions: t('detail.csv.headerPositions'),
          totalLabel: t('detail.csv.totalLabel'),
        }, t('detail.csv.fileNameSuffix'));
      }
      showToast(t(`editor.export.${format}Success`), 'success');
    } catch {
      showToast(t(`editor.export.${format}Failed`), 'error');
    }
  }, [grid, palette, totalBeads, templateName, t, showToast]);

  // 保存模板
  const handleSave = useCallback(() => {
    const name = templateName.trim() || t('editor.untitled');
    if (totalBeads === 0) {
      showToast(t('editor.emptyGrid'), 'info');
      return;
    }
    // 紧凑颜色索引并计算实际用量
    const { grid: compactedGrid, colors: compactedColors } = compactColors(grid, palette);
    const usage = countColorUsage(compactedGrid);
    const finalColors = compactedColors.map((c, i) => ({
      ...c,
      count: usage.get(i + 1) || 0,
    }));

    const difficulty = totalBeads < 100 ? 'easy' : totalBeads < 400 ? 'medium' : 'hard';
    const templateData: Omit<BeadTemplate, 'id'> = {
      name,
      category: 'custom',
      description: t('editor.customDesc'),
      grid: compactedGrid,
      colors: finalColors,
      beadCount: totalBeads,
      difficulty,
      tags: ['custom', 'editor'],
      source: t('editor.source'),
    };

    const saved = onSave(templateData);
    clearHistory();
    setIsDirty(false);
    showToast(t('editor.saved', { name }), 'success');
    // 跳转到新模板详情页
    onNavigate(saved.id);
  }, [templateName, totalBeads, grid, palette, t, onSave, clearHistory, showToast, onNavigate]);

  // 返回前确认
  const handleBack = useCallback(() => {
    if (isDirty) {
      if (!confirm(t('editor.unsavedConfirm'))) return;
    }
    onBack();
  }, [isDirty, t, onBack]);

  // 工具按钮配置
  const tools: { mode: ToolMode; icon: typeof Brush; labelKey: string; key: string }[] = [
    { mode: 'paint', icon: Brush, labelKey: 'editor.tool.paint', key: 'b' },
    { mode: 'erase', icon: Eraser, labelKey: 'editor.tool.erase', key: 'e' },
    { mode: 'fill', icon: PaintBucket, labelKey: 'editor.tool.fill', key: 'f' },
    { mode: 'picker', icon: Pipette, labelKey: 'editor.tool.picker', key: 'i' },
    { mode: 'line', icon: LineIcon, labelKey: 'editor.tool.line', key: 'l' },
    { mode: 'rect', icon: SquareDashed, labelKey: 'editor.tool.rect', key: 'r' },
    { mode: 'rectFill', icon: Square, labelKey: 'editor.tool.rectFill', key: 'R' },
    { mode: 'circle', icon: CircleDashed, labelKey: 'editor.tool.circle', key: 'c' },
    { mode: 'circleFill', icon: Circle, labelKey: 'editor.tool.circleFill', key: 'C' },
  ];

  // 对称模式切换
  const symmetryOptions: { mode: SymmetryMode; icon: typeof Brush; labelKey: string }[] = [
    { mode: 'none', icon: X, labelKey: 'editor.symmetry.none' },
    { mode: 'horizontal', icon: FlipHorizontal, labelKey: 'editor.symmetry.horizontal' },
    { mode: 'vertical', icon: FlipVertical, labelKey: 'editor.symmetry.vertical' },
    { mode: 'both', icon: Grid2x2, labelKey: 'editor.symmetry.both' },
  ];

  // 导入参考底图
  const handleRefImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(t('editor.ref.invalidImage'), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImg(reader.result as string);
      setShowReference(true);
      showToast(t('editor.ref.loaded'), 'success');
    };
    reader.readAsDataURL(file);
  }, [showToast, t]);

  // 保存快照
  const handleAddSnapshot = useCallback(() => {
    const snap = addSnapshot(grid);
    showToast(t('editor.panel.snapshotSaved', { name: snap.name }), 'success');
  }, [grid, addSnapshot, showToast, t]);

  // 恢复快照（产生一条历史记录，可撤销）
  const handleRestoreSnapshot = useCallback((snap: { grid: number[][]; name: string }) => {
    commit(snap.grid.map(row => [...row]));
    markDirty();
    showToast(t('editor.panel.snapshotRestored', { name: snap.name }), 'success');
  }, [commit, markDirty, showToast, t]);

  return (
    <div className="page editor-page" onMouseUp={handleMouseUp}>
      <header className="editor-page__header">
        <button type="button" className="editor-page__back" onClick={handleBack}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>
        <h1 className="editor-page__title">{t('editor.title')}</h1>
        <div className="editor-page__header-actions">
          <button
            type="button"
            className="editor-page__btn editor-page__btn--ghost"
            onClick={undo}
            disabled={!canUndo}
            title={t('editor.undo')}
            aria-label={t('editor.undo')}
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            className="editor-page__btn editor-page__btn--ghost"
            onClick={redo}
            disabled={!canRedo}
            title={t('editor.redo')}
            aria-label={t('editor.redo')}
          >
            <Redo2 size={18} />
          </button>
          <button
            type="button"
            className="editor-page__btn editor-page__btn--primary"
            onClick={handleSave}
            title={t('editor.save')}
          >
            <Save size={18} />
            {t('editor.save')}
          </button>
          {/* 导出下拉菜单 */}
          <div className="editor-page__export-wrapper">
            <button
              type="button"
              className="editor-page__btn editor-page__btn--ghost"
              onClick={() => setShowExportMenu(v => !v)}
              title={t('editor.export.title')}
              aria-label={t('editor.export.title')}
              aria-expanded={showExportMenu}
            >
              <Download size={18} />
            </button>
            {showExportMenu && (
              <>
                <div className="editor-page__export-overlay" onClick={() => setShowExportMenu(false)} aria-hidden="true" />
                <div className="editor-page__export-menu" role="menu">
                  <button type="button" className="editor-page__export-item" role="menuitem" onClick={() => { handleExport('png'); setShowExportMenu(false); }}>
                    PNG
                  </button>
                  <button type="button" className="editor-page__export-item" role="menuitem" onClick={() => { handleExport('svg'); setShowExportMenu(false); }}>
                    SVG
                  </button>
                  <button type="button" className="editor-page__export-item" role="menuitem" onClick={() => { handleExport('csv'); setShowExportMenu(false); }}>
                    CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="editor-page__main" tabIndex={-1}>
        {/* 名称输入 */}
        <div className="editor-page__name-row">
          <input
            type="text"
            className="editor-page__name-input"
            placeholder={t('editor.namePlaceholder')}
            value={templateName}
            onChange={e => { setTemplateName(e.target.value); setIsDirty(true); }}
            aria-label={t('editor.nameLabel')}
            maxLength={40}
          />
          <span className="editor-page__bead-count" aria-live="polite">
            {t('editor.beadCount', { count: totalBeads })}
          </span>
        </div>

        {/* 工具栏 */}
        <div className="editor-page__toolbar" role="toolbar" aria-label={t('editor.toolbar.ariaLabel')}>
          {tools.map(tool => (
            <button
              key={tool.mode}
              type="button"
              className={`editor-page__tool ${toolMode === tool.mode ? 'editor-page__tool--active' : ''}`}
              onClick={() => setToolMode(tool.mode)}
              title={`${t(tool.labelKey)} (${tool.key.toUpperCase()})`}
              aria-pressed={toolMode === tool.mode}
              aria-label={t(tool.labelKey)}
            >
              <tool.icon size={18} />
              <span className="editor-page__tool-label">{t(tool.labelKey)}</span>
            </button>
          ))}
          <div className="editor-page__toolbar-divider" aria-hidden="true" />
          {/* 对称模式 */}
          <div className="editor-page__symmetry-group" role="group" aria-label={t('editor.symmetry.label')}>
            {symmetryOptions.map(opt => (
              <button
                key={opt.mode}
                type="button"
                className={`editor-page__tool ${symmetry === opt.mode ? 'editor-page__tool--active' : ''}`}
                onClick={() => setSymmetry(opt.mode)}
                title={t(opt.labelKey)}
                aria-pressed={symmetry === opt.mode}
                aria-label={t(opt.labelKey)}
              >
                <opt.icon size={18} />
              </button>
            ))}
          </div>
          <div className="editor-page__toolbar-divider" aria-hidden="true" />
          {/* 参考底图 */}
          <button
            type="button"
            className={`editor-page__btn editor-page__btn--ghost ${showReference ? 'editor-page__btn--active' : ''}`}
            onClick={() => {
              if (!referenceImg) {
                fileInputRef.current?.click();
              } else {
                setShowReference(v => !v);
              }
            }}
            title={t('editor.ref.toggle')}
            aria-label={t('editor.ref.toggle')}
            aria-pressed={showReference}
          >
            <ImageIcon size={18} />
          </button>
          {referenceImg && (
            <button
              type="button"
              className="editor-page__btn editor-page__btn--ghost"
              onClick={() => { setReferenceImg(null); setShowReference(false); }}
              title={t('editor.ref.clear')}
              aria-label={t('editor.ref.clear')}
            >
              <X size={18} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="editor-page__file-input"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefImage(f); e.target.value = ''; }}
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="editor-page__toolbar-divider" aria-hidden="true" />
          {/* 整体变换：翻转/旋转 */}
          <div className="editor-page__symmetry-group" role="group" aria-label={t('editor.transform.label')}>
            <button
              type="button"
              className="editor-page__btn editor-page__btn--ghost"
              onClick={() => handleTransform('flipH')}
              title={t('editor.transform.flipH')}
              aria-label={t('editor.transform.flipH')}
            >
              <FlipHorizontal size={18} />
            </button>
            <button
              type="button"
              className="editor-page__btn editor-page__btn--ghost"
              onClick={() => handleTransform('flipV')}
              title={t('editor.transform.flipV')}
              aria-label={t('editor.transform.flipV')}
            >
              <FlipVertical size={18} />
            </button>
            <button
              type="button"
              className="editor-page__btn editor-page__btn--ghost"
              onClick={() => handleTransform('rotate90')}
              title={t('editor.transform.rotate90')}
              aria-label={t('editor.transform.rotate90')}
            >
              <RotateCw size={18} />
            </button>
            <button
              type="button"
              className="editor-page__btn editor-page__btn--ghost"
              onClick={() => handleTransform('rotate270')}
              title={t('editor.transform.rotate270')}
              aria-label={t('editor.transform.rotate270')}
            >
              <RotateCcw size={18} />
            </button>
          </div>
          <div className="editor-page__toolbar-divider" aria-hidden="true" />
          <button
            type="button"
            className="editor-page__btn editor-page__btn--ghost"
            onClick={handleClear}
            title={t('editor.clear')}
            aria-label={t('editor.clear')}
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="editor-page__workspace">
          {/* 左侧色板 */}
          <aside className="editor-page__palette" aria-label={t('editor.palette.ariaLabel')}>
            <div className="editor-page__palette-header">
              <span className="editor-page__palette-title">{t('editor.palette.title')}</span>
              <button
                type="button"
                className="editor-page__add-color-btn"
                onClick={() => setShowColorPicker(v => !v)}
                title={t('editor.palette.add')}
                aria-label={t('editor.palette.add')}
              >
                {showColorPicker ? <X size={16} /> : <Plus size={16} />}
              </button>
            </div>

            {/* 当前选中颜色预览 */}
            {palette.length > 0 && (
              <div className="editor-page__current-color">
                <div
                  className="editor-page__current-swatch"
                  style={{ backgroundColor: palette[selectedColorIdx - 1]?.hex ?? 'transparent' }}
                  aria-hidden="true"
                />
                <span className="editor-page__current-name">
                  {palette[selectedColorIdx - 1]?.name ?? t('pixelGrid.empty')}
                </span>
              </div>
            )}

            {/* 颜色选择网格 */}
            <div className="editor-page__palette-grid">
              {palette.map((c, i) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`editor-page__swatch ${selectedColorIdx === i + 1 ? 'editor-page__swatch--active' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => { setSelectedColorIdx(i + 1); setToolMode('paint'); }}
                  title={`${c.name} (${c.hex})`}
                  aria-label={t('editor.palette.selectColor', { name: c.name, hex: c.hex })}
                  aria-pressed={selectedColorIdx === i + 1}
                >
                  {selectedColorIdx === i + 1 && <Check size={14} className="editor-page__swatch-check" />}
                </button>
              ))}
              {palette.length === 0 && (
                <p className="editor-page__palette-empty">{t('editor.palette.empty')}</p>
              )}
            </div>

            {/* 颜色添加面板 */}
            {showColorPicker && (
              <ColorAddPanel onAdd={handleAddColor} />
            )}

            {/* 历史/快照面板 */}
            <EditorHistoryPanel
              undoCount={undoCount}
              redoCount={redoCount}
              snapshots={snapshots}
              onUndo={undo}
              onRedo={redo}
              onAddSnapshot={handleAddSnapshot}
              onRestoreSnapshot={handleRestoreSnapshot}
              onRemoveSnapshot={removeSnapshot}
              onClearSnapshots={clearSnapshots}
            />

            {/* 预设形状库 */}
            <ShapeLibraryPanel
              selectedColorIdx={selectedColorIdx}
              colors={palette}
              onStamp={handleStampShape}
            />
          </aside>

          {/* 中央画布 */}
          <div className="editor-page__canvas-area">
            {/* 尺寸控制 */}
            <div className="editor-page__size-control">
              <div className="editor-page__size-group">
                <span className="editor-page__size-label">{t('editor.size.rows')}</span>
                <button type="button" className="editor-page__size-btn" onClick={() => handleResize(-1, 0)} aria-label={t('editor.size.decreaseRows')}><Minus size={14} /></button>
                <span className="editor-page__size-value">{rows}</span>
                <button type="button" className="editor-page__size-btn" onClick={() => handleResize(1, 0)} aria-label={t('editor.size.increaseRows')}><Plus size={14} /></button>
              </div>
              <div className="editor-page__size-group">
                <span className="editor-page__size-label">{t('editor.size.cols')}</span>
                <button type="button" className="editor-page__size-btn" onClick={() => handleResize(0, -1)} aria-label={t('editor.size.decreaseCols')}><Minus size={14} /></button>
                <span className="editor-page__size-value">{cols}</span>
                <button type="button" className="editor-page__size-btn" onClick={() => handleResize(0, 1)} aria-label={t('editor.size.increaseCols')}><Plus size={14} /></button>
              </div>
              <div className="editor-page__size-info">
                <Grid3x3 size={14} />
                <span>{cols}×{rows}</span>
              </div>
            </div>

            {/* 绘制网格 */}
            <div className="editor-page__grid-wrap" style={{ position: 'relative' }}>
              {showReference && referenceImg && (
                <img
                  src={referenceImg}
                  alt=""
                  aria-hidden="true"
                  className="editor-page__reference-img"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: 0.35,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              )}
              <div
                className="editor-page__grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  position: 'relative',
                  zIndex: 1,
                }}
                role="img"
                aria-label={t('pixelGrid.ariaLabel', { count: totalBeads })}
              >
                {(shapePreview ?? grid).map((row, ri) =>
                  row.map((cellValue, ci) => {
                    const color = cellValue > 0 ? palette[cellValue - 1] : undefined;
                    return (
                      <div
                        key={`${ri}-${ci}`}
                        className="editor-page__cell"
                        style={{
                          backgroundColor: color ? color.hex : 'transparent',
                        }}
                        onMouseDown={(e: ReactMouseEvent) => { e.preventDefault(); handleCellDown(ri, ci); }}
                        onMouseEnter={() => handleCellEnter(ri, ci)}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* 快捷键提示 */}
            <div className="editor-page__shortcuts">
              <kbd>B</kbd> {t('editor.tool.paint')}
              <kbd>E</kbd> {t('editor.tool.erase')}
              <kbd>F</kbd> {t('editor.tool.fill')}
              <kbd>I</kbd> {t('editor.tool.picker')}
              <kbd>Ctrl+Z</kbd> {t('editor.undo')}
              <kbd>Ctrl+Y</kbd> {t('editor.redo')}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** 颜色添加面板：从内置色卡选择 */
function ColorAddPanel({ onAdd }: { onAdd: (hex: string, name: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filteredColors = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = BEAD_COLOR_GROUPS.flatMap(g => g.colors.map(c => ({ ...c, groupName: g.name })));
    if (!q) return all;
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.hex.toLowerCase().includes(q) ||
      (c.nameKey && t(c.nameKey).toLowerCase().includes(q))
    );
  }, [query, t]);

  return (
    <div className="editor-page__color-add">
      <input
        type="text"
        className="editor-page__color-add-search"
        placeholder={t('editor.palette.searchPlaceholder')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label={t('editor.palette.searchAriaLabel')}
      />
      <div className="editor-page__color-add-list">
        {filteredColors.slice(0, 60).map(c => (
          <button
            key={c.hex}
            type="button"
            className="editor-page__color-add-item"
            onClick={() => onAdd(c.hex, c.nameKey ? t(c.nameKey) : c.name)}
            title={`${c.nameKey ? t(c.nameKey) : c.name} (${c.hex})`}
          >
            <span className="editor-page__color-add-swatch" style={{ backgroundColor: c.hex }} aria-hidden="true" />
            <span className="editor-page__color-add-name">{c.nameKey ? t(c.nameKey) : c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
