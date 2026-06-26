import { useState, useCallback, useEffect } from 'react';

/**
 * 分块制作引导 hook
 * 按颜色分块，逐步高亮当前颜色的所有格子，引导用户逐色完成
 */

export interface StepGuideState {
  /** 是否启用引导模式 */
  enabled: boolean;
  /** 当前步骤索引（对应 colors 数组的索引） */
  currentStep: number;
  /** 已完成的颜色索引集合 */
  completedSteps: Set<number>;
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

export function useStepGuide(templateId: string | undefined) {
  const [enabled, setEnabled] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // 切换模板时重置状态
  useEffect(() => {
    setEnabled(false);
    setCurrentStep(0);
    setCompletedSteps(new Set());
  }, [templateId]);

  const toggle = useCallback(() => {
    setEnabled(prev => !prev);
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
  }, []);

  return {
    enabled,
    currentStep,
    completedSteps,
    toggle,
    nextStep,
    prevStep,
    goToStep,
    markStepComplete,
    reset,
  };
}
