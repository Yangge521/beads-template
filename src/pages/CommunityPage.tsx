import { useState, useCallback, useEffect } from 'react';
import type { BeadTemplate } from '../types/bead';
import Navbar from '../components/Navbar';
import PixelGrid from '../components/PixelGrid';
import { useToast } from '../components/ToastContainer';
import { ArrowLeft, Share2, Copy, Download, Trash2, Link as LinkIcon, Upload as UploadIcon } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { encodeShareCode, decodeShareCode, buildShareUrl } from '../utils/shareCode';
import { useSharedTemplates } from '../hooks/useSharedTemplates';
import { useNavigation } from '../context/NavigationContext';

interface CommunityPageProps {
  templates: BeadTemplate[];
  onSaveTemplate: (template: Omit<BeadTemplate, 'id'>) => BeadTemplate;
}

export default function CommunityPage({
  templates,
  onSaveTemplate,
}: CommunityPageProps) {
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
  const [importCode, setImportCode] = useState('');
  const [importedPreview, setImportedPreview] = useState<BeadTemplate | null>(null);
  const { records, addShared, incrementDownload, removeShared, clearShared } = useSharedTemplates();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleShareCurrent = useCallback((tpl: BeadTemplate) => {
    const code = encodeShareCode(tpl);
    addShared(tpl, code);
    // 复制到剪贴板
    navigator.clipboard?.writeText(code).then(
      () => showToast(t('community.copiedCode'), 'success'),
      () => showToast(t('community.copyFailed'), 'error')
    );
    showToast(t('community.shared', { name: tpl.name }), 'success');
    return code;
  }, [addShared, showToast, t]);

  const handleShareByUrl = useCallback((tpl: BeadTemplate) => {
    const url = buildShareUrl(tpl);
    navigator.clipboard?.writeText(url).then(
      () => showToast(t('community.urlCopied'), 'success'),
      () => showToast(t('community.copyFailed'), 'error')
    );
  }, [showToast, t]);

  const handleImportCode = useCallback(() => {
    const code = importCode.trim();
    if (!code) {
      showToast(t('community.codeRequired'), 'error');
      return;
    }
    const tpl = decodeShareCode(code);
    if (!tpl) {
      showToast(t('community.codeInvalid'), 'error');
      return;
    }
    setImportedPreview(tpl);
    showToast(t('community.decoded', { name: tpl.name }), 'success');
  }, [importCode, showToast, t]);

  const handleSaveImported = useCallback(() => {
    if (!importedPreview) return;
    const { id: _id, ...rest } = importedPreview;
    void _id;
    const saved = onSaveTemplate(rest);
    incrementDownload(importCode.trim());
    showToast(t('community.imported', { name: saved.name }), 'success');
    setImportedPreview(null);
    setImportCode('');
    navigate(`template/${saved.id}`);
  }, [importedPreview, onSaveTemplate, incrementDownload, importCode, navigate, showToast, t]);

  // 从 URL 自动检测分享码（一次性）
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('share=')) {
      const code = hash.slice('share='.length);
      const tpl = decodeShareCode(code);
      if (tpl) {
        setImportCode(code);
        setImportedPreview(tpl);
        // 清除 hash 避免重复触发
        history.replaceState(null, '', window.location.pathname);
      }
    }
   
  }, []);

  return (
    <div className="page community-page">
      <Navbar
        onSearch={onSearch}
        onToggleTheme={onToggleTheme}
        theme={theme}
        favoritesCount={favoritesCount}
        onNavigateFavorites={() => navigateTo('favorites')}
        onNavigateColorRef={() => navigateTo('colors')}
        onNavigateUpload={() => navigateTo('upload')}
        onNavigateEditor={() => navigateTo('editor')}
        onNavigateAi={() => navigateTo('ai')}
        onNavigateCommunity={() => navigateTo('community')}
        onNavigateHome={goHome}
        searchQuery={searchQuery}
      />

      <main id="main-content" className="community-page__content" tabIndex={-1}>
        <button type="button" className="detail-page__back" onClick={goHome}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="community-page__title">
          <Share2 size={28} aria-hidden="true" /> {t('community.title')}
        </h1>
        <p className="community-page__subtitle">{t('community.subtitle')}</p>

        <div className="community-page__layout">
          {/* 左侧：导入分享码 */}
          <section className="community-page__import">
            <h2 className="community-page__section-title">
              <UploadIcon size={20} aria-hidden="true" /> {t('community.import.title')}
            </h2>
            <textarea
              className="community-page__code-input"
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder={t('community.import.placeholder')}
              rows={4}
            />
            <button
              type="button"
              className="community-page__btn community-page__btn--primary"
              onClick={handleImportCode}
            >
              <LinkIcon size={18} aria-hidden="true" />
              {t('community.import.button')}
            </button>

            {importedPreview && (
              <div className="community-page__preview">
                <h3 className="community-page__preview-title">{importedPreview.name}</h3>
                <div className="community-page__preview-grid">
                  <PixelGrid grid={importedPreview.grid} colors={importedPreview.colors} />
                </div>
                <p className="community-page__preview-meta">
                  {importedPreview.grid.length}×{importedPreview.grid[0]?.length || 0} · {importedPreview.colors.length} {t('community.colors')}
                </p>
                <button
                  type="button"
                  className="community-page__btn community-page__btn--primary"
                  onClick={handleSaveImported}
                >
                  <Download size={18} aria-hidden="true" />
                  {t('community.import.save')}
                </button>
              </div>
            )}
          </section>

          {/* 右侧：我的分享记录 */}
          <section className="community-page__records">
            <div className="community-page__records-header">
              <h2 className="community-page__section-title">
                <Share2 size={20} aria-hidden="true" /> {t('community.records.title')}
              </h2>
              {records.length > 0 && (
                <button
                  type="button"
                  className="community-page__btn community-page__btn--danger"
                  onClick={() => { clearShared(); showToast(t('community.records.cleared'), 'info'); }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  {t('community.records.clear')}
                </button>
              )}
            </div>

            {records.length === 0 ? (
              <div className="community-page__empty">
                <Share2 size={48} aria-hidden="true" className="community-page__empty-icon" />
                <p>{t('community.records.empty')}</p>
                <p className="community-page__empty-hint">{t('community.records.emptyHint')}</p>
              </div>
            ) : (
              <div className="community-page__record-list">
                {records.map(r => (
                  <div key={r.code} className="community-page__record-item">
                    <div className="community-page__record-thumb">
                      <PixelGrid grid={r.template.grid} colors={r.template.colors} />
                    </div>
                    <div className="community-page__record-info">
                      <h3 className="community-page__record-name">{r.template.name}</h3>
                      <p className="community-page__record-date">
                        {new Date(r.sharedAt).toLocaleString()}
                      </p>
                      <p className="community-page__record-downloads">
                        {t('community.downloads')}: {r.downloads}
                      </p>
                    </div>
                    <div className="community-page__record-actions">
                      <button
                        type="button"
                        className="community-page__icon-btn"
                        title={t('community.copyCode')}
                        onClick={() => {
                          navigator.clipboard?.writeText(r.code).then(
                            () => showToast(t('community.copiedCode'), 'success'),
                            () => showToast(t('community.copyFailed'), 'error')
                          );
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        className="community-page__icon-btn"
                        title={t('community.copyUrl')}
                        onClick={() => handleShareByUrl(r.template)}
                      >
                        <LinkIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="community-page__icon-btn community-page__icon-btn--danger"
                        title={t('community.delete')}
                        onClick={() => { removeShared(r.code); showToast(t('community.deleted'), 'info'); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 快速分享：从我的模板库选 */}
        <section className="community-page__quick-share">
          <h2 className="community-page__section-title">{t('community.quickShare.title')}</h2>
          <p className="community-page__quick-share-hint">{t('community.quickShare.hint')}</p>
          <div className="community-page__quick-grid">
            {templates.slice(0, 12).map(tpl => (
              <button
                key={tpl.id}
                type="button"
                className="community-page__quick-item"
                onClick={() => handleShareCurrent(tpl)}
              >
                <PixelGrid grid={tpl.grid} colors={tpl.colors} />
                <span className="community-page__quick-name">{tpl.name}</span>
                <Share2 size={14} aria-hidden="true" className="community-page__quick-icon" />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
