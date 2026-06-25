import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { BeadTemplate } from '../types/bead';
import Navbar from '../components/Navbar';
import PixelGrid from '../components/PixelGrid';
import { useToast } from '../components/ToastContainer';
import { ArrowLeft, Upload, Image as ImageIcon, Save, RefreshCw } from 'lucide-react';
import { loadImageFromFile, buildTemplateFromImage, pixelizeImage } from '../utils/imageToGrid';
import { useTranslation } from '../context/LanguageContext';

interface UploadPageProps {
  onBack: () => void;
  onNavigate: (hash: string) => void;
  onSearch: (q: string) => void;
  theme: string;
  onToggleTheme: () => void;
  favoritesCount: number;
  onNavigateFavorites: () => void;
  onNavigateColorRef: () => void;
  onNavigateHome: () => void;
  searchQuery: string;
  onSaveTemplate: (template: Omit<BeadTemplate, 'id'>) => BeadTemplate;
}

interface PreviewOptions {
  maxGridSize: number;
  colorThreshold: number;
  dropBackground: boolean;
  backgroundLuminance: number;
}

const DEFAULT_OPTIONS: PreviewOptions = {
  maxGridSize: 24,
  colorThreshold: 0.08,
  dropBackground: true,
  backgroundLuminance: 235,
};

export default function UploadPage({
  onBack,
  onNavigate,
  onSearch,
  theme,
  onToggleTheme,
  favoritesCount,
  onNavigateFavorites,
  onNavigateColorRef,
  onNavigateHome,
  searchQuery,
  onSaveTemplate,
}: UploadPageProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [options, setOptions] = useState<PreviewOptions>(DEFAULT_OPTIONS);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { t } = useTranslation();

  // 像素化预览（实时随参数变化）
  const preview = useMemo(() => {
    if (!img) return null;
    return pixelizeImage(img, options);
  }, [img, options]);

  // 统计预览信息
  const previewStats = useMemo(() => {
    if (!preview) return null;
    const { grid, colors } = preview;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const beadCount = grid.flat().filter(v => v > 0).length;
    return { rows, cols, beadCount, colorCount: colors.length };
  }, [preview]);

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
      const template = buildTemplateFromImage(img, name.trim() || t('upload.toast.defaultName'), options);
      const saved = onSaveTemplate(template);
      showToast(t('upload.toast.saved', { name: saved.name }), 'success');
      // 跳转到详情页查看
      onNavigate(`template/${saved.id}`);
    } catch {
      showToast(t('upload.toast.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [img, name, options, onSaveTemplate, showToast, onNavigate, t]);

  const handleReset = useCallback(() => {
    setImg(null);
    setImgSrc('');
    setName('');
    setOptions(DEFAULT_OPTIONS);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ESC 返回（与 App 全局一致，此处仅清空图片）
  useEffect(() => {
    return () => {
      // 组件卸载清理
    };
  }, []);

  return (
    <div className="page upload-page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favoritesCount}
        onNavigateFavorites={onNavigateFavorites}
        onNavigateColorRef={onNavigateColorRef}
        onNavigateHome={onNavigateHome}
        searchQuery={searchQuery}
      />

      <main id="main-content" className="upload-page__content" tabIndex={-1}>
        <button type="button" className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="upload-page__title">{t('upload.title')}</h1>
        <p className="upload-page__subtitle">
          {t('upload.subtitle')}
        </p>

        <div className="upload-page__layout">
          {/* 左侧：上传区 + 参数 */}
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
                <Upload size={48} className="upload-page__dropzone-icon" />
                <p className="upload-page__dropzone-title">{t('upload.dropzone.title')}</p>
                <p className="upload-page__dropzone-hint">{t('upload.dropzone.hint')}</p>
              </div>
            ) : (
              <div className="upload-page__preview-original">
                <div className="upload-page__preview-header">
                  <span className="upload-page__preview-label"><ImageIcon size={16} /> {t('upload.preview.original')}</span>
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
                <img src={imgSrc} alt={t('upload.preview.originalAlt')} className="upload-page__original-img" />
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
              <div className="upload-page__options">
                <h2 className="upload-page__options-title">{t('upload.options.title')}</h2>
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
              </div>
            )}
          </section>

          {/* 右侧：像素化预览 + 保存 */}
          <section className="upload-page__right">
            {preview ? (
              <>
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

                <div className="upload-page__palette-preview">
                  <span className="upload-page__palette-label">{t('upload.palette.label', { count: preview.colors.length })}</span>
                  <div className="upload-page__palette-list">
                    {preview.colors.map((c, i) => (
                      <div
                        key={i}
                        className="upload-page__palette-swatch"
                        title={t('upload.palette.swatchTitle', { name: c.name, hex: c.hex, count: c.count })}
                      >
                        <span className="upload-page__palette-color" style={{ backgroundColor: c.hex }} />
                        <span className="upload-page__palette-info">
                          <span className="upload-page__palette-hex">{c.hex}</span>
                          <span className="upload-page__palette-count">{t('upload.palette.count', { count: c.count })}</span>
                        </span>
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
                <p className="upload-page__empty-icon">🎨</p>
                <p className="upload-page__empty-text">{t('upload.empty.text')}</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
