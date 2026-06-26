import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { BeadTemplate } from '../types/bead';
import TemplateCard from '../components/TemplateCard';
import { ArrowLeft, Trash2, Download, Upload, ClipboardList, Table } from 'lucide-react';
import { getBeadCount } from '../utils/beadStats';
import { aggregateMaterials, getTotalBeads } from '../utils/aggregateMaterials';
import { exportMaterialListCSV } from '../utils/exportMaterialCSV';
import { useToast } from '../components/ToastContainer';
import { useTranslation } from '../context/LanguageContext';

interface FavoritesPageProps {
  templates: BeadTemplate[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onClearFavorites: () => void;
  onBack: () => void;
  onNavigate: (hash: string) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

type SortKey = 'recent' | 'name' | 'beads';

// label 字段存储翻译键，渲染时通过 t() 解析
const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'favorites.sort.recent' },
  { value: 'name', label: 'favorites.sort.name' },
  { value: 'beads', label: 'favorites.sort.beads' },
];

export default function FavoritesPage({
  templates,
  favorites,
  onToggleFavorite,
  onClearFavorites,
  onBack,
  onNavigate,
  onExportData,
  onImportData,
}: FavoritesPageProps) {
  const [confirming, setConfirming] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [showSummary, setShowSummary] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { t, lang } = useTranslation();

  const favoritedTemplates = useMemo(() => {
    const list = templates.filter(tpl => favorites.includes(tpl.id));
    switch (sortKey) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, lang));
        break;
      case 'beads':
        list.sort((a, b) => getBeadCount(b) - getBeadCount(a));
        break;
      case 'recent':
      default:
        // favorites 数组顺序即为收藏顺序（最新的在前）
        list.sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));
        break;
    }
    return list;
  }, [templates, favorites, sortKey, lang]);

  // 跨模板材料汇总：按 hex 聚合所有收藏模板的颜色用量
  const materialSummary = useMemo(
    () => aggregateMaterials(favoritedTemplates),
    [favoritedTemplates]
  );
  const materialTotalBeads = useMemo(
    () => getTotalBeads(materialSummary),
    [materialSummary]
  );

  const handleExportMaterial = useCallback(() => {
    if (materialSummary.length === 0) return;
    try {
      const ok = exportMaterialListCSV(
        materialSummary,
        {
          headerNo: t('favorites.material.colNo'),
          headerHex: t('favorites.material.colHex'),
          headerName: t('favorites.material.colName'),
          headerCount: t('favorites.material.colCount'),
          headerRatio: t('favorites.material.colRatio'),
          headerTemplates: t('favorites.material.colTemplates'),
          totalLabel: t('favorites.material.totalLabel'),
        },
        t('favorites.material.summary')
      );
      showToast(ok ? t('favorites.material.exported') : t('detail.toast.exportFailed'), ok ? 'success' : 'error');
    } catch {
      showToast(t('detail.toast.exportFailed'), 'error');
    }
  }, [materialSummary, showToast, t]);

  const handleClearClick = () => {
    if (favoritedTemplates.length === 0) return;
    lastFocusedRef.current = document.activeElement as HTMLElement;
    setConfirming(true);
  };

  const handleConfirmClear = () => {
    onClearFavorites();
    setConfirming(false);
  };

  const closeModal = useCallback(() => setConfirming(false), []);

  // 弹窗焦点管理：打开时聚焦取消按钮，ESC 关闭，Tab 循环
  useEffect(() => {
    if (!confirming) return;
    const modal = modalRef.current;
    if (!modal) return;

    // 聚焦到取消按钮（更安全的默认选择）
    const focusTimer = setTimeout(() => cancelBtnRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
      if (e.key === 'Tab' && modal) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [confirming, closeModal]);

  // 关闭弹窗后焦点返回触发按钮
  useEffect(() => {
    if (!confirming) {
      // 弹窗刚关闭时，焦点回到触发元素
      lastFocusedRef.current?.focus();
      lastFocusedRef.current = null;
    }
  }, [confirming]);

  return (
    <div className="page favorites-page">
      <header className="favorites-page__header">
        <button type="button" className="favorites-page__back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>
        <div className="favorites-page__title-row">
          <h1 className="favorites-page__title">{t('favorites.title', { count: favoritedTemplates.length })}</h1>
          <div className="favorites-page__actions">
            <div className="favorites-page__data-sync" role="group" aria-label={t('favorites.dataSync.ariaLabel')}>
              <button
                type="button"
                className="favorites-page__sync-btn"
                onClick={onExportData}
                aria-label={t('favorites.export.ariaLabel')}
                title={t('favorites.export.title')}
              >
                <Download size={16} />
                <span>{t('favorites.export')}</span>
              </button>
              <button
                type="button"
                className="favorites-page__sync-btn"
                onClick={() => importInputRef.current?.click()}
                aria-label={t('favorites.import.ariaLabel')}
                title={t('favorites.import.title')}
              >
                <Upload size={16} />
                <span>{t('favorites.import')}</span>
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="upload-page__file-input"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportData(file);
                  e.target.value = '';
                }}
              />
            </div>
            {favoritedTemplates.length > 0 && (
              <>
                <button
                  type="button"
                  className={`favorites-page__sync-btn ${showSummary ? 'favorites-page__sync-btn--active' : ''}`}
                  onClick={() => setShowSummary(v => !v)}
                  aria-label={t('favorites.material.toggleTitle')}
                  title={t('favorites.material.toggleTitle')}
                  aria-pressed={showSummary}
                >
                  <ClipboardList size={16} />
                  <span>{t('favorites.material.toggle')}</span>
                </button>
                <label className="favorites-page__sort">
                  <span className="favorites-page__sort-label">{t('favorites.sortLabel')}</span>
                  <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value as SortKey)}
                    aria-label={t('favorites.sort.ariaLabel')}
                  >
                    {sortOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.label)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="favorites-page__clear"
                  onClick={handleClearClick}
                  aria-label={t('favorites.clear.ariaLabel')}
                  title={t('favorites.clear.title')}
                >
                  <Trash2 size={16} />
                  <span>{t('favorites.clear')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="favorites-page__content" tabIndex={-1}>
        {favoritedTemplates.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__icon" aria-hidden="true">💔</p>
            <p className="empty-state__title">{t('favorites.empty.title')}</p>
            <p className="empty-state__desc">{t('favorites.empty.desc')}</p>
            <button type="button" className="empty-state__action" onClick={onBack}>
              {t('favorites.empty.action')}
            </button>
          </div>
        ) : showSummary ? (
          <div className="material-summary">
            <div className="material-summary__header">
              <h2 className="material-summary__title">{t('favorites.material.summaryTitle')}</h2>
              <button
                type="button"
                className="favorites-page__sync-btn"
                onClick={handleExportMaterial}
                aria-label={t('favorites.material.exportTitle')}
                title={t('favorites.material.exportTitle')}
              >
                <Table size={16} />
                <span>{t('favorites.material.export')}</span>
              </button>
            </div>
            <div className="material-summary__stats">
              <div className="material-summary__stat">
                <span className="material-summary__stat-value">{materialSummary.length}</span>
                <span className="material-summary__stat-label">{t('favorites.material.totalColors')}</span>
              </div>
              <div className="material-summary__stat">
                <span className="material-summary__stat-value">{materialTotalBeads}</span>
                <span className="material-summary__stat-label">{t('favorites.material.totalBeads')}</span>
              </div>
              <div className="material-summary__stat">
                <span className="material-summary__stat-value">{favoritedTemplates.length}</span>
                <span className="material-summary__stat-label">{t('favorites.material.colTemplates')}</span>
              </div>
            </div>
            <div className="material-summary__table-wrap">
              <table className="material-summary__table">
                <thead>
                  <tr>
                    <th>{t('favorites.material.colNo')}</th>
                    <th>{t('favorites.material.colHex')}</th>
                    <th>{t('favorites.material.colName')}</th>
                    <th>{t('favorites.material.colCount')}</th>
                    <th>{t('favorites.material.colRatio')}</th>
                    <th>{t('favorites.material.colTemplates')}</th>
                  </tr>
                </thead>
                <tbody>
                  {materialSummary.map((item, i) => {
                    const ratio = materialTotalBeads > 0 ? ((item.count / materialTotalBeads) * 100).toFixed(1) : '0';
                    return (
                      <tr key={item.hex}>
                        <td>{i + 1}</td>
                        <td>
                          <span className="material-summary__swatch" style={{ backgroundColor: item.hex }} aria-hidden="true" />
                          {item.hex}
                        </td>
                        <td>{item.name}</td>
                        <td>{item.count}</td>
                        <td>{ratio}%</td>
                        <td>{item.templateCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>{t('favorites.material.totalLabel')}</td>
                    <td>{materialTotalBeads}</td>
                    <td>100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="template-grid">
            {favoritedTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isFavorite={true}
                onToggleFavorite={() => onToggleFavorite(template.id)}
                onClick={() => onNavigate(`template/${template.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {confirming && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            ref={modalRef}
            className="modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <h3 id="modal-title" className="modal__title">{t('favorites.modal.title')}</h3>
            <p className="modal__desc">{t('favorites.modal.desc', { count: favoritedTemplates.length })}</p>
            <div className="modal__actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="modal__btn modal__btn--cancel"
                onClick={closeModal}
              >
                {t('favorites.modal.cancel')}
              </button>
              <button
                type="button"
                className="modal__btn modal__btn--danger"
                onClick={handleConfirmClear}
              >
                {t('favorites.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
