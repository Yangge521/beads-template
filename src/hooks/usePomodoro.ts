import { useState, useEffect, useCallback } from 'react';

// 番茄钟状态类型
export interface PomodoroState {
  mode: 'focus' | 'break' | 'idle';
  timeLeft: number; // 剩余秒数
  cycleCount: number; // 已完成的专注轮数
  isRunning: boolean;
}

// 默认时长配置（秒）
const FOCUS_DURATION = 25 * 60; // 25 分钟专注
const SHORT_BREAK_DURATION = 5 * 60; // 5 分钟短休息
const LONG_BREAK_DURATION = 15 * 60; // 15 分钟长休息
const CYCLES_BEFORE_LONG_BREAK = 4; // 每 4 轮专注后进入长休息

/**
 * 使用 Web Audio API 生成简单提示音（不依赖音频文件）
 * 生成一个 0.5 秒的衰减正弦波 beep
 */
const playBeep = (): void => {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioCtx = new AudioContextCtor();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // A5 音高，清脆悦耳

    // 衰减包络，避免开关瞬间的"咔"声
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.5
    );

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);

    // 播放结束后关闭 AudioContext 释放资源
    oscillator.onended = () => {
      audioCtx.close();
    };
  } catch {
    // 音频播放失败时静默忽略，不影响计时逻辑
  }
};

/**
 * 拼豆制作番茄钟计时器 Hook
 *
 * 默认专注 25 分钟、休息 5 分钟，每 4 轮专注后长休息 15 分钟。
 * 时间到自动切换专注/休息模式并播放提示音。
 */
export const usePomodoro = (): PomodoroState & {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
} => {
  const [mode, setMode] = useState<'focus' | 'break' | 'idle'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(FOCUS_DURATION);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // 计时器：每秒递减剩余时间
  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // 组件卸载或 isRunning 变化时清理定时器
    return () => clearInterval(intervalId);
  }, [isRunning]);

  // 时间归零时自动切换模式并播放提示音
  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return;

    // 播放提示音
    playBeep();

    if (mode === 'focus') {
      // 完成一轮专注，轮数 +1
      const newCycleCount = cycleCount + 1;
      setCycleCount(newCycleCount);
      // 每 4 轮进入长休息
      const isLongBreak = newCycleCount % CYCLES_BEFORE_LONG_BREAK === 0;
      setMode('break');
      setTimeLeft(isLongBreak ? LONG_BREAK_DURATION : SHORT_BREAK_DURATION);
    } else if (mode === 'break') {
      // 休息结束，回到专注
      setMode('focus');
      setTimeLeft(FOCUS_DURATION);
    }
    // idle 状态不会走到这里（isRunning 为 false 时已被拦截）
  }, [timeLeft, isRunning, mode, cycleCount]);

  // 开始计时（idle 状态下首次开始会进入 focus 模式）
  const start = useCallback(() => {
    setMode((prevMode) => {
      if (prevMode === 'idle') {
        setTimeLeft(FOCUS_DURATION);
        return 'focus';
      }
      return prevMode;
    });
    setIsRunning(true);
  }, []);

  // 暂停计时（保留当前模式与剩余时间）
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  // 重置到初始状态（清空轮数，回到 idle）
  const reset = useCallback(() => {
    setIsRunning(false);
    setMode('idle');
    setTimeLeft(FOCUS_DURATION);
    setCycleCount(0);
  }, []);

  // 跳过当前轮次，直接进入下一轮（不播放提示音）
  const skip = useCallback(() => {
    if (mode === 'idle') return;

    if (mode === 'focus') {
      const newCycleCount = cycleCount + 1;
      setCycleCount(newCycleCount);
      const isLongBreak = newCycleCount % CYCLES_BEFORE_LONG_BREAK === 0;
      setMode('break');
      setTimeLeft(isLongBreak ? LONG_BREAK_DURATION : SHORT_BREAK_DURATION);
    } else {
      setMode('focus');
      setTimeLeft(FOCUS_DURATION);
    }
  }, [mode, cycleCount]);

  return {
    mode,
    timeLeft,
    cycleCount,
    isRunning,
    start,
    pause,
    reset,
    skip,
  };
};

export default usePomodoro;
