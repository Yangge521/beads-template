import { useState, useCallback, useEffect, useRef } from 'react';
import type { BeadTemplate } from '../types/bead';
import Navbar from '../components/Navbar';
import PixelGrid from '../components/PixelGrid';
import { useToast } from '../components/ToastContainer';
import { ArrowLeft, Sparkles, Wand2, Check, Shuffle, Layers, Image as ImageIcon, Upload } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { matchTemplatesByPrompt, matchPresetShape, generatePresetShape, extractGridSize } from '../utils/aiGenerate';
import type { PresetShape } from '../utils/aiGenerate';
import { analyzeImage } from '../utils/imageToGrid';

interface AIGeneratePageProps {
  onBack: () => void;
  onNavigate: (hash: string) => void;
  onSearch: (q: string) => void;
  theme: string;
  onToggleTheme: () => void;
  favoritesCount: number;
  onNavigateFavorites: () => void;
  onNavigateColorRef: () => void;
  onNavigateUpload: () => void;
  onNavigateEditor: () => void;
  onNavigateAi: () => void;
  onNavigateCommunity: () => void;
  onNavigateHome: () => void;
  searchQuery: string;
  templates: BeadTemplate[];
  onSaveTemplate: (template: Omit<BeadTemplate, 'id'>) => BeadTemplate;
}

const PRESET_SHAPE_OPTIONS: { value: PresetShape; labelKey: string; emoji: string }[] = [
  { value: 'heart', labelKey: 'ai.shape.heart', emoji: '❤️' },
  { value: 'star', labelKey: 'ai.shape.star', emoji: '⭐' },
  { value: 'smile', labelKey: 'ai.shape.smile', emoji: '😊' },
  { value: 'flower', labelKey: 'ai.shape.flower', emoji: '🌸' },
  { value: 'diamond', labelKey: 'ai.shape.diamond', emoji: '💎' },
  { value: 'cat', labelKey: 'ai.shape.cat', emoji: '🐱' },
];

const EXAMPLE_PROMPTS = [
  '可爱的猫咪 16格',
  '爱心 红色',
  'star yellow 24x24',
  '花朵 pink',
  '钻石 purple 大',
  '笑脸 emoji',
];

export default function AIGeneratePage({
  onBack,
  onNavigate,
  onSearch,
  theme,
  onToggleTheme,
  favoritesCount,
  onNavigateFavorites,
  onNavigateColorRef,
  onNavigateUpload,
  onNavigateEditor,
  onNavigateAi,
  onNavigateCommunity,
  onNavigateHome,
  searchQuery,
  templates,
  onSaveTemplate,
}: AIGeneratePageProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<'preset' | 'match' | 'image'>('preset');
  const [result, setResult] = useState<{ grid: number[][]; colors: BeadTemplate['colors']; shape?: PresetShape } | null>(null);
  const [matchedTemplates, setMatchedTemplates] = useState<BeadTemplate[]>([]);
  const [presetSize, setPresetSize] = useState(16);
  const [selectedShape, setSelectedShape] = useState<PresetShape | null>(null);
  const [compareList, setCompareList] = useState<{ grid: number[][]; colors: BeadTemplate['colors']; label: string }[]>([]);
  // 图生图状态
  const [imageSize, setImageSize] = useState(24);
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { t, lang } = useTranslation();
  const debounceRef = useRef<number | null>(null);

  // 实时预览：preset 模式下，size 滑块变化时自动重新生成（debounce 200ms）
  useEffect(() => {
    if (mode !== 'preset' || !selectedShape) return;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const r = generatePresetShape(selectedShape, presetSize);
      setResult({ grid: r.grid, colors: r.colors, shape: r.shape });
    }, 200);
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [presetSize, selectedShape, mode]);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      showToast(t('ai.prompt.required'), 'error');
      return;
    }
    setGenerating(true);
    try {
      // 模拟"思考"延迟
      setTimeout(() => {
        const shape = matchPresetShape(prompt);
        if (shape && mode === 'preset') {
          const size = extractGridSize(prompt, presetSize);
          const r = generatePresetShape(shape, size);
          setResult({ grid: r.grid, colors: r.colors, shape: r.shape });
          setSelectedShape(shape);
          setMatchedTemplates([]);
          showToast(t('ai.generated.preset'), 'success');
        } else {
          // 匹配模式：从模板库检索
          const matches = matchTemplatesByPrompt(prompt, templates, 6);
          setMatchedTemplates(matches.map(m => m.template));
          if (matches.length > 0) {
            const top = matches[0].template;
            setResult({ grid: top.grid, colors: top.colors });
            setSelectedShape(null);
            showToast(t('ai.generated.match', { n: matches.length }), 'success');
          } else {
            // 无匹配时，根据形状兜底
            if (shape) {
              const r = generatePresetShape(shape, extractGridSize(prompt, presetSize));
              setResult({ grid: r.grid, colors: r.colors, shape: r.shape });
              setSelectedShape(shape);
              showToast(t('ai.generated.fallback'), 'info');
            } else {
              setResult(null);
              showToast(t('ai.noMatch'), 'info');
            }
          }
        }
        setGenerating(false);
      }, 600);
    } catch {
      setGenerating(false);
      showToast(t('ai.generateFailed'), 'error');
    }
  }, [prompt, mode, templates, presetSize, showToast, t]);

  const handlePresetClick = useCallback((shape: PresetShape) => {
    setSelectedShape(shape);
    setGenerating(true);
    setTimeout(() => {
      const r = generatePresetShape(shape, presetSize);
      setResult({ grid: r.grid, colors: r.colors, shape: r.shape });
      setMatchedTemplates([]);
      setGenerating(false);
      showToast(t('ai.generated.preset'), 'success');
    }, 300);
  }, [presetSize, showToast, t]);

  // 加入对比栏
  const handleAddToCompare = useCallback(() => {
    if (!result) return;
    const label = result.shape ? t(`ai.shape.${result.shape}`) : `${result.grid.length}×${result.grid[0]?.length || 0}`;
    setCompareList(prev => {
      // 去重（按 label + grid 内容）
      const exists = prev.some(c => c.label === label && c.grid.length === result.grid.length);
      if (exists) return prev;
      return [...prev, { grid: result.grid, colors: result.colors, label }].slice(-4);
    });
    showToast(t('ai.compare.added', { label }), 'success');
  }, [result, showToast, t]);

  // 清空对比
  const handleClearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const handleSave = useCallback(() => {
    if (!result) return;
    const r = result;
    const tpl: Omit<BeadTemplate, 'id'> = {
      name: prompt.trim().slice(0, 30) || t('ai.defaultName'),
      category: 'custom',
      description: t('ai.savedDesc', { prompt: prompt.trim() }),
      grid: r.grid,
      colors: r.colors,
      beadCount: r.grid.flat().filter(v => v > 0).length,
      difficulty: r.grid.length <= 16 ? 'easy' : r.grid.length <= 28 ? 'medium' : 'hard',
      tags: ['ai-generated', 'custom'],
      source: 'AI',
    };
    const saved = onSaveTemplate(tpl);
    showToast(t('ai.saved', { name: saved.name }), 'success');
    onNavigate(`template/${saved.id}`);
  }, [result, prompt, onSaveTemplate, onNavigate, showToast, t]);

  const handleEditInEditor = useCallback(() => {
    if (!result) return;
    const r = result;
    // 通过 sessionStorage 传递给编辑器
    const tpl: Omit<BeadTemplate, 'id'> = {
      name: prompt.trim().slice(0, 30) || t('ai.defaultName'),
      category: 'custom',
      description: t('ai.savedDesc', { prompt: prompt.trim() }),
      grid: r.grid,
      colors: r.colors,
      beadCount: r.grid.flat().filter(v => v > 0).length,
      difficulty: 'medium',
      tags: ['ai-generated', 'custom'],
      source: 'AI',
    };
    sessionStorage.setItem('editor-draft', JSON.stringify(tpl));
    onNavigate('editor');
  }, [result, prompt, onNavigate, t]);

  const handleShuffle = useCallback(() => {
    const shapes: PresetShape[] = ['heart', 'star', 'smile', 'flower', 'diamond', 'cat'];
    const random = shapes[Math.floor(Math.random() * shapes.length)];
    const sizes = [12, 16, 20, 24, 32];
    const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
    setPresetSize(randomSize);
    handlePresetClick(random);
  }, [handlePresetClick]);

  // 图生图：上传图片分析
  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(t('ai.image.invalidType'), 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('ai.image.tooLarge'), 'error');
      return;
    }
    setAnalyzing(true);
    // 预览
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    try {
      const langCode = lang === 'en' ? 'en' : 'zh';
      const r = await analyzeImage(file, imageSize, langCode);
      setResult({ grid: r.grid, colors: r.colors });
      setPrompt(r.prompt);
      setSelectedShape(null);
      setMatchedTemplates([]);
      showToast(t('ai.image.analyzed', { w: r.grid[0]?.length ?? 0, h: r.grid.length }), 'success');
    } catch {
      showToast(t('ai.image.failed'), 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [imageSize, lang, showToast, t]);

  // 拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const resultRows = result?.grid.length || 0;
  const resultCols = resultRows > 0 ? (result?.grid[0]?.length || 0) : 0;

  return (
    <div className="page ai-page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favoritesCount}
        onNavigateFavorites={onNavigateFavorites}
        onNavigateColorRef={onNavigateColorRef}
        onNavigateUpload={onNavigateUpload}
        onNavigateEditor={onNavigateEditor}
        onNavigateAi={onNavigateAi}
        onNavigateCommunity={onNavigateCommunity}
        onNavigateHome={onNavigateHome}
        searchQuery={searchQuery}
      />

      <main id="main-content" className="ai-page__content" tabIndex={-1}>
        <button type="button" className="detail-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="ai-page__title">
          <Sparkles size={28} aria-hidden="true" /> {t('ai.title')}
        </h1>
        <p className="ai-page__subtitle">{t('ai.subtitle')}</p>

        <div className="ai-page__layout">
          <section className="ai-page__left">
            <div className="ai-page__input-group">
              <label htmlFor="ai-prompt" className="ai-page__label">
                {t('ai.prompt.label')}
              </label>
              <textarea
                id="ai-prompt"
                className="ai-page__textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('ai.prompt.placeholder')}
                rows={3}
              />
              <div className="ai-page__examples">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    className="ai-page__example-chip"
                    onClick={() => setPrompt(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-page__mode">
              <label className="ai-page__label">{t('ai.mode.label')}</label>
              <div className="ai-page__mode-tabs">
                <button
                  type="button"
                  className={`ai-page__mode-tab ${mode === 'preset' ? 'active' : ''}`}
                  onClick={() => setMode('preset')}
                  aria-pressed={mode === 'preset'}
                >
                  {t('ai.mode.preset')}
                </button>
                <button
                  type="button"
                  className={`ai-page__mode-tab ${mode === 'match' ? 'active' : ''}`}
                  onClick={() => setMode('match')}
                  aria-pressed={mode === 'match'}
                >
                  {t('ai.mode.match')}
                </button>
                <button
                  type="button"
                  className={`ai-page__mode-tab ${mode === 'image' ? 'active' : ''}`}
                  onClick={() => setMode('image')}
                  aria-pressed={mode === 'image'}
                >
                  <ImageIcon size={14} aria-hidden="true" />
                  {t('ai.mode.image')}
                </button>
              </div>
            </div>

            {mode === 'image' && (
              <div className="ai-page__image-upload">
                <label className="ai-page__label">
                  {t('ai.size.label')}: {imageSize}×{imageSize}
                </label>
                <input
                  type="range"
                  min="8"
                  max="40"
                  value={imageSize}
                  onChange={(e) => setImageSize(Number(e.target.value))}
                  aria-label={t('ai.size.label')}
                />
                <div
                  className={`ai-page__drop-zone ${analyzing ? 'ai-page__drop-zone--analyzing' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => imageInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); imageInputRef.current?.click(); } }}
                  aria-label={t('ai.image.dropHint')}
                >
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="" className="ai-page__drop-preview" aria-hidden="true" />
                  ) : (
                    <>
                      <Upload size={32} aria-hidden="true" />
                      <span className="ai-page__drop-text">{t('ai.image.dropHint')}</span>
                      <span className="ai-page__drop-sub">{t('ai.image.dropSub')}</span>
                    </>
                  )}
                  {analyzing && <div className="ai-page__analyzing-overlay"><div className="ai-page__spinner" /><span>{t('ai.image.analyzing')}</span></div>}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="ai-page__file-input"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>
            )}

            {mode === 'preset' && (
              <div className="ai-page__presets">
                <label className="ai-page__label">
                  {t('ai.size.label')}: {presetSize}×{presetSize}
                </label>
                <input
                  type="range"
                  min="8"
                  max="40"
                  value={presetSize}
                  onChange={(e) => setPresetSize(Number(e.target.value))}
                />
                <div className="ai-page__shape-grid">
                  {PRESET_SHAPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className="ai-page__shape-btn"
                      onClick={() => handlePresetClick(opt.value)}
                      title={t(opt.labelKey)}
                      aria-label={t(opt.labelKey)}
                    >
                      <span aria-hidden="true" className="ai-page__shape-emoji">{opt.emoji}</span>
                      <span className="ai-page__shape-label">{t(opt.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="ai-page__actions">
              <button
                type="button"
                className="ai-page__btn ai-page__btn--primary"
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
              >
                <Wand2 size={18} aria-hidden="true" />
                {generating ? t('ai.generating') : t('ai.generate')}
              </button>
              <button
                type="button"
                className="ai-page__btn ai-page__btn--secondary"
                onClick={handleShuffle}
                disabled={generating}
              >
                <Shuffle size={18} aria-hidden="true" />
                {t('ai.shuffle')}
              </button>
            </div>

            {matchedTemplates.length > 0 && (
              <div className="ai-page__matched">
                <h3 className="ai-page__matched-title">{t('ai.matched.title')}</h3>
                <div className="ai-page__matched-list">
                  {matchedTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="ai-page__matched-item"
                      onClick={() => setResult({ grid: tpl.grid, colors: tpl.colors })}
                    >
                      <PixelGrid grid={tpl.grid} colors={tpl.colors} />
                      <span className="ai-page__matched-name">{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="ai-page__right">
            {!result ? (
              <div className="ai-page__empty">
                <Sparkles size={64} aria-hidden="true" className="ai-page__empty-icon" />
                <p>{t('ai.empty')}</p>
              </div>
            ) : (
              <div className="ai-page__result">
                <div className="ai-page__result-header">
                  <h2 className="ai-page__result-title">
                    {result.shape ? t(`ai.shape.${result.shape}`) : t('ai.result.title')}
                  </h2>
                  <span className="ai-page__result-meta">
                    {resultRows}×{resultCols} · {result.colors.length} {t('ai.colors')}
                  </span>
                </div>
                <div className="ai-page__result-grid">
                  <PixelGrid grid={result.grid} colors={result.colors} interactive={false} />
                </div>
                <div className="ai-page__result-actions">
                  <button
                    type="button"
                    className="ai-page__btn ai-page__btn--primary"
                    onClick={handleSave}
                  >
                    <Check size={18} aria-hidden="true" />
                    {t('ai.save')}
                  </button>
                  <button
                    type="button"
                    className="ai-page__btn ai-page__btn--secondary"
                    onClick={handleEditInEditor}
                  >
                    {t('ai.toEditor')}
                  </button>
                  <button
                    type="button"
                    className="ai-page__btn ai-page__btn--ghost"
                    onClick={handleAddToCompare}
                    disabled={compareList.length >= 4}
                    title={t('ai.compare.add')}
                  >
                    <Layers size={18} aria-hidden="true" />
                    {t('ai.compare.add')}
                  </button>
                </div>
              </div>
            )}

            {/* 多候选对比栏 */}
            {compareList.length > 0 && (
              <div className="ai-page__compare">
                <div className="ai-page__compare-header">
                  <h3 className="ai-page__compare-title">{t('ai.compare.title')}</h3>
                  <button
                    type="button"
                    className="ai-page__btn ai-page__btn--ghost"
                    onClick={handleClearCompare}
                  >
                    {t('common.clear')}
                  </button>
                </div>
                <div className="ai-page__compare-grid">
                  {compareList.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className="ai-page__compare-item"
                      onClick={() => setResult({ grid: c.grid, colors: c.colors })}
                      title={c.label}
                    >
                      <PixelGrid grid={c.grid} colors={c.colors} />
                      <span className="ai-page__compare-label">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
