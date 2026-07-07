import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { BeadTemplate } from '../types/bead';
import PixelGrid from '../components/PixelGrid';
import FavoriteButton from '../components/FavoriteButton';
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Check, Copy, Grid3x3, ClipboardList, Share2, Printer, Download, Trash2, FileCode, Map as MapIcon, Table, ThumbsUp, Star, FlipHorizontal, FlipVertical, RotateCw, RotateCcw, RefreshCw, CheckSquare, Palette as PaletteIcon, ListOrdered, GitCompare, Hash } from 'lucide-react';
import { getBeadCount, getCorrectedColors } from '../utils/beadStats';
import { exportTemplateToPNG } from '../utils/exportPNG';
import { exportTemplateToSVG } from '../utils/exportSVG';
import { exportPrintChart } from '../utils/exportPrintChart';
import { exportColorListCSV } from '../utils/exportCSV';
import { applyTransform, type TransformType } from '../utils/transformGrid';
import type { InventoryItem } from '../hooks/useInventory';
import InventoryPanel from '../components/InventoryPanel';
import StepGuidePanel from '../components/StepGuidePanel';
import { useStepGuide } from '../hooks/useStepGuide';
import { useTouchGesture } from '../hooks/useTouchGesture';
import { applyColorReplacements, type MissingColorInfo } from '../utils/colorReplacement';
import { encodeShareCode } from '../utils/shareCode';
import { useToast } from '../components/ToastContainer';
import { useTranslation } from '../context/LanguageContext';
import Confetti from '../components/Confetti';
import AchievementBadges from '../components/AchievementBadges';
import { useAchievements } from '../hooks/useAchievements';
import CommentsSection from '../components/CommentsSection';
import { useComments } from '../hooks/useComments';

interface DetailPageProps {
  template: BeadTemplate | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
  rating: number;
  onSetRating: (stars: number) => void;
  completedCells: Set<string>;
  onToggleCell: (row: number, col: number) => void;
  onClearProgress: () => void;
  progressPercent: number;
  inventory: InventoryItem[];
  onAddInventoryColor: (hex: string, note?: string) => void;
  onRemoveInventoryColor: (hex: string) => void;
  onClearInventory: () => void;
  onSetInventoryCount?: (hex: string, count: number | undefined) => void;
  onNavigateTemplate?: (id: string) => void;
  prevTemplate?: BeadTemplate | null;
  nextTemplate?: BeadTemplate | null;
  relatedTemplates?: BeadTemplate[];
  onDeleteCustom?: (id: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: () => void;
  onNavigateCompare?: () => void;
  compareCount?: number;
}

// 难度仅保留背景色，label 运行时通过 t(`difficulty.${difficulty}`) 解析
const difficultyStyles: Record<string, { bg: string }> = {
  easy: { bg: '#22c55e' },
  medium: { bg: '#f59e0b' },
  hard: { bg: '#ef4444' },
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function DetailPage({
  template,
  onBack,
  isFavorite,
  onToggleFavorite,
  isLiked,
  onToggleLike,
  rating,
  onSetRating,
  completedCells,
  onToggleCell,
  onClearProgress,
  progressPercent,
  inventory,
  onAddInventoryColor,
  onRemoveInventoryColor,
  onClearInventory,
  onSetInventoryCount,
  onNavigateTemplate,
  prevTemplate,
  nextTemplate,
  relatedTemplates = [],
  onDeleteCustom,
  isInCompare = false,
  onToggleCompare,
  onNavigateCompare,
  compareCount = 0,
}: DetailPageProps) {
  const [zoom, setZoom] = useState(1);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [showGridLines, setShowGridLines] = useState(false);
  const [showColorCode, setShowColorCode] = useState(false);
  const [progressMode, setProgressMode] = useState(false);
  const [transforms, setTransforms] = useState<TransformType[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [colorSort, setColorSort] = useState<'count' | 'name' | 'hex'>('count');
  const [beadSize, setBeadSize] = useState<5 | 2.6>(5);
  const [showInventory, setShowInventory] = useState(false);
  const stepGuide = useStepGuide(template?.id);
  const touch = useTouchGesture(true, zoom > 1);
  const [replacedColors, setReplacedColors] = useState<MissingColorInfo[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { showToast } = useToast();
  const { t, lang } = useTranslation();
  // 成就系统 + 完成庆祝
  const { badges, unlockedCount, recordCompletion, resetAchievements } = useAchievements();
  const [confettiTrigger, setConfettiTrigger] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  // 进度模式开始时间戳（用于计算完成速度）
  const startTimeRef = useRef<number | null>(null);
  // 上一次进度百分比（用于检测跨过 100% 的瞬间）
  const prevProgressRef = useRef(progressPercent);
  // 当前模板是否已庆祝过（切换模板后重置，避免反复触发）
  const celebratedRef = useRef(false);
  // 社区评论
  const {
    getByTemplate,
    getAverageRating,
    getCount,
    addComment,
    deleteComment,
    clearByTemplate,
  } = useComments();
  const templateComments = useMemo(
    () => (template ? getByTemplate(template.id) : []),
    // getByTemplate 依赖 comments 状态，通过 template?.id 触发重新计算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template?.id, getByTemplate]
  );
  const commentAvg = useMemo(
    () => (template ? getAverageRating(template.id) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template?.id, getAverageRating]
  );
  const commentCount = useMemo(
    () => (template ? getCount(template.id) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template?.id, getCount]
  );

  // 所有 hooks 必须在提前 return 之前调用，避免违反 Rules of Hooks
  const beadCount = useMemo(() => (template ? getBeadCount(template) : 0), [template]);
  const correctedColors = useMemo(
    () => (template ? getCorrectedColors(template) : []),
    [template]
  );
  // 应用库存颜色替换后的色卡（replacedColors 为空时与 correctedColors 相同）
  const displayColors = useMemo(
    () => replacedColors.length > 0 ? applyColorReplacements(correctedColors, replacedColors) : correctedColors,
    [correctedColors, replacedColors]
  );
  // 应用所有变换到 grid（变换不影响原始数据，仅影响视图）
  const displayGrid = useMemo(() => {
    if (!template) return [];
    return transforms.reduce((g, tf) => applyTransform(g, tf), template.grid);
  }, [template, transforms]);
  // 导出用模板：用 displayGrid 替换 grid、displayColors 替换 colors，实现所见即所得
  // colors 的 count 由导出工具内部用 getCorrectedColors 重新计算，无需修正
  const exportTemplate = useMemo<BeadTemplate | null>(
    () => (template ? { ...template, grid: displayGrid, colors: displayColors } : null),
    [template, displayGrid, displayColors]
  );
  const maxColorCount = useMemo(
    () => displayColors.reduce((m, c) => Math.max(m, c.count ?? 0), 0),
    [displayColors]
  );
  const sortedColors = useMemo(() => {
    const list = [...displayColors];
    switch (colorSort) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, lang));
        break;
      case 'hex':
        list.sort((a, b) => a.hex.localeCompare(b.hex));
        break;
      case 'count':
      default:
        list.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
        break;
    }
    return list;
  }, [displayColors, colorSort, lang]);

  const scheduleReset = useCallback((setter: (v: boolean) => void) => {
    const t = setTimeout(() => setter(false), 1500);
    timersRef.current.push(t);
  }, []);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const handleShare = useCallback(async () => {
    if (!template) return;
    const url = `${window.location.origin}${window.location.pathname}#template/${template.id}`;
    // 优先尝试 Web Share API
    try {
      if (navigator.share) {
        await navigator.share({ title: template.name, url });
        return;
      }
    } catch {
      // 用户取消分享，静默处理
    }
    // 回退：同时复制链接和分享码
    try {
      encodeShareCode(template);
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      scheduleReset(setCopiedLink);
      showToast(t('community.copiedCode'), 'success');
    } catch {
      // 剪贴板不可用，静默处理
    }
  }, [template, scheduleReset, showToast, t]);

  const handleCopyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      // 仅当当前高亮仍是该 hex 时才清除，避免连续复制时旧定时器误清新高亮
      const timer = setTimeout(() => setCopiedHex(prev => (prev === hex ? null : prev)), 1500);
      timersRef.current.push(timer);
      showToast(t('detail.toast.hexCopied', { hex }), 'success');
    } catch {
      showToast(t('detail.toast.copyFailed'), 'error');
    }
  }, [showToast, t]);

  const handleCopyAllColors = useCallback(async () => {
    if (!template) return;
    const colors = getCorrectedColors(template);
    const text = colors
      .map(c => `${c.hex}\t${c.name}\t${t('common.beadsUnitShort', { count: c.count ?? 0 })}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      scheduleReset(setCopiedAll);
      showToast(t('detail.toast.colorsCopied', { count: colors.length }), 'success');
    } catch {
      showToast(t('detail.toast.copyFailed'), 'error');
    }
  }, [template, scheduleReset, showToast, t]);

  // 打印用量清单：重置缩放避免打印放大图，等待重绘后调用浏览器打印
  const handlePrintList = useCallback(() => {
    if (!template) return;
    showToast(t('detail.toast.preparingPrint'), 'info');
    setZoom(1);
    const timer = setTimeout(() => window.print(), 50);
    timersRef.current.push(timer);
  }, [template, showToast, t]);

  // 导出 PNG：把 grid 渲染到 canvas 并下载（toBlob 异步，据实反馈）
  const handleExportPNG = useCallback(async () => {
    if (!exportTemplate) return;
    try {
      const ok = await exportTemplateToPNG(
        exportTemplate,
        24,
        showGridLines,
        t('detail.export.fileNameSuffix')
      );
      showToast(ok ? t('detail.toast.pngExported') : t('detail.toast.exportFailed'), ok ? 'success' : 'error');
    } catch {
      showToast(t('detail.toast.exportFailed'), 'error');
    }
  }, [exportTemplate, showGridLines, showToast, t]);

  // 导出 SVG：矢量格式，无限缩放不失真，文件体积小
  const handleExportSVG = useCallback(() => {
    if (!exportTemplate) return;
    try {
      exportTemplateToSVG(exportTemplate, 24, showGridLines, t('detail.export.fileNameSuffix'));
      showToast(t('detail.toast.svgExported'), 'success');
    } catch {
      showToast(t('detail.toast.exportFailed'), 'error');
    }
  }, [exportTemplate, showGridLines, showToast, t]);

  // 导出坐标网格图纸：带行列坐标 + 每 5 格加粗 + 格内色号 + 色卡图例，打印即可对照拼制
  const handleExportChart = useCallback(() => {
    if (!exportTemplate) return;
    try {
      exportPrintChart(
        exportTemplate,
        {
          chartTitle: t('detail.chart.title'),
          colLabel: t('detail.chart.col'),
          rowLabel: t('detail.chart.row'),
          legendTitle: t('detail.chart.legend'),
          countLabel: t('detail.chart.count'),
          totalLabel: t('detail.chart.total'),
          beadUnit: t('common.beadsUnitShort', { count: '' }).trim(),
        },
        t('detail.chart.fileNameSuffix')
      );
      showToast(t('detail.toast.chartExported'), 'success');
    } catch {
      showToast(t('detail.toast.exportFailed'), 'error');
    }
  }, [exportTemplate, showToast, t]);

  // 导出 CSV 色号清单：Excel 兼容，含行列坐标 + 色号 + 数量，竞品 PixelBeads 核心功能
  const handleExportCSV = useCallback(() => {
    if (!exportTemplate) return;
    try {
      const ok = exportColorListCSV(
        exportTemplate,
        {
          headerNo: t('detail.csv.headerNo'),
          headerHex: t('detail.csv.headerHex'),
          headerName: t('detail.csv.headerName'),
          headerCount: t('detail.csv.headerCount'),
          headerRatio: t('detail.csv.headerRatio'),
          headerPositions: t('detail.csv.headerPositions'),
          totalLabel: t('detail.csv.totalLabel'),
        },
        t('detail.csv.fileNameSuffix')
      );
      showToast(ok ? t('detail.toast.csvExported') : t('detail.toast.exportFailed'), ok ? 'success' : 'error');
    } catch {
      showToast(t('detail.toast.exportFailed'), 'error');
    }
  }, [exportTemplate, showToast, t]);

  // 切换模板时重置缩放、变换、进度模式、颜色替换与触摸手势，并滚动到顶部
  useEffect(() => {
    setZoom(1);
    setTransforms([]);
    setProgressMode(false);
    setReplacedColors([]);
    startTimeRef.current = null;
    celebratedRef.current = false;
    setNewlyUnlocked([]);
    prevProgressRef.current = 0;
    // 重置触摸手势状态（pinch/pan 残留会导致新模板以错误的缩放/偏移显示）
    touch.reset();
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  // SEO 结构化数据：注入 Schema.org VisualArtwork，便于搜索引擎富结果展示
  useEffect(() => {
    if (!template) return;
    const json = {
      '@context': 'https://schema.org',
      '@type': 'VisualArtwork',
      name: template.name,
      description: template.description,
      artMedium: '拼豆 / Perler Beads',
      artform: 'Pixel Art',
      keywords: template.tags.join(', '),
      url: `${window.location.origin}${import.meta.env.BASE_URL}#template/${template.id}`,
      thumbnailUrl: template.image
        ? `${window.location.origin}${import.meta.env.BASE_URL}${template.image}`
        : undefined,
      // 用约 200 字符的描述作为 abstract
      abstract: template.description.slice(0, 200),
      creator: {
        '@type': 'Organization',
        name: template.source || 'Beads Template',
      },
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(json);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [template]);

  // 进入进度模式时记录开始时间；退出时清空
  useEffect(() => {
    if (progressMode && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    } else if (!progressMode) {
      startTimeRef.current = null;
    }
  }, [progressMode]);

  // 检测进度跨过 100% 的瞬间，触发庆祝 + 记录成就
  useEffect(() => {
    if (!template) return;
    const prev = prevProgressRef.current;
    const now = progressPercent;
    // 仅在从 <100 跨到 ==100 且本模板尚未庆祝过时触发
    if (prev < 100 && now >= 100 && !celebratedRef.current) {
      celebratedRef.current = true;
      setConfettiTrigger(`${template.id}-${Date.now()}`);
      const seconds = startTimeRef.current
        ? (Date.now() - startTimeRef.current) / 1000
        : 0;
      const newBadges = recordCompletion(template.id, seconds);
      if (newBadges.length > 0) {
        setNewlyUnlocked(newBadges);
        showToast(t('achievement.unlocked', { count: newBadges.length }), 'success');
      } else {
        showToast(t('detail.achievement.completed'), 'success');
      }
    }
    prevProgressRef.current = now;
  }, [progressPercent, template, recordCompletion, showToast, t]);

  const handleClearProgressConfirm = useCallback(() => {
    if (!template) return;
    if (confirm(t('detail.progress.clearConfirm'))) {
      onClearProgress();
      // 清空进度后重置庆祝标记，允许再次完成时庆祝
      celebratedRef.current = false;
      startTimeRef.current = Date.now();
    }
  }, [template, onClearProgress, t]);

  const addTransform = useCallback((tf: TransformType) => {
    setTransforms(prev => [...prev, tf]);
  }, []);

  const resetTransforms = useCallback(() => {
    setTransforms([]);
  }, []);

  // 应用库存颜色替换：把替换映射转为 MissingColorInfo 并更新 state
  const handleApplyReplacements = useCallback((replaced: { hex: string; replacement: string }[]) => {
    setReplacedColors(prev => {
      // 合并已有替换与新替换（新替换覆盖同 hex 的旧替换）
      const map = new Map(prev.map(r => [r.hex.toLowerCase(), r]));
      for (const r of replaced) {
        map.set(r.hex.toLowerCase(), {
          hex: r.hex,
          name: r.hex,
          count: 0,
          replacement: r.replacement,
          distance: 0,
        });
      }
      return Array.from(map.values());
    });
    showToast(t('detail.inventory.applied'), 'success');
  }, [showToast, t]);

  // 滚动监听，控制返回顶部按钮显示（rAF 节流）
  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        setShowTop(window.scrollY > 400);
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // 左右箭头键切换模板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!onNavigateTemplate) return;
      // 模态弹窗打开时让弹窗优先处理，不切换模板
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      // 忽略带修饰键的组合（如 Cmd+ArrowLeft 浏览器后退）
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (e.key === 'ArrowLeft' && prevTemplate) {
        e.preventDefault();
        onNavigateTemplate(prevTemplate.id);
      } else if (e.key === 'ArrowRight' && nextTemplate) {
        e.preventDefault();
        onNavigateTemplate(nextTemplate.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevTemplate, nextTemplate, onNavigateTemplate]);

  if (!template) {
    return (
      <div className="page detail-page">
        <main id="main-content" className="empty-state" tabIndex={-1}>
          <p className="empty-state__icon" aria-hidden="true">😕</p>
          <p className="empty-state__title">{t('detail.empty.title')}</p>
          <p className="empty-state__desc">{t('detail.empty.desc')}</p>
          <button type="button" className="empty-state__action" onClick={onBack}>
            {t('detail.empty.backHome')}
          </button>
        </main>
      </div>
    );
  }

  const diffStyle = difficultyStyles[template.difficulty] || difficultyStyles.medium;
  const difficultyLabel = t(`difficulty.${template.difficulty}`);
  // 使用变换后的 grid 计算行列，旋转后行列会互换
  const rows = displayGrid.length;
  const cols = rows > 0 ? displayGrid[0].length : 0;
  const completedCount = completedCells.size;
  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(1);

  return (
    <div className="page detail-page">
      <header className="detail-page__header">
        <button type="button" className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('detail.back')}
        </button>
        <div className="detail-page__header-actions">
          <button
            type="button"
            className="detail-page__share-btn"
            onClick={handleShare}
            aria-label={t('detail.share.ariaLabel')}
            title={t('detail.share.title')}
          >
            {copiedLink ? <Check size={20} /> : <Share2 size={20} />}
          </button>
          <button
            type="button"
            className={`detail-page__share-btn ${stepGuide.enabled ? 'detail-page__share-btn--active' : ''}`}
            onClick={stepGuide.toggle}
            aria-label={t('stepGuide.toggle')}
            title={t('stepGuide.toggleTitle')}
            aria-pressed={stepGuide.enabled}
          >
            <ListOrdered size={20} />
          </button>
          <button
            type="button"
            className={`detail-page__share-btn ${showInventory ? 'detail-page__share-btn--active' : ''}`}
            onClick={() => setShowInventory(v => !v)}
            aria-label={t('detail.inventory.toggleTitle')}
            title={t('detail.inventory.toggleTitle')}
            aria-pressed={showInventory}
          >
            <PaletteIcon size={20} />
          </button>
          <FavoriteButton favorite={isFavorite} size={28} onClick={onToggleFavorite} />
          <button
            type="button"
            className={`detail-page__share-btn ${isLiked ? 'detail-page__like-btn--active' : ''}`}
            onClick={onToggleLike}
            aria-label={isLiked ? t('detail.like.ariaLabelActive') : t('detail.like.ariaLabel')}
            title={isLiked ? t('detail.like.titleActive') : t('detail.like.title')}
            aria-pressed={isLiked}
          >
            <ThumbsUp size={20} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
          {onToggleCompare && (
            <button
              type="button"
              className={`detail-page__share-btn ${isInCompare ? 'detail-page__like-btn--active' : ''}`}
              onClick={onToggleCompare}
              aria-label={isInCompare ? t('compare.removeAria') : t('compare.addAria')}
              title={isInCompare ? t('compare.removeAria') : t('compare.addAria')}
              aria-pressed={isInCompare}
            >
              <GitCompare size={20} />
            </button>
          )}
          {compareCount > 0 && onNavigateCompare && (
            <button
              type="button"
              className="detail-page__compare-badge"
              onClick={onNavigateCompare}
              aria-label={t('compare.viewCount', { count: compareCount })}
              title={t('compare.viewCount', { count: compareCount })}
            >
              <GitCompare size={14} />
              <span className="detail-page__compare-badge-count">{compareCount}</span>
            </button>
          )}
          {template.category === 'custom' && onDeleteCustom && (
            <button
              type="button"
              className="detail-page__share-btn detail-page__delete-btn"
              onClick={() => {
                if (confirm(t('detail.deleteCustom.confirm', { name: template.name }))) {
                  onDeleteCustom(template.id);
                  onBack();
                }
              }}
              aria-label={t('detail.deleteCustom.ariaLabel')}
              title={t('detail.deleteCustom.title')}
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </header>

      <main id="main-content" className="detail-page__body" tabIndex={-1}>
        {stepGuide.enabled && (
          <StepGuidePanel
            grid={displayGrid}
            colors={displayColors}
            enabled={stepGuide.enabled}
            currentStep={stepGuide.currentStep}
            completedSteps={stepGuide.completedSteps}
            mode={stepGuide.mode}
            elapsed={stepGuide.elapsed}
            isRunning={stepGuide.isRunning}
            voiceEnabled={stepGuide.voiceEnabled}
            onToggle={stepGuide.toggle}
            onToggleMode={stepGuide.toggleMode}
            onNext={stepGuide.nextStep}
            onPrev={stepGuide.prevStep}
            onGoTo={stepGuide.goToStep}
            onMarkComplete={stepGuide.markStepComplete}
            onReset={stepGuide.reset}
            onPauseTimer={stepGuide.pauseTimer}
            onResumeTimer={stepGuide.resumeTimer}
            onToggleVoice={stepGuide.toggleVoice}
            onSpeak={stepGuide.speak}
          />
        )}

        {showInventory && (
          <InventoryPanel
            template={template}
            inventory={inventory}
            onAddColor={onAddInventoryColor}
            onRemoveColor={onRemoveInventoryColor}
            onClearInventory={onClearInventory}
            onApplyReplacements={handleApplyReplacements}
            onSetCount={onSetInventoryCount}
            onClose={() => setShowInventory(false)}
          />
        )}
        <h1 className="detail-page__title">{template.name}</h1>

        <div className="detail-page__tags">
          <span
            className="template-card__difficulty"
            style={{ backgroundColor: diffStyle.bg }}
          >
            {difficultyLabel}
          </span>
          {template.tags.map(tag => (
            <span key={tag} className="detail-page__tag">#{tag}</span>
          ))}
        </div>

        <p className="detail-page__description">{template.description}</p>

        <div className="detail-page__split">
          {template.image && (
            <aside className="detail-page__cover" aria-label={t('detail.cover.ariaLabel', { name: template.name })}>
              <img
                src={`${import.meta.env.BASE_URL}${template.image}`}
                alt={template.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <p className="detail-page__cover-label">{t('detail.coverLabel')}</p>
            </aside>
          )}

        <div className="detail-page__pixel-wrapper">
          <div className="detail-page__pixel-controls">
            <button
              type="button"
              className="detail-page__zoom-btn"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label={t('detail.zoom.out')}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn detail-page__zoom-label"
              onClick={zoomReset}
              aria-label={t('detail.zoom.reset')}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label={t('detail.zoom.in')}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className={`detail-page__zoom-btn ${showGridLines ? 'detail-page__zoom-btn--active' : ''}`}
              onClick={() => setShowGridLines(v => !v)}
              aria-label={t('detail.zoom.gridLines')}
              aria-pressed={showGridLines}
              title={t('detail.zoom.gridLinesTitle')}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              type="button"
              className={`detail-page__zoom-btn ${progressMode ? 'detail-page__zoom-btn--active' : ''}`}
              onClick={() => setProgressMode(v => {
                // 进入进度模式时强制清空变换，避免变换后坐标与原始 grid 错位
                if (!v) setTransforms([]);
                return !v;
              })}
              aria-label={t('detail.progress.ariaLabel')}
              aria-pressed={progressMode}
              title={t('detail.progress.toggleTitle')}
            >
              <CheckSquare size={16} />
            </button>
            <div className="detail-page__transform-group" role="group" aria-label={t('detail.transform.ariaLabel')}>
              <button
                type="button"
                className="detail-page__zoom-btn"
                onClick={() => addTransform('flipH')}
                disabled={progressMode}
                aria-label={t('detail.transform.flipH.ariaLabel')}
                title={t('detail.transform.flipH.title')}
              >
                <FlipHorizontal size={16} />
              </button>
              <button
                type="button"
                className="detail-page__zoom-btn"
                onClick={() => addTransform('flipV')}
                disabled={progressMode}
                aria-label={t('detail.transform.flipV.ariaLabel')}
                title={t('detail.transform.flipV.title')}
              >
                <FlipVertical size={16} />
              </button>
              <button
                type="button"
                className="detail-page__zoom-btn"
                onClick={() => addTransform('rotate90')}
                disabled={progressMode}
                aria-label={t('detail.transform.rotate90.ariaLabel')}
                title={t('detail.transform.rotate90.title')}
              >
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                className="detail-page__zoom-btn"
                onClick={() => addTransform('rotate270')}
                disabled={progressMode}
                aria-label={t('detail.transform.rotate270.ariaLabel')}
                title={t('detail.transform.rotate270.title')}
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                className="detail-page__zoom-btn"
                onClick={resetTransforms}
                disabled={transforms.length === 0 || progressMode}
                aria-label={t('detail.transform.reset.ariaLabel')}
                title={t('detail.transform.reset.title')}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <button
              type="button"
              className={`detail-page__zoom-btn ${showColorCode ? 'detail-page__zoom-btn--active' : ''}`}
              onClick={() => setShowColorCode(v => !v)}
              aria-pressed={showColorCode}
              aria-label={t('detail.colorCode.toggle.ariaLabel')}
              title={t('detail.colorCode.toggle.title')}
            >
              <Hash size={16} />
            </button>
          </div>

          {progressMode && (
            <div className="detail-page__progress-bar" role="region" aria-label={t('detail.progress.title')}>
              <div className="detail-page__progress-info">
                <span className="detail-page__progress-percent">{t('detail.progress.percent', { percent: progressPercent })}</span>
                <span className="detail-page__progress-completed">
                  {t('detail.progress.completed', { completed: completedCount, total: beadCount })}
                </span>
              </div>
              <div className="detail-page__progress-track" aria-hidden="true">
                <div className="detail-page__progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <button
                type="button"
                className="detail-page__progress-clear"
                onClick={handleClearProgressConfirm}
                disabled={completedCount === 0}
              >
                {t('detail.progress.clear')}
              </button>
            </div>
          )}
          <div
            className="detail-page__pixel"
            style={{ overflow: 'auto' }}
            onTouchStart={touch.onTouchStart}
            onTouchMove={touch.onTouchMove}
            onTouchEnd={touch.onTouchEnd}
            onWheel={touch.onWheel}
          >
            <div style={{ transform: `scale(${zoom * touch.scale}) translate(${touch.offsetX}px, ${touch.offsetY}px)`, transformOrigin: 'top center', touchAction: zoom > 1 || touch.scale > 1 ? 'none' : 'pan-y', maxWidth: '100%' }}>
              <PixelGrid
                grid={displayGrid}
                colors={displayColors}
                showGridLines={showGridLines}
                showColorCode={showColorCode}
                interactive={progressMode}
                completedCells={completedCells}
                onCellClick={onToggleCell}
              />
            </div>
          </div>
        </div>
        </div>

        <div className="detail-page__stats">
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{beadCount}</span>
            <span className="detail-page__stat-label">{t('detail.stat.totalBeads')}</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{displayColors.length}</span>
            <span className="detail-page__stat-label">{t('detail.stat.colors')}</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{cols}×{rows}</span>
            <span className="detail-page__stat-label">{t('detail.stat.gridSize')}</span>
          </div>
        </div>

        <AchievementBadges
          badges={badges}
          unlockedCount={unlockedCount}
          newlyUnlocked={newlyUnlocked}
          onReset={resetAchievements}
        />

        {template && (
          <CommentsSection
            templateId={template.id}
            comments={templateComments}
            averageRating={commentAvg}
            count={commentCount}
            onAdd={(author, text, stars) => addComment(template.id, author, text, stars)}
            onDelete={deleteComment}
            onClearAll={() => clearByTemplate(template.id)}
          />
        )}

        <div className="detail-page__sizer" role="region" aria-label={t('detail.sizer.title')}>
          <span className="detail-page__sizer-label">{t('detail.sizer.beadSize')}</span>
          <div className="detail-page__sizer-toggle" role="radiogroup" aria-label={t('detail.sizer.beadSize')}>
            <button
              type="button"
              className={`detail-page__sizer-btn ${beadSize === 5 ? 'detail-page__sizer-btn--active' : ''}`}
              onClick={() => setBeadSize(5)}
              role="radio"
              aria-checked={beadSize === 5}
            >
              {t('detail.sizer.standard')}
            </button>
            <button
              type="button"
              className={`detail-page__sizer-btn ${beadSize === 2.6 ? 'detail-page__sizer-btn--active' : ''}`}
              onClick={() => setBeadSize(2.6)}
              role="radio"
              aria-checked={beadSize === 2.6}
            >
              {t('detail.sizer.mini')}
            </button>
          </div>
          <div className="detail-page__sizer-result">
            <span className="detail-page__sizer-dim">
              {t('detail.sizer.width')} {(cols * beadSize / 10).toFixed(1)}cm
              <span className="detail-page__sizer-sep">×</span>
              {t('detail.sizer.height')} {(rows * beadSize / 10).toFixed(1)}cm
            </span>
            <span className="detail-page__sizer-boards" title={t('detail.sizer.boards')}>
              {t('detail.sizer.boardsHint', { boards: Math.ceil(cols / 29) * Math.ceil(rows / 29) })}
            </span>
          </div>
        </div>

        <div
          className="detail-page__rating"
          role="radiogroup"
          aria-label={t('detail.rating.ariaLabel')}
          title={t('detail.rating.title')}
        >
          <span className="detail-page__rating-label">{t('detail.rating.yourRating')}</span>
          <div className="detail-page__stars">
            {[1, 2, 3, 4, 5].map(star => {
              const filled = rating >= star;
              return (
                <button
                  key={star}
                  type="button"
                  className="detail-page__star-btn"
                  onClick={() => onSetRating(star)}
                  aria-label={t('detail.rating.star', { stars: star })}
                  aria-checked={filled}
                  role="radio"
                  title={t('detail.rating.star', { stars: star })}
                >
                  <Star
                    size={22}
                    fill={filled ? '#f59e0b' : 'none'}
                    color={filled ? '#f59e0b' : '#9ca3af'}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="detail-page__palette">
          <div className="detail-page__palette-header">
            <h2 className="detail-page__section-title">{t('detail.palette.title')}</h2>
            <div className="detail-page__palette-actions">
              <label className="detail-page__color-sort">
                <span className="detail-page__color-sort-label">{t('detail.palette.sortLabel')}</span>
                <select
                  value={colorSort}
                  onChange={e => setColorSort(e.target.value as 'count' | 'name' | 'hex')}
                  aria-label={t('detail.palette.sort.ariaLabel')}
                >
                  <option value="count">{t('detail.palette.sort.count')}</option>
                  <option value="name">{t('detail.palette.sort.name')}</option>
                  <option value="hex">{t('detail.palette.sort.hex')}</option>
                </select>
              </label>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleCopyAllColors}
                title={t('detail.palette.copyAll.title')}
              >
                {copiedAll ? <Check size={14} /> : <ClipboardList size={14} />}
                <span>{copiedAll ? t('detail.palette.copied') : t('detail.palette.copyAll')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handlePrintList}
                title={t('detail.palette.printList.title')}
                aria-label={t('detail.palette.printList.ariaLabel')}
              >
                <Printer size={14} />
                <span>{t('detail.palette.printList')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleExportPNG}
                title={t('detail.palette.export.title')}
                aria-label={t('detail.palette.export.ariaLabel')}
              >
                <Download size={14} />
                <span>{t('detail.palette.export')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleExportSVG}
                title={t('detail.palette.exportSvg.title')}
                aria-label={t('detail.palette.exportSvg.ariaLabel')}
              >
                <FileCode size={14} />
                <span>{t('detail.palette.exportSvg.label')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleExportChart}
                title={t('detail.palette.exportChart.title')}
                aria-label={t('detail.palette.exportChart.ariaLabel')}
              >
                <MapIcon size={14} />
                <span>{t('detail.palette.exportChart.label')}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleExportCSV}
                title={t('detail.palette.exportCsv.title')}
                aria-label={t('detail.palette.exportCsv.ariaLabel')}
              >
                <Table size={14} />
                <span>{t('detail.palette.exportCsv.label')}</span>
              </button>
            </div>
          </div>
          <div className="detail-page__palette-grid">
            {sortedColors.map((color) => {
              const pct = maxColorCount > 0 ? ((color.count ?? 0) / maxColorCount) * 100 : 0;
              const ratio = beadCount > 0 ? (((color.count ?? 0) / beadCount) * 100).toFixed(1) : '0';
              return (
                <button
                  key={color.hex}
                  type="button"
                  className="detail-page__swatch"
                  onClick={() => handleCopyHex(color.hex)}
                  title={t('detail.swatch.copyTitle', { hex: color.hex })}
                  aria-label={t('detail.swatch.ariaLabel', { hex: color.hex, name: color.name, count: color.count ?? 0 })}
                >
                  <div
                    className="detail-page__swatch-color"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="detail-page__swatch-info">
                    <span className="detail-page__swatch-name">{color.name}</span>
                    <span className="detail-page__swatch-hex">{color.hex}</span>
                    <span
                      className="detail-page__swatch-bar"
                      style={{ width: `${pct}%`, backgroundColor: color.hex }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="detail-page__swatch-count">
                    {color.count}
                    <span className="detail-page__swatch-pct">{ratio}%</span>
                  </span>
                  <span className="detail-page__swatch-copy">
                    {copiedHex === color.hex ? <Check size={14} /> : <Copy size={14} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 打印专用用量清单：屏幕隐藏，仅 @media print 可见 */}
        <section className="detail-page__print-list" aria-hidden="true">
          <h1 className="detail-page__print-title">{template.name}</h1>
          <p className="detail-page__print-meta">
            {t('detail.print.meta', {
              beadCount,
              colors: displayColors.length,
              cols,
              rows,
              difficulty: difficultyLabel,
              source: template.source,
            })}
          </p>
          <table className="detail-page__print-table">
            <thead>
              <tr>
                <th>{t('detail.print.col.swatch')}</th>
                <th>{t('detail.print.col.hex')}</th>
                <th>{t('detail.print.col.name')}</th>
                <th>{t('detail.print.col.count')}</th>
                <th>{t('detail.print.col.ratio')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedColors.map((color) => (
                <tr key={color.hex}>
                  <td>
                    <span
                      className="detail-page__print-swatch"
                      style={{ backgroundColor: color.hex }}
                    />
                  </td>
                  <td>{color.hex}</td>
                  <td>{color.name}</td>
                  <td>{t('detail.print.cell.beads', { count: color.count ?? 0 })}</td>
                  <td>
                    {beadCount > 0 ? (((color.count ?? 0) / beadCount) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>{t('detail.print.total')}</td>
                <td>{t('detail.print.totalBeads', { beadCount })}</td>
                <td>{t('detail.print.colors', { count: displayColors.length })}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="detail-page__source">
          <span className="detail-page__source-label">{t('detail.source.label')}</span>
          <span className="detail-page__source-value">{template.source}</span>
        </div>

        {(prevTemplate || nextTemplate) && (
          <nav className="detail-page__pager" aria-label={t('detail.pager.ariaLabel')}>
            {prevTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--prev"
                onClick={() => onNavigateTemplate?.(prevTemplate.id)}
              >
                <ArrowLeft size={16} />
                <span className="detail-page__pager-label">{t('detail.pager.prev')}</span>
                <span className="detail-page__pager-name">{prevTemplate.name}</span>
              </button>
            ) : <span className="detail-page__pager-spacer" />}
            {nextTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--next"
                onClick={() => onNavigateTemplate?.(nextTemplate.id)}
              >
                <span className="detail-page__pager-label">{t('detail.pager.next')}</span>
                <span className="detail-page__pager-name">{nextTemplate.name}</span>
                <ArrowRight size={16} />
              </button>
            ) : <span className="detail-page__pager-spacer" />}
          </nav>
        )}

        {relatedTemplates.length > 0 && (
          <section className="detail-page__related" aria-label={t('detail.related.ariaLabel')}>
            <h2 className="detail-page__section-title detail-page__section-title--related">{t('detail.related.title')}</h2>
            <div className="detail-page__related-list">
              {relatedTemplates.map(rt => (
                <button
                  key={rt.id}
                  type="button"
                  className="detail-page__related-item"
                  onClick={() => onNavigateTemplate?.(rt.id)}
                  title={rt.name}
                >
                  <PixelGrid
                    grid={rt.grid.slice(0, 8).map(r => r.slice(0, 8))}
                    colors={rt.colors}
                    ariaTotalBeads={getBeadCount(rt)}
                    ariaCols={rt.grid[0]?.length ?? 0}
                    ariaRows={rt.grid.length}
                  />
                  <span className="detail-page__related-name">{rt.name}</span>
                  <span className="detail-page__related-beads">{t('detail.related.beads', { count: getBeadCount(rt) })}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="detail-page__shortcuts">
          <kbd>←</kbd><kbd>→</kbd> {t('detail.shortcuts.switchTemplate')}
          <span className="detail-page__shortcuts-sep">·</span>
          <kbd>Esc</kbd> {t('detail.shortcuts.backHome')}
        </div>
      </main>

      {showTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('detail.backToTop')}
        >
          ↑
        </button>
      )}

      <Confetti trigger={confettiTrigger} />
    </div>
  );
}
