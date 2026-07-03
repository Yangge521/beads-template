import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * 分块制作引导 hook
 * 支持两种模式：
 * - byColor: 按颜色分块，逐步高亮当前颜色的所有格子
 * - byRegion: 按区域分块（网格四象限/九宫格），逐块引导
 *
 * 增强功能：
 * - 计时统计：记录总用时和每步用时
 * - 语音播报：调用 Web Speech API 朗读当前步骤信息
 */

export type StepGuideMode = 'byColor' | 'byRegion';

export interface StepGuideState {
  /** 是否启用引导模式 */
  enabled: boolean;
  /** 当前步骤索引 */
  currentStep: number;
  /** 已完成的步骤索引集合 */
  completedSteps: Set<number>;
  /** 分块模式 */
  mode: StepGuideMode;
  /** 计时：开始时间戳 */
  startTime: number | null;
  /** 计时：累计用时（秒） */
  elapsed: number;
  /** 是否正在计时 */
  isRunning: boolean;
}

/** 按颜色索引分组格子坐标 */
export function groupCellsByColor(grid: number[][]): Map<number, [number, number][]> {
  const map = new Map<number, [number, number][]>();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const v = grid[r][c];
      if (v > 0) {
        if (!map.has(v)) map.set(v, []);
        map.get(v)!.push([r, c]);
      }
    }
  }
  return map;
}

/** 区域分块：将网格划分为 N 个区域块 */
export function groupCellsByRegion(
  grid: number[][],
  regionsPerSide: number = 3
): { regionIndex: number; cells: [number, number][]; bounds: { minR: number; maxR: number; minC: number; maxC: number } }[] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return [];
  const result: { regionIndex: number; cells: [number, number][]; bounds: { minR: number; maxR: number; minC: number; maxC: number } }[] = [];
  const rowStep = Math.ceil(rows / regionsPerSide);
  const colStep = Math.ceil(cols / regionsPerSide);
  let regionIdx = 0;
  for (let rStart = 0; rStart < rows; rStart += rowStep) {
    for (let cStart = 0; cStart < cols; cStart += colStep) {
      const rEnd = Math.min(rStart + rowStep - 1, rows - 1);
      const cEnd = Math.min(cStart + colStep - 1, cols - 1);
      const cells: [number, number][] = [];
      for (let r = rStart; r <= rEnd; r++) {
        for (let c = cStart; c <= cEnd; c++) {
          if (grid[r][c] > 0) cells.push([r, c]);
        }
      }
      if (cells.length > 0) {
        result.push({
          regionIndex: regionIdx,
          cells,
          bounds: { minR: rStart, maxR: rEnd, minC: cStart, maxC: cEnd },
        });
      }
      regionIdx++;
    }
  }
  return result;
}

/** 语音播报支持检测 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function useStepGuide(templateId: string | undefined) {
  const [enabled, setEnabled] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<StepGuideMode>('byColor');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 切换模板时重置状态
  useEffect(() => {
    setEnabled(false);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setStartTime(null);
    setElapsed(0);
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [templateId]);

  // 计时器
  useEffect(() => {
    if (isRunning && startTime !== null) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isRunning, startTime]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      if (next && startTime === null) {
        setStartTime(Date.now());
        setIsRunning(true);
      }
      return next;
    });
  }, [startTime]);

  const toggleMode = useCallback(() => {
    setMode(prev => (prev === 'byColor' ? 'byRegion' : 'byColor'));
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, step));
  }, []);

  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setStartTime(Date.now());
    setElapsed(0);
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => setIsRunning(false), []);
  const resumeTimer = useCallback(() => {
    if (startTime !== null) {
      // 恢复时以当前时间重算起点
      setStartTime(Date.now() - elapsed * 1000);
      setIsRunning(true);
    }
  }, [startTime, elapsed]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      if (!prev && isSpeechSupported()) {
        // 测试播报
        return true;
      }
      return false;
    });
  }, []);

  /** 语音播报文本 */
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !isSpeechSupported()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  }, [voiceEnabled]);

  return {
    enabled,
    currentStep,
    completedSteps,
    mode,
    startTime,
    elapsed,
    isRunning,
    voiceEnabled,
    toggle,
    toggleMode,
    nextStep,
    prevStep,
    goToStep,
    markStepComplete,
    reset,
    pauseTimer,
    resumeTimer,
    toggleVoice,
    speak,
  };
}

/** 格式化时间 mm:ss */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
