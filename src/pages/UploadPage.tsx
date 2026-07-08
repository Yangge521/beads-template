import { useState, useCallback, useRef, useMemo } from 'react';
import type { BeadTemplate } from '../types/bead';
import Navbar from '../components/Navbar';
import PixelGrid from '../components/PixelGrid';
import { useToast } from '../components/ToastContainer';
import { ArrowLeft, ArrowRight, Upload, Image as ImageIcon, Save, RefreshCw, Sliders } from 'lucide-react';
import { loadImageFromFile, buildTemplateFromImage } from '../utils/imageToGrid';
import { pixelizeImageEnhanced } from '../utils/imageToGridEnhanced';
import type { DitherAlgorithm } from '../utils/imageToGridEnhanced';
import { lookupByHex } from '../utils/brandLookup';
import { useTranslation } from '../context/LanguageContext';
import { useNavigation } from '../context/NavigationContext';

interface UploadPageProps {
  onSaveTemplate: (template: Omit<BeadTemplate, 'id'>) => BeadTemplate;
}

interface PreviewOptions {
  maxGridSize: number;
  colorThreshold: number;
  dropBackground: boolean;
  backgroundLuminance: number;
  dither: DitherAlgorithm;
  edgeEnhance: boolean;
  edgeStrength: number;
  maxColors: number;
}

const DEFAULT_OPTIONS: PreviewOptions = {
  maxGridSize: 24,
  colorThreshold: 0.08,
  dropBackground: true,
  backgroundLuminance: 235,
  dither: 'none',
  edgeEnhance: false,
  edgeStrength: 0.5,
  maxColors: 16,
};

export default function UploadPage({
  onSaveTemplate,
}: UploadPageProps) {
  const nav = useNavigation();
  const {
    navigate,
    goHome,
    navigateTo,
    searchQuery,
    onSearch,
    theme,
    onToggleTheme,
    favoritesCount,
  } = nav;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [options, setOptions] = useState<PreviewOptions>(DEFAULT_OPTIONS);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { t } = useTranslation();

  // 像素化预览（实时随参数变化，使用增强算法）
  const preview = useMemo(() => {
    if (!img) return null;
    try {
      return pixelizeImageEnhanced(img, {
        maxGridSize: options.maxGridSize,
        colorThreshold: options.colorThreshold,
        dropBackground: options.dropBackground,
        backgroundLuminance: options.backgroundLuminance,
        colorNamePrefix: t('upload.build.colorNamePrefix'),
        dither: options.dither,
        edgeEnhance: options.edgeEnhance,
        edgeStrength: options.edgeStrength,
        maxColors: options.maxColors,
      });
    } catch {
      return null;
    }
  }, [img, options, t]);

  // 统计预览信息
  const previewStats = useMemo(() => {
    if (!preview) return null;
    const { grid, colors } = preview;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const beadCount = grid.flat().filter(v => v > 0).length;
    return { rows, cols, beadCount, colorCount: colors.length };
  }, [preview]);

  // 按用量降序排序的颜色卡片，并计算占比
  const sortedColorCards = useMemo(() => {
    if (!preview || !previewStats) return [];
    const total = previewStats.beadCount || 1;
    return preview.colors
      .map((c) => {
        const count = c.count ?? 0;
        const pct = Math.round((count / total) * 100);
        const brand = lookupByHex(c.hex);
        const brandText = brand
          ? [brand.perler, brand.artkal].filter(Boolean).join(' · ')
          : null;
        return { ...c, count, pct, brandText };
      })
      .sort((a, b) => b.count - a.count);
  }, [preview, previewStats]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(t('upload.toast.imageRequired'), 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('upload.toast.tooLarge'), 'error');
      return;
    }
    try {
      const image = await loadImageFromFile(file);
      setImg(image);
      // 保留原始 src 用于原图预览
      const reader = new FileReader();
      reader.onload = () => setImgSrc(reader.result as string);
      reader.readAsDataURL(file);
      // 默认名称用文件名
      const baseName = file.name.replace(/\.[^.]+$/, '');
      setName(baseName || t('upload.toast.defaultName'));
      showToast(t('upload.toast.loaded'), 'success');
    } catch {
      showToast(t('upload.toast.loadFailed'), 'error');
    }
  }, [showToast, t]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSave = useCallback(() => {
    if (!img) {
      showToast(t('upload.toast.noImage'), 'error');
      return;
    }
    setSaving(true);
    try {
      const template = buildTemplateFromImage(img, name.trim() || t('upload.toast.defaultName'), {
        ...options,
        labels: {
          defaultName: t('upload.toast.defaultName'),
          description: t('upload.build.description'),
          tags: [t('upload.build.tagCustom'), t('upload.build.tagUpload')],
          source: t('upload.build.source'),
          colorNamePrefix: t('upload.build.colorNamePrefix'),
        },
      });
      // 边界：全透明/全白背景图可能像素化后无颜色，拒绝保存并提示调整参数
      if (template.colors.length === 0 || template.beadCount === 0) {
        showToast(t('upload.toast.noColors'), 'error');
        setSaving(false);
        return;
      }
      const saved = onSaveTemplate(template);
      showToast(t('upload.toast.saved', { name: saved.name }), 'success');
      // 跳转到详情页查看
      navigate(`template/${saved.id}`);
    } catch {
      showToast(t('upload.toast.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [img, name, options, onSaveTemplate, showToast, navigate, t]);

  const handleReset = useCallback(() => {
    setImg(null);
    setImgSrc('');
    setName('');
    setOptions(DEFAULT_OPTIONS);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="page upload-page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favoritesCount}
        onNavigateFavorites={() => navigateTo('favorites')}
        onNavigateColorRef={() => navigateTo('colors')}
        onNavigateUpload={() => {}}
        onNavigateEditor={() => navigateTo('editor')}
        onNavigateAi={() => navigateTo('ai')}
        onNavigateCommunity={() => navigateTo('community')}
        onNavigateHome={goHome}
        searchQuery={searchQuery}
      />

      <main id="main-content" className="upload-page__content" tabIndex={-1}>
        <button type="button" className="detail-page__back" onClick={goHome}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="upload-page__title">{t('upload.title')}</h1>
        <p className="upload-page__subtitle">
          {t('upload.subtitle')}
        </p>

        <div className="upload-page__layout">
          {/* 左侧：原图展示 + 参数面板 */}
          <section className="upload-page__left">
            {!img ? (
              <div
                className={`upload-page__dropzone ${dragOver ? 'upload-page__dropzone--over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label={t('upload.dropzone.ariaLabel')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <Upload size={48} className="upload-page__dropzone-icon" aria-hidden="true" />
                <p className="upload-page__dropzone-title">{t('upload.photo.upload')}</p>
                <p className="upload-page__dropzone-hint">{t('upload.dropzone.hint')}</p>
              </div>
            ) : (
              <div className="upload-page__photo-card">
                <div className="upload-page__photo-header">
                  <span className="upload-page__photo-label">
                    <ImageIcon size={16} aria-hidden="true" />
                    {t('upload.photo.title')}
                  </span>
                  <button
                    type="button"
                    className="upload-page__icon-btn"
                    onClick={handleReset}
                    aria-label={t('upload.preview.reset.ariaLabel')}
                    title={t('upload.preview.reset.title')}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="upload-page__photo-wrapper">
                  <img
                    key={imgSrc}
                    src={imgSrc}
                    alt={t('upload.preview.originalAlt')}
                    className="upload-page__photo"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {previewStats && (
                    <span className="upload-page__color-badge">
                      {t('upload.photo.detected', { count: previewStats.colorCount })}
                    </span>
                  )}
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="upload-page__file-input"
              aria-hidden="true"
              tabIndex={-1}
            />

            {img && (
              <details className="upload-page__options" open>
                <summary className="upload-page__options-summary">
                  <Sliders size={16} aria-hidden="true" />
                  <span>{t('upload.options.title')}</span>
                  {previewStats && (
                    <span className="upload-page__options-stats">
                      {t('upload.preview.stats', { cols: previewStats.cols, rows: previewStats.rows, beads: previewStats.beadCount, colors: previewStats.colorCount })}
                    </span>
                  )}
                </summary>
                <div className="upload-page__options-body">
                  <label className="upload-page__option">
                    <span className="upload-page__option-label">{t('upload.options.gridSize', { n: options.maxGridSize })}</span>
                    <input
                      type="range"
                      min="8"
                      max="40"
                      value={options.maxGridSize}
                      onChange={(e) => setOptions(o => ({ ...o, maxGridSize: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="upload-page__option">
                    <span className="upload-page__option-label">{t('upload.options.colorMerge', { pct: Math.round(options.colorThreshold * 100) })}</span>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={Math.round(options.colorThreshold * 100)}
                      onChange={(e) => setOptions(o => ({ ...o, colorThreshold: Number(e.target.value) / 100 }))}
                    />
                    <span className="upload-page__option-hint">{t('upload.options.colorMerge.hint')}</span>
                  </label>
                  <label className="upload-page__option upload-page__option--row">
                    <input
                      type="checkbox"
                      checked={options.dropBackground}
                      onChange={(e) => setOptions(o => ({ ...o, dropBackground: e.target.checked }))}
                    />
                    <span>{t('upload.options.dropBg')}</span>
                  </label>
                  {options.dropBackground && (
                    <label className="upload-page__option">
                      <span className="upload-page__option-label">{t('upload.options.bgThreshold', { n: options.backgroundLuminance })}</span>
                      <input
                        type="range"
                        min="200"
                        max="255"
                        value={options.backgroundLuminance}
                        onChange={(e) => setOptions(o => ({ ...o, backgroundLuminance: Number(e.target.value) }))}
                      />
                      <span className="upload-page__option-hint">{t('upload.options.bgThreshold.hint')}</span>
                    </label>
                  )}
                  <label className="upload-page__option">
                    <span className="upload-page__option-label">{t('upload.algorithm.label')}</span>
                    <select
                      value={options.dither}
                      onChange={(e) => setOptions(o => ({ ...o, dither: e.target.value as DitherAlgorithm }))}
                    >
                      <option value="none">{t('upload.algorithm.none')}</option>
                      <option value="floyd-steinberg">{t('upload.algorithm.floyd-steinberg')}</option>
                    </select>
                  </label>
                  <label className="upload-page__option upload-page__option--row">
                    <input
                      type="checkbox"
                      checked={options.edgeEnhance}
                      onChange={(e) => setOptions(o => ({ ...o, edgeEnhance: e.target.checked }))}
                    />
                    <span>{t('upload.algorithm.edgeEnhance')}</span>
                  </label>
                  {options.edgeEnhance && (
                    <label className="upload-page__option">
                      <span className="upload-page__option-label">{t('upload.algorithm.edgeStrength')} ({Math.round(options.edgeStrength * 100)}%)</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={Math.round(options.edgeStrength * 100)}
                        onChange={(e) => setOptions(o => ({ ...o, edgeStrength: Number(e.target.value) / 100 }))}
                      />
                    </label>
                  )}
                  <label className="upload-page__option">
                    <span className="upload-page__option-label">{t('upload.maxColors')}: {options.maxColors}</span>
                    <input
                      type="range"
                      min="4"
                      max="30"
                      value={options.maxColors}
                      onChange={(e) => setOptions(o => ({ ...o, maxColors: Number(e.target.value) }))}
                    />
                  </label>
                  <p className="upload-page__option-hint">{t('upload.algorithm.hint')}</p>
                </div>
              </details>
            )}
          </section>

          {/* 中间转换指示箭头（照片存在时显示） */}
          {img && (
            <div
              className="upload-page__conversion"
              aria-hidden="true"
              title={t('upload.conversion.arrow')}
            >
              <ArrowRight size={18} />
            </div>
          )}

          {/* 右侧：像素化预览 + 颜色卡片 + 保存 */}
          <section className="upload-page__right">
            {preview ? (
              <>
                <div className="upload-page__preview-card">
                  <div className="upload-page__preview-header">
                    <span className="upload-page__preview-label">{t('upload.preview.pixel')}</span>
                    {previewStats && (
                      <span className="upload-page__preview-stats">
                        {t('upload.preview.stats', { cols: previewStats.cols, rows: previewStats.rows, beads: previewStats.beadCount, colors: previewStats.colorCount })}
                      </span>
                    )}
                  </div>
                  <div className="upload-page__pixel-preview">
                    <PixelGrid grid={preview.grid} colors={preview.colors} showGridLines={false} />
                  </div>
                </div>

                <div className="upload-page__palette-card">
                  <span className="upload-page__palette-label">
                    {t('upload.palette.label', { count: preview.colors.length })}
                  </span>
                  <div className="upload-page__color-cards">
                    {sortedColorCards.map((c, idx) => (
                      <div
                        key={c.hex}
                        className="upload-page__color-card"
                        style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
                        title={t('upload.palette.swatchTitle', { name: c.name, hex: c.hex, count: c.count })}
                      >
                        <span
                          className="upload-page__color-card-swatch"
                          style={{ backgroundColor: c.hex }}
                          aria-hidden="true"
                        />
                        <div className="upload-page__color-card-body">
                          <div className="upload-page__color-card-row">
                            <span className="upload-page__color-card-hex">{c.hex}</span>
                            <span className="upload-page__color-card-pct">
                              {t('upload.colorCard.usage', { pct: c.pct })}
                            </span>
                          </div>
                          <div className="upload-page__color-card-bar" aria-hidden="true">
                            <span
                              className="upload-page__color-card-bar-fill"
                              style={{ width: `${c.pct}%`, backgroundColor: c.hex }}
                            />
                          </div>
                          <div className="upload-page__color-card-meta">
                            <span className="upload-page__color-card-beads">
                              {t('upload.colorCard.beads', { count: c.count })}
                            </span>
                            <span
                              className="upload-page__color-card-brand"
                              title={t('upload.colorCard.brand')}
                            >
                              {c.brandText ?? t('upload.colorCard.brandNone')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="upload-page__save-area">
                  <label className="upload-page__name-label">
                    <span>{t('upload.name.label')}</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('upload.name.placeholder')}
                      maxLength={30}
                      className="upload-page__name-input"
                    />
                  </label>
                  <button
                    type="button"
                    className="upload-page__save-btn"
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                  >
                    <Save size={16} />
                    {saving ? t('upload.save.saving') : t('upload.save.save')}
                  </button>
                </div>
              </>
            ) : (
              <div className="upload-page__empty">
                <p className="upload-page__empty-icon" aria-hidden="true">🎨</p>
                <p className="upload-page__empty-text">{t('upload.empty.text')}</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
