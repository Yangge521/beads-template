import { useState } from 'react';
import { History, Camera, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { Snapshot } from '../hooks/useSnapshots';
import { useTranslation } from '../context/LanguageContext';

interface EditorHistoryPanelProps {
  undoCount: number;
  redoCount: number;
  snapshots: Snapshot[];
  onUndo: () => void;
  onRedo: () => void;
  onAddSnapshot: () => void;
  onRestoreSnapshot: (snap: Snapshot) => void;
  onRemoveSnapshot: (id: string) => void;
  onClearSnapshots: () => void;
}

/**
 * 编辑器历史/快照面板：显示撤销重做步数、快照列表。
 */
export default function EditorHistoryPanel({
  undoCount, redoCount, snapshots,
  onUndo, onRedo,
  onAddSnapshot, onRestoreSnapshot, onRemoveSnapshot, onClearSnapshots,
}: EditorHistoryPanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="editor-panel">
      <button
        type="button"
        className="editor-panel__header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label={t('editor.panel.history')}
      >
        <History size={16} aria-hidden="true" />
        <span className="editor-panel__title">{t('editor.panel.history')}</span>
        <span className="editor-panel__count">
          {t('editor.panel.historyCount', { undo: undoCount, redo: redoCount })}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="editor-panel__body">
          {/* 历史步数 + 撤销/重做 */}
          <div className="editor-panel__history-row">
            <button
              type="button"
              className="editor-panel__btn"
              onClick={onUndo}
              disabled={undoCount === 0}
              title={t('editor.undo')}
              aria-label={t('editor.undo')}
            >
              <RotateCcw size={14} />
              <span>{undoCount}</span>
            </button>
            <button
              type="button"
              className="editor-panel__btn"
              onClick={onRedo}
              disabled={redoCount === 0}
              title={t('editor.redo')}
              aria-label={t('editor.redo')}
            >
              <RotateCcw size={14} className="editor-panel__icon--flip" />
              <span>{redoCount}</span>
            </button>
          </div>

          {/* 快照区 */}
          <div className="editor-panel__snapshots">
            <div className="editor-panel__snapshots-header">
              <span className="editor-panel__subtitle">{t('editor.panel.snapshots')}</span>
              <div className="editor-panel__snapshots-actions">
                <button
                  type="button"
                  className="editor-panel__btn editor-panel__btn--icon"
                  onClick={onAddSnapshot}
                  title={t('editor.panel.addSnapshot')}
                  aria-label={t('editor.panel.addSnapshot')}
                >
                  <Camera size={14} />
                </button>
                {snapshots.length > 0 && (
                  <button
                    type="button"
                    className="editor-panel__btn editor-panel__btn--icon"
                    onClick={onClearSnapshots}
                    title={t('editor.panel.clearSnapshots')}
                    aria-label={t('editor.panel.clearSnapshots')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {snapshots.length === 0 ? (
              <p className="editor-panel__empty">{t('editor.panel.noSnapshots')}</p>
            ) : (
              <ul className="editor-panel__snapshot-list">
                {snapshots.map(snap => (
                  <li key={snap.id} className="editor-panel__snapshot-item">
                    <button
                      type="button"
                      className="editor-panel__snapshot-restore"
                      onClick={() => onRestoreSnapshot(snap)}
                      title={t('editor.panel.restore')}
                    >
                      <span className="editor-panel__snapshot-name">{snap.name}</span>
                      <span className="editor-panel__snapshot-time">
                        {new Date(snap.createdAt).toLocaleTimeString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="editor-panel__btn editor-panel__btn--icon"
                      onClick={() => onRemoveSnapshot(snap.id)}
                      title={t('common.clear')}
                      aria-label={t('common.clear')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
