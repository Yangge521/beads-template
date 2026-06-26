import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, RotateCcw, ListOrdered } from 'lucide-react';
import type { ColorInfo } from '../types/bead';
import { useTranslation } from '../context/LanguageContext';
import { groupCellsByColor } from '../hooks/useStepGuide';

interface StepGuidePanelProps {
  grid: number[][];
  colors: ColorInfo[];
  enabled: boolean;
  currentStep: number;
  completedSteps: Set<number>;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (step: number) => void;
  onMarkComplete: (step: number) => void;
  onReset: () => void;
}

export default function StepGuidePanel({
  grid,
  colors,
  enabled,
  currentStep,
  completedSteps,
  onToggle,
  onNext,
  onPrev,
  onGoTo,
  onMarkComplete,
  onReset,
}: StepGuidePanelProps) {
  const { t } = useTranslation();

  // 按颜色分组格子坐标
  const colorGroups = useMemo(() => groupCellsByColor(grid), [grid]);

  // 按用量排序的颜色步骤列表
  const steps = useMemo(() => {
    return colors
      .map((color, idx) => ({
        color,
        index: idx + 1, // 1-based color index
        cells: colorGroups.get(idx + 1) || [],
        count: colorGroups.get(idx + 1)?.length || 0,
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count); // 按用量降序
  }, [colors, colorGroups]);

  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];
  const completedCount = steps.filter(s => completedSteps.has(s.index - 1)).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  if (!enabled) {
    return (
      <button
        type="button"
        className="detail-page__btn detail-page__btn--ghost step-guide__toggle"
        onClick={onToggle}
        title={t('stepGuide.toggleTitle')}
        aria-label={t('stepGuide.toggle')}
      >
        <ListOrdered size={18} />
        <span className="step-guide__toggle-label">{t('stepGuide.toggle')}</span>
      </button>
    );
  }

  return (
    <div className="step-guide">
      <div className="step-guide__header">
        <h2 className="step-guide__title">{t('stepGuide.title')}</h2>
        <button
          type="button"
          className="step-guide__close"
          onClick={onToggle}
          aria-label={t('common.close')}
        >
          ✕
        </button>
      </div>

      {/* 进度条 */}
      <div className="step-guide__progress">
        <div className="step-guide__progress-bar" style={{ width: `${progressPercent}%` }} />
        <span className="step-guide__progress-text">
          {t('stepGuide.progress', { done: completedCount, total: totalSteps, percent: progressPercent })}
        </span>
      </div>

      {/* 当前步骤 */}
      {currentStepData && (
        <div className="step-guide__current">
          <div className="step-guide__current-info">
            <span
              className="step-guide__current-swatch"
              style={{ backgroundColor: currentStepData.color.hex }}
              aria-hidden="true"
            />
            <div className="step-guide__current-detail">
              <span className="step-guide__current-name">{currentStepData.color.name}</span>
              <span className="step-guide__current-count">
                {t('stepGuide.beads', { count: currentStepData.count })}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="step-guide__complete-btn"
            onClick={() => onMarkComplete(currentStep)}
            disabled={completedSteps.has(currentStep)}
          >
            <Check size={16} />
            {completedSteps.has(currentStep) ? t('stepGuide.done') : t('stepGuide.markDone')}
          </button>
        </div>
      )}

      {/* 步骤导航 */}
      <div className="step-guide__nav">
        <button
          type="button"
          className="step-guide__nav-btn"
          onClick={onPrev}
          disabled={currentStep === 0}
          aria-label={t('stepGuide.prev')}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="step-guide__nav-info">
          {currentStep + 1} / {totalSteps}
        </span>
        <button
          type="button"
          className="step-guide__nav-btn"
          onClick={onNext}
          disabled={currentStep >= totalSteps - 1}
          aria-label={t('stepGuide.next')}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 步骤列表 */}
      <div className="step-guide__list">
        {steps.map((step, idx) => (
          <button
            key={step.index}
            type="button"
            className={`step-guide__item ${idx === currentStep ? 'step-guide__item--active' : ''} ${completedSteps.has(idx) ? 'step-guide__item--done' : ''}`}
            onClick={() => onGoTo(idx)}
          >
            <span className="step-guide__item-num">{idx + 1}</span>
            <span className="step-guide__item-swatch" style={{ backgroundColor: step.color.hex }} aria-hidden="true" />
            <span className="step-guide__item-name">{step.color.name}</span>
            <span className="step-guide__item-count">{step.count}</span>
            {completedSteps.has(idx) && <Check size={14} className="step-guide__item-check" />}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="step-guide__reset"
        onClick={onReset}
      >
        <RotateCcw size={14} />
        {t('stepGuide.reset')}
      </button>

      <p className="step-guide__hint">{t('stepGuide.hint')}</p>
    </div>
  );
}
