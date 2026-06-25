import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { BeadTemplate } from '../types/bead';
import PixelGrid from '../components/PixelGrid';
import FavoriteButton from '../components/FavoriteButton';
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Check, Copy, Grid3x3, ClipboardList, Share2, Printer, Download } from 'lucide-react';
import { getBeadCount, getCorrectedColors } from '../utils/beadStats';
import { exportTemplateToPNG } from '../utils/exportPNG';
import { useToast } from '../components/ToastContainer';

interface DetailPageProps {
  template: BeadTemplate | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onNavigateTemplate?: (id: string) => void;
  prevTemplate?: BeadTemplate | null;
  nextTemplate?: BeadTemplate | null;
  relatedTemplates?: BeadTemplate[];
}

const difficultyStyles: Record<string, { bg: string; label: string }> = {
  easy: { bg: '#22c55e', label: '简单' },
  medium: { bg: '#f59e0b', label: '中等' },
  hard: { bg: '#ef4444', label: '困难' },
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function DetailPage({
  template,
  onBack,
  isFavorite,
  onToggleFavorite,
  onNavigateTemplate,
  prevTemplate,
  nextTemplate,
  relatedTemplates = [],
}: DetailPageProps) {
  const [zoom, setZoom] = useState(1);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [showGridLines, setShowGridLines] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [colorSort, setColorSort] = useState<'count' | 'name' | 'hex'>('count');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { showToast } = useToast();

  // 所有 hooks 必须在提前 return 之前调用，避免违反 Rules of Hooks
  const beadCount = useMemo(() => (template ? getBeadCount(template) : 0), [template]);
  const correctedColors = useMemo(
    () => (template ? getCorrectedColors(template) : []),
    [template]
  );
  const maxColorCount = useMemo(
    () => correctedColors.reduce((m, c) => Math.max(m, c.count), 0),
    [correctedColors]
  );
  const sortedColors = useMemo(() => {
    const list = [...correctedColors];
    switch (colorSort) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        break;
      case 'hex':
        list.sort((a, b) => a.hex.localeCompare(b.hex));
        break;
      case 'count':
      default:
        list.sort((a, b) => b.count - a.count);
        break;
    }
    return list;
  }, [correctedColors, colorSort]);

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
    try {
      if (navigator.share) {
        await navigator.share({ title: template.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      scheduleReset(setCopiedLink);
      showToast('链接已复制', 'success');
    } catch {
      // 用户取消分享或剪贴板不可用，静默处理
    }
  }, [template, scheduleReset, showToast]);

  const handleCopyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      // 仅当当前高亮仍是该 hex 时才清除，避免连续复制时旧定时器误清新高亮
      const t = setTimeout(() => setCopiedHex(prev => (prev === hex ? null : prev)), 1500);
      timersRef.current.push(t);
      showToast(`已复制 ${hex}`, 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  }, [showToast]);

  const handleCopyAllColors = useCallback(async () => {
    if (!template) return;
    const colors = getCorrectedColors(template);
    const text = colors
      .map(c => `${c.hex}\t${c.name}\t${c.count}颗`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      scheduleReset(setCopiedAll);
      showToast(`已复制 ${colors.length} 种颜色`, 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  }, [template, scheduleReset, showToast]);

  // 打印用量清单：重置缩放避免打印放大图，等待重绘后调用浏览器打印
  const handlePrintList = useCallback(() => {
    if (!template) return;
    showToast('正在准备打印清单', 'info');
    setZoom(1);
    setTimeout(() => window.print(), 50);
  }, [template, showToast]);

  // 导出 PNG：把 grid 渲染到 canvas 并下载
  const handleExportPNG = useCallback(() => {
    if (!template) return;
    try {
      exportTemplateToPNG(template, 24, showGridLines);
      showToast('已导出 PNG 图片', 'success');
    } catch {
      showToast('导出失败', 'error');
    }
  }, [template, showGridLines, showToast]);

  // 切换模板时重置缩放并滚动到顶部
  useEffect(() => {
    setZoom(1);
    window.scrollTo({ top: 0 });
  }, [template?.id]);

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
          <p className="empty-state__icon">😕</p>
          <p className="empty-state__title">模板不存在</p>
          <p className="empty-state__desc">该模板可能已被移除</p>
          <button type="button" className="empty-state__action" onClick={onBack}>
            返回首页
          </button>
        </main>
      </div>
    );
  }

  const diffStyle = difficultyStyles[template.difficulty] || difficultyStyles.medium;
  const rows = template.grid.length;
  const cols = rows > 0 ? template.grid[0].length : 0;
  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(1);

  return (
    <div className="page detail-page">
      <header className="detail-page__header">
        <button type="button" className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="detail-page__header-actions">
          <button
            type="button"
            className="detail-page__share-btn"
            onClick={handleShare}
            aria-label="分享链接"
            title="分享链接"
          >
            {copiedLink ? <Check size={20} /> : <Share2 size={20} />}
          </button>
          <FavoriteButton favorite={isFavorite} size={28} onClick={onToggleFavorite} />
        </div>
      </header>

      <main id="main-content" className="detail-page__body" tabIndex={-1}>
        <h1 className="detail-page__title">{template.name}</h1>

        <div className="detail-page__tags">
          <span
            className="template-card__difficulty"
            style={{ backgroundColor: diffStyle.bg }}
          >
            {diffStyle.label}
          </span>
          {template.tags.map(tag => (
            <span key={tag} className="detail-page__tag">#{tag}</span>
          ))}
        </div>

        <p className="detail-page__description">{template.description}</p>

        <div className="detail-page__pixel-wrapper">
          <div className="detail-page__pixel-controls">
            <button
              type="button"
              className="detail-page__zoom-btn"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="缩小"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn detail-page__zoom-label"
              onClick={zoomReset}
              aria-label="重置缩放"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="detail-page__zoom-btn"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="放大"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className={`detail-page__zoom-btn ${showGridLines ? 'detail-page__zoom-btn--active' : ''}`}
              onClick={() => setShowGridLines(v => !v)}
              aria-label="切换网格线"
              aria-pressed={showGridLines}
              title="网格线"
            >
              <Grid3x3 size={16} />
            </button>
          </div>
          <div className="detail-page__pixel" style={{ overflow: 'auto' }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <PixelGrid grid={template.grid} colors={correctedColors} showGridLines={showGridLines} />
            </div>
          </div>
        </div>

        <div className="detail-page__stats">
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{beadCount}</span>
            <span className="detail-page__stat-label">总颗数</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{correctedColors.length}</span>
            <span className="detail-page__stat-label">颜色数</span>
          </div>
          <div className="detail-page__stat">
            <span className="detail-page__stat-value">{cols}×{rows}</span>
            <span className="detail-page__stat-label">网格尺寸</span>
          </div>
        </div>

        <div className="detail-page__palette">
          <div className="detail-page__palette-header">
            <h2 className="detail-page__section-title">色卡（点击复制色号）</h2>
            <div className="detail-page__palette-actions">
              <label className="detail-page__color-sort">
                <span className="detail-page__color-sort-label">排序</span>
                <select
                  value={colorSort}
                  onChange={e => setColorSort(e.target.value as 'count' | 'name' | 'hex')}
                  aria-label="色卡排序方式"
                >
                  <option value="count">数量 ↓</option>
                  <option value="name">名称</option>
                  <option value="hex">色号</option>
                </select>
              </label>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleCopyAllColors}
                title="复制全部色卡"
              >
                {copiedAll ? <Check size={14} /> : <ClipboardList size={14} />}
                <span>{copiedAll ? '已复制' : '复制全部'}</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handlePrintList}
                title="打印用量清单"
                aria-label="打印用量清单"
              >
                <Printer size={14} />
                <span>用量清单</span>
              </button>
              <button
                type="button"
                className="detail-page__copy-all"
                onClick={handleExportPNG}
                title="导出 PNG 图片"
                aria-label="导出 PNG 图片"
              >
                <Download size={14} />
                <span>导出图片</span>
              </button>
            </div>
          </div>
          <div className="detail-page__palette-grid">
            {sortedColors.map((color, i) => {
              const pct = maxColorCount > 0 ? (color.count / maxColorCount) * 100 : 0;
              const ratio = beadCount > 0 ? ((color.count / beadCount) * 100).toFixed(1) : '0';
              return (
                <button
                  key={i}
                  type="button"
                  className="detail-page__swatch"
                  onClick={() => handleCopyHex(color.hex)}
                  title={`复制 ${color.hex}`}
                  aria-label={`复制色号 ${color.hex} ${color.name} ${color.count}颗`}
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
            总颗数：{beadCount} · 颜色数：{correctedColors.length} · 网格：{cols}×{rows} ·
            难度：{diffStyle.label} · 来源：{template.source}
          </p>
          <table className="detail-page__print-table">
            <thead>
              <tr>
                <th>色块</th>
                <th>色号</th>
                <th>名称</th>
                <th>数量</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {sortedColors.map((color, i) => (
                <tr key={i}>
                  <td>
                    <span
                      className="detail-page__print-swatch"
                      style={{ backgroundColor: color.hex }}
                    />
                  </td>
                  <td>{color.hex}</td>
                  <td>{color.name}</td>
                  <td>{color.count} 颗</td>
                  <td>
                    {beadCount > 0 ? ((color.count / beadCount) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>合计</td>
                <td>{beadCount} 颗</td>
                <td>{correctedColors.length} 种颜色</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div className="detail-page__source">
          <span className="detail-page__source-label">来源：</span>
          <span className="detail-page__source-value">{template.source}</span>
        </div>

        {(prevTemplate || nextTemplate) && (
          <nav className="detail-page__pager" aria-label="模板切换">
            {prevTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--prev"
                onClick={() => onNavigateTemplate?.(prevTemplate.id)}
              >
                <ArrowLeft size={16} />
                <span className="detail-page__pager-label">上一个</span>
                <span className="detail-page__pager-name">{prevTemplate.name}</span>
              </button>
            ) : <span className="detail-page__pager-spacer" />}
            {nextTemplate ? (
              <button
                type="button"
                className="detail-page__pager-btn detail-page__pager-btn--next"
                onClick={() => onNavigateTemplate?.(nextTemplate.id)}
              >
                <span className="detail-page__pager-label">下一个</span>
                <span className="detail-page__pager-name">{nextTemplate.name}</span>
                <ArrowRight size={16} />
              </button>
            ) : <span className="detail-page__pager-spacer" />}
          </nav>
        )}

        {relatedTemplates.length > 0 && (
          <section className="detail-page__related" aria-label="相似模板推荐">
            <h2 className="detail-page__section-title detail-page__section-title--related">相似模板</h2>
            <div className="detail-page__related-list">
              {relatedTemplates.map(rt => (
                <button
                  key={rt.id}
                  type="button"
                  className="detail-page__related-item"
                  onClick={() => onNavigateTemplate?.(rt.id)}
                  title={rt.name}
                >
                  <PixelGrid grid={rt.grid.slice(0, 8).map(r => r.slice(0, 8))} colors={rt.colors} />
                  <span className="detail-page__related-name">{rt.name}</span>
                  <span className="detail-page__related-beads">{getBeadCount(rt)} 颗</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="detail-page__shortcuts">
          <kbd>←</kbd><kbd>→</kbd> 切换模板
          <span className="detail-page__shortcuts-sep">·</span>
          <kbd>Esc</kbd> 返回首页
        </div>
      </main>

      {showTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="返回顶部"
        >
          ↑
        </button>
      )}
    </div>
  );
}
