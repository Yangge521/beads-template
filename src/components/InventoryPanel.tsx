import { useState, useMemo, useCallback } from 'react';
import type { BeadTemplate } from '../types/bead';
import type { InventoryItem } from '../hooks/useInventory';
import { detectMissingColors, getDistanceLevel } from '../utils/colorReplacement';
import { BEAD_COLOR_GROUPS } from '../data/beadColors';
import { useTranslation } from '../context/LanguageContext';
import { Plus, Trash2, Check, AlertTriangle, X } from 'lucide-react';

interface InventoryPanelProps {
  template: BeadTemplate;
  inventory: InventoryItem[];
  onAddColor: (hex: string, note?: string) => void;
  onRemoveColor: (hex: string) => void;
  onClearInventory: () => void;
  onApplyReplacements: (replacedColors: { hex: string; replacement: string }[]) => void;
  onClose: () => void;
}

export default function InventoryPanel({
  template,
  inventory,
  onAddColor,
  onRemoveColor,
  onClearInventory,
  onApplyReplacements,
  onClose,
}: InventoryPanelProps) {
  const { t } = useTranslation();
  const [hexInput, setHexInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  const inventoryHexes = useMemo(() => inventory.map(x => x.hex), [inventory]);

  const missingColors = useMemo(
    () => detectMissingColors(template, inventoryHexes),
    [template, inventoryHexes]
  );

  const handleAdd = useCallback(() => {
    const hex = hexInput.trim();
    if (!/^#[0-9a-f]{6}$/i.test(hex)) {
      setError(t('detail.inventory.addInvalid'));
      return;
    }
    onAddColor(hex, noteInput);
    setHexInput('');
    setNoteInput('');
    setError('');
  }, [hexInput, noteInput, onAddColor, t]);

  const handleClear = useCallback(() => {
    if (confirm(t('detail.inventory.clearConfirm'))) {
      onClearInventory();
    }
  }, [onClearInventory, t]);

  const handleApplyAll = useCallback(() => {
    const valid = missingColors
      .filter(m => m.replacement)
      .map(m => ({ hex: m.hex, replacement: m.replacement! }));
    if (valid.length === 0) return;
    onApplyReplacements(valid);
    setApplied(true);
  }, [missingColors, onApplyReplacements]);

  return (
    <div className="inventory-panel" role="dialog" aria-modal="true" aria-label={t('detail.inventory.title')}>
      <div className="inventory-panel__header">
        <h2 className="inventory-panel__title">{t('detail.inventory.title')}</h2>
        <button
          type="button"
          className="inventory-panel__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* 库存录入区 */}
      <div className="inventory-panel__section">
        <div className="inventory-panel__input-row">
          <input
            type="text"
            className="inventory-panel__hex-input"
            value={hexInput}
            onChange={e => { setHexInput(e.target.value); setError(''); }}
            placeholder={t('detail.inventory.addPlaceholder')}
            aria-label="Hex color"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <input
            type="text"
            className="inventory-panel__note-input"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            placeholder={t('detail.inventory.addNote')}
            aria-label={t('detail.inventory.addNote')}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <button
            type="button"
            className="inventory-panel__add-btn"
            onClick={handleAdd}
          >
            <Plus size={16} />
            {t('detail.inventory.add')}
          </button>
        </div>
        {error && <p className="inventory-panel__error">{error}</p>}

        {/* 快速添加色卡参考 */}
        <details className="inventory-panel__quick-add">
          <summary>{t('detail.inventory.brand')}</summary>
          <div className="inventory-panel__swatches">
            {BEAD_COLOR_GROUPS.map(group =>
              group.colors.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  className="inventory-panel__swatch-btn"
                  title={`${c.name}${c.perler ? ' / ' + c.perler : ''}`}
                  onClick={() => onAddColor(c.hex, c.perler)}
                  aria-label={`${c.name} ${c.hex}`}
                  disabled={inventoryHexes.includes(c.hex.toLowerCase())}
                >
                  <span className="inventory-panel__swatch-color" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                  {inventoryHexes.includes(c.hex.toLowerCase()) && (
                    <Check size={10} className="inventory-panel__swatch-check" />
                  )}
                </button>
              ))
            )}
          </div>
        </details>

        {/* 库存列表 */}
        {inventory.length > 0 ? (
          <div className="inventory-panel__list">
            <div className="inventory-panel__list-header">
              <span className="inventory-panel__list-count">
                {t('detail.inventory.count', { count: inventory.length })}
              </span>
              <button
                type="button"
                className="inventory-panel__clear-btn"
                onClick={handleClear}
              >
                <Trash2 size={14} />
                {t('detail.inventory.clear')}
              </button>
            </div>
            <div className="inventory-panel__chips">
              {inventory.map(item => (
                <span key={item.hex} className="inventory-panel__chip">
                  <span className="inventory-panel__chip-swatch" style={{ backgroundColor: item.hex }} aria-hidden="true" />
                  <span className="inventory-panel__chip-hex">{item.hex}</span>
                  {item.note && <span className="inventory-panel__chip-note">{item.note}</span>}
                  <button
                    type="button"
                    className="inventory-panel__chip-remove"
                    onClick={() => onRemoveColor(item.hex)}
                    aria-label={`Remove ${item.hex}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="inventory-panel__empty">{t('detail.inventory.empty')}</p>
        )}
      </div>

      {/* 缺色检测结果 */}
      {inventory.length > 0 && (
        <div className="inventory-panel__section inventory-panel__missing">
          <h3 className="inventory-panel__subtitle">
            <AlertTriangle size={16} aria-hidden="true" />
            {t('detail.inventory.missingTitle')}
          </h3>
          {missingColors.length === 0 ? (
            <p className="inventory-panel__no-missing">{t('detail.inventory.noMissing')}</p>
          ) : (
            <>
              <p className="inventory-panel__missing-desc">{t('detail.inventory.missingDesc')}</p>
              <table className="inventory-panel__table">
                <thead>
                  <tr>
                    <th>{t('detail.inventory.colOriginal')}</th>
                    <th>{t('detail.inventory.colReplacement')}</th>
                    <th>{t('detail.inventory.colCount')}</th>
                    <th>{t('detail.inventory.colDistance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {missingColors.map(m => {
                    const level = getDistanceLevel(m.distance);
                    const levelLabel = t(`detail.inventory.distance${level.charAt(0).toUpperCase() + level.slice(1)}`);
                    return (
                      <tr key={m.hex}>
                        <td>
                          <span className="inventory-panel__swatch-mini" style={{ backgroundColor: m.hex }} aria-hidden="true" />
                          {m.name}
                          <span className="inventory-panel__hex-text">{m.hex}</span>
                        </td>
                        <td>
                          {m.replacement ? (
                            <>
                              <span className="inventory-panel__swatch-mini" style={{ backgroundColor: m.replacement }} aria-hidden="true" />
                              <span className="inventory-panel__hex-text">{m.replacement}</span>
                            </>
                          ) : (
                            <span className="inventory-panel__no-replace">{t('detail.inventory.noReplacement')}</span>
                          )}
                        </td>
                        <td>{m.count}</td>
                        <td>
                          {m.replacement ? (
                            <span className={`inventory-panel__level inventory-panel__level--${level}`}>
                              {levelLabel}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {missingColors.some(m => m.replacement) && (
                <button
                  type="button"
                  className="inventory-panel__apply-btn"
                  onClick={handleApplyAll}
                  disabled={applied}
                >
                  {applied ? <Check size={16} /> : null}
                  {applied ? t('detail.inventory.applied') : t('detail.inventory.applyAll')}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}