import { useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, RotateCcw, ListOrdered, Clock, Pause, Play, Volume2, VolumeX, Grid3x3, Palette } from 'lucide-react';
import type { ColorInfo } from '../types/bead';
import { useTranslation } from '../context/LanguageContext';
import { groupCellsByColor, groupCellsByRegion, formatTime } from '../hooks/useStepGuide';
import type { StepGuideMode } from '../hooks/useStepGuide';

interface StepGuidePanelProps {
  grid: number[][];
  colors: ColorInfo[];
  enabled: boolean;
  currentStep: number;
  completedSteps: Set<number>;
  mode: StepGuideMode;
  elapsed: number;
  isRunning: boolean;
  voiceEnabled: boolean;
  onToggle: () => void;
  onToggleMode: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (step: number) => void;
  onMarkComplete: (step: number) => void;
  onReset: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onToggleVoice: () => void;
  onSpeak: (text: string) => void;
}

interface ColorStep {
  type: 'color';
  color: ColorInfo;
  index: number;
  cells: [number, number][];
  count: number;
}

interface RegionStep {
  type: 'region';
  regionIndex: number;
  cells: [number, number][];
  count: number;
  bounds: { minR: number; maxR: number; minC: number; maxC: number };
}

type Step = ColorStep | RegionStep;

export default function StepGuidePanel({
  grid,
  colors,
  enabled,
  currentStep,
  completedSteps,
  mode,
  elapsed,
  isRunning,
  voiceEnabled,
  onToggle,
  onToggleMode,
  onNext,
  onPrev,
  onGoTo,
  onMarkComplete,
  onReset,
  onPauseTimer,
  onResumeTimer,
  onToggleVoice,
  onSpeak,
}: StepGuidePanelProps) {
  const { t } = useTranslation();

  // 按颜色分组
  const colorGroups = useMemo(() => groupCellsByColor(grid), [grid]);
  // 按区域分组
  const regionGroups = useMemo(() => groupCellsByRegion(grid, 3), [grid]);

  // 根据模式构建步骤列表
  const steps: Step[] = useMemo(() => {
    if (mode === 'byColor') {
      return colors
        .map((color, idx) => ({
          type: 'color' as const,
          color,
          index: idx + 1,
          cells: colorGroups.get(idx + 1) || [],
          count: colorGroups.get(idx + 1)?.length || 0,
        }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count);
    }
    return regionGroups.map(rg => ({
      type: 'region' as const,
      regionIndex: rg.regionIndex,
      cells: rg.cells,
      count: rg.cells.length,
      bounds: rg.bounds,
    }));
  }, [mode, colors, colorGroups, regionGroups]);

  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];
  const completedCount = steps.filter((_, idx) => completedSteps.has(idx)).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // 语音播报当前步骤
  useEffect(() => {
    if (!enabled || !voiceEnabled || !currentStepData) return;
    let text = '';
    if (currentStepData.type === 'color') {
      text = t('stepGuide.voice.color', { name: currentStepData.color.name, count: currentStepData.count, step: currentStep + 1, total: totalSteps });
    } else {
      text = t('stepGuide.voice.region', { idx: currentStepData.regionIndex + 1, count: currentStepData.count, step: currentStep + 1, total: totalSteps });
    }
    onSpeak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, enabled, voiceEnabled, totalSteps]);

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

      {/* 模式切换 */}
      <div className="step-guide__mode-tabs">
        <button
          type="button"
          className={`step-guide__mode-tab ${mode === 'byColor' ? 'active' : ''}`}
          onClick={onToggleMode}
          aria-pressed={mode === 'byColor'}
        >
          <Palette size={14} aria-hidden="true" />
          {t('stepGuide.mode.byColor')}
        </button>
        <button
          type="button"
          className={`step-guide__mode-tab ${mode === 'byRegion' ? 'active' : ''}`}
          onClick={onToggleMode}
          aria-pressed={mode === 'byRegion'}
        >
          <Grid3x3 size={14} aria-hidden="true" />
          {t('stepGuide.mode.byRegion')}
        </button>
      </div>

      {/* 计时器 */}
      <div className="step-guide__timer">
        <Clock size={16} aria-hidden="true" />
        <span className="step-guide__timer-value">{formatTime(elapsed)}</span>
        <button
          type="button"
          className="step-guide__timer-btn"
          onClick={isRunning ? onPauseTimer : onResumeTimer}
          aria-label={isRunning ? t('stepGuide.pause') : t('stepGuide.resume')}
          title={isRunning ? t('stepGuide.pause') : t('stepGuide.resume')}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          type="button"
          className={`step-guide__timer-btn ${voiceEnabled ? 'step-guide__timer-btn--active' : ''}`}
          onClick={onToggleVoice}
          aria-label={t('stepGuide.voice.toggle')}
          aria-pressed={voiceEnabled}
          title={t('stepGuide.voice.toggle')}
        >
          {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
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
            {currentStepData.type === 'color' ? (
              <>
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
              </>
            ) : (
              <>
                <span className="step-guide__current-swatch step-guide__current-swatch--region" aria-hidden="true">
                  R{currentStepData.regionIndex + 1}
                </span>
                <div className="step-guide__current-detail">
                  <span className="step-guide__current-name">
                    {t('stepGuide.region', { idx: currentStepData.regionIndex + 1 })}
                  </span>
                  <span className="step-guide__current-count">
                    {t('stepGuide.beads', { count: currentStepData.count })}
                  </span>
                </div>
              </>
            )}
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
            key={idx}
            type="button"
            className={`step-guide__item ${idx === currentStep ? 'step-guide__item--active' : ''} ${completedSteps.has(idx) ? 'step-guide__item--done' : ''}`}
            onClick={() => onGoTo(idx)}
          >
            <span className="step-guide__item-num">{idx + 1}</span>
            {step.type === 'color' ? (
              <>
                <span className="step-guide__item-swatch" style={{ backgroundColor: step.color.hex }} aria-hidden="true" />
                <span className="step-guide__item-name">{step.color.name}</span>
              </>
            ) : (
              <>
                <span className="step-guide__item-swatch step-guide__item-swatch--region" aria-hidden="true">
                  R{step.regionIndex + 1}
                </span>
                <span className="step-guide__item-name">
                  {t('stepGuide.region', { idx: step.regionIndex + 1 })}
                </span>
              </>
            )}
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
