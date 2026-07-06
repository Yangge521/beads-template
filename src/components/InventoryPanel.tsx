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
  /** 设置某颜色的库存数量 */
  onSetCount?: (hex: string, count: number | undefined) => void;
}

export default function InventoryPanel({
  template,
  inventory,
  onAddColor,
  onRemoveColor,
  onClearInventory,
  onApplyReplacements,
  onClose,
  onSetCount,
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
                  {onSetCount && (
                    <input
                      type="number"
                      className="inventory-panel__chip-count"
                      min={0}
                      value={item.count ?? ''}
                      placeholder="—"
                      onChange={e => {
                        const v = e.target.value;
                        onSetCount(item.hex, v === '' ? undefined : Math.max(0, Math.floor(Number(v))));
                      }}
                      aria-label={t('detail.inventory.countLabel', { defaultValue: 'Count' })}
                      title={t('detail.inventory.countTitle', { defaultValue: 'Stock count' })}
                    />
                  )}
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

      {/* 缺料预警：库存中已有但数量不足的颜色 */}
      {onSetCount && inventory.some(i => typeof i.count === 'number') && (() => {
        // 统计模板每种颜色的实际用量
        const colorDemand = new Map<string, number>(); // hex(lower) -> demand
        const counts: number[] = [];
        for (const row of template.grid) {
          for (const v of row) {
            if (v > 0) counts[v - 1] = (counts[v - 1] || 0) + 1;
          }
        }
        template.colors.forEach((c, i) => {
          const cnt = counts[i] ?? 0;
          if (cnt > 0) colorDemand.set(c.hex.toLowerCase(), cnt);
        });
        // 找出库存中数量不足的（精确匹配 hex）
        const shortList = inventory
          .map(item => {
            const demand = colorDemand.get(item.hex.toLowerCase()) ?? 0;
            const have = item.count ?? 0;
            const shortage = Math.max(0, demand - have);
            return { hex: item.hex, have, demand, shortage, hasStock: typeof item.count === 'number' };
          })
          .filter(x => x.hasStock && x.shortage > 0)
          .sort((a, b) => b.shortage - a.shortage);
        if (shortList.length === 0) return null;
        return (
          <div className="inventory-panel__section inventory-panel__shortage">
            <h3 className="inventory-panel__subtitle">
              <AlertTriangle size={16} aria-hidden="true" />
              {t('detail.inventory.shortageTitle', { defaultValue: '缺料预警' })}
            </h3>
            <p className="inventory-panel__missing-desc">
              {t('detail.inventory.shortageDesc', { defaultValue: '以下颜色库存数量不足，需补购：' })}
            </p>
            <table className="inventory-panel__table">
              <thead>
                <tr>
                  <th>{t('detail.inventory.colOriginal', { defaultValue: '颜色' })}</th>
                  <th>{t('detail.inventory.colDemand', { defaultValue: '需要' })}</th>
                  <th>{t('detail.inventory.colStock', { defaultValue: '已有' })}</th>
                  <th>{t('detail.inventory.colShortage', { defaultValue: '缺少' })}</th>
                </tr>
              </thead>
              <tbody>
                {shortList.map(x => (
                  <tr key={x.hex}>
                    <td>
                      <span className="inventory-panel__swatch-mini" style={{ backgroundColor: x.hex }} aria-hidden="true" />
                      <span className="inventory-panel__hex-text">{x.hex}</span>
                    </td>
                    <td>{x.demand}</td>
                    <td>{x.have}</td>
                    <td>
                      <span className="inventory-panel__level inventory-panel__level--far">{x.shortage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}