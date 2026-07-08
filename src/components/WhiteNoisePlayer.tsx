import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  CloudRain,
  Flame,
  Waves,
  Trees,
} from 'lucide-react';

// 白噪音类型
type NoiseType = 'rain' | 'fire' | 'waves' | 'forest';

// 清理函数类型：用于停止并释放某条音效链的所有节点
type CleanupFn = () => void;

// 噪音类型配置：标签 + 图标
const NOISE_CONFIG: Record<
  NoiseType,
  { label: string; Icon: typeof CloudRain }
> = {
  rain: { label: '雨声', Icon: CloudRain },
  fire: { label: '篝火', Icon: Flame },
  waves: { label: '海浪', Icon: Waves },
  forest: { label: '森林', Icon: Trees },
};

// 触摸目标最小尺寸（无障碍要求 44px）
const TOUCH_TARGET = 44;

/**
 * 生成白噪音 AudioBuffer（2 秒循环）
 */
const createWhiteNoiseBuffer = (audioCtx: AudioContext): AudioBuffer => {
  const bufferSize = Math.floor(audioCtx.sampleRate * 2);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

/**
 * 生成粉红噪音 AudioBuffer（Voss-McCartney 算法）
 * 比白噪音更柔和，适合模拟自然声响
 */
const createPinkNoiseBuffer = (audioCtx: AudioContext): AudioBuffer => {
  const bufferSize = Math.floor(audioCtx.sampleRate * 2);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
};

/**
 * 雨声：白噪音 + 低通滤波
 * 模拟持续雨幕的沙沙声
 */
const setupRain = (
  audioCtx: AudioContext,
  destination: AudioNode
): CleanupFn => {
  const source = audioCtx.createBufferSource();
  source.buffer = createWhiteNoiseBuffer(audioCtx);
  source.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  filter.Q.value = 0.5;

  source.connect(filter);
  filter.connect(destination);
  source.start();

  return () => {
    try {
      source.stop();
    } catch {
      // 忽略已停止的 source
    }
    source.disconnect();
    filter.disconnect();
  };
};

/**
 * 篝火：粉红噪音 + 随机爆裂声
 * 低频底噪模拟火苗，随机爆裂模拟木柴噼啪声
 */
const setupFire = (
  audioCtx: AudioContext,
  destination: AudioNode
): CleanupFn => {
  const source = audioCtx.createBufferSource();
  source.buffer = createPinkNoiseBuffer(audioCtx);
  source.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;

  source.connect(filter);
  filter.connect(destination);
  source.start();

  // 随机爆裂声调度
  let crackleTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleCrackle = () => {
    const duration = 0.04 + Math.random() * 0.08;
    const osc = audioCtx.createOscillator();
    const crackleGain = audioCtx.createGain();
    osc.frequency.value = 180 + Math.random() * 320;
    osc.type = 'square';
    const now = audioCtx.currentTime;
    crackleGain.gain.setValueAtTime(0, now);
    crackleGain.gain.linearRampToValueAtTime(
      0.25 + Math.random() * 0.25,
      now + 0.005
    );
    crackleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(crackleGain);
    crackleGain.connect(destination);
    osc.start();
    osc.stop(now + duration);

    crackleTimer = setTimeout(scheduleCrackle, 150 + Math.random() * 700);
  };
  scheduleCrackle();

  return () => {
    if (crackleTimer !== null) clearTimeout(crackleTimer);
    try {
      source.stop();
    } catch {
      // 忽略已停止的 source
    }
    source.disconnect();
    filter.disconnect();
  };
};

/**
 * 海浪：白噪音 + 慢速振幅调制（LFO）
 * LFO 周期约 10 秒，模拟海浪涨落
 */
const setupWaves = (
  audioCtx: AudioContext,
  destination: AudioNode
): CleanupFn => {
  const source = audioCtx.createBufferSource();
  source.buffer = createWhiteNoiseBuffer(audioCtx);
  source.loop = true;

  // 低通滤波，保留海浪的低频质感
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;

  // LFO 用于振幅调制
  const lfo = audioCtx.createOscillator();
  lfo.frequency.value = 0.1; // 10 秒一个周期
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.5; // 调制深度

  const amplitudeGain = audioCtx.createGain();
  amplitudeGain.gain.value = 0.5; // 基准音量

  // LFO 输出接到 amplitudeGain.gain，实现振幅随时间起伏
  lfo.connect(lfoGain);
  lfoGain.connect(amplitudeGain.gain);

  source.connect(filter);
  filter.connect(amplitudeGain);
  amplitudeGain.connect(destination);

  source.start();
  lfo.start();

  return () => {
    try {
      source.stop();
    } catch {
      // 忽略已停止的 source
    }
    try {
      lfo.stop();
    } catch {
      // 忽略已停止的 lfo
    }
    source.disconnect();
    filter.disconnect();
    lfo.disconnect();
    lfoGain.disconnect();
    amplitudeGain.disconnect();
  };
};

/**
 * 森林：白噪音（树叶沙沙底噪）+ 随机鸟鸣频率
 * 鸟鸣用频率快速变化的短促正弦波模拟
 */
const setupForest = (
  audioCtx: AudioContext,
  destination: AudioNode
): CleanupFn => {
  const source = audioCtx.createBufferSource();
  source.buffer = createWhiteNoiseBuffer(audioCtx);
  source.loop = true;

  // 低通过滤作为背景风声/树叶声
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.3;

  source.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);
  source.start();

  // 随机鸟鸣调度
  let chirpTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleChirp = () => {
    const baseFreq = 2000 + Math.random() * 2500;
    const chirpCount = Math.random() < 0.4 ? 2 : 1;

    for (let i = 0; i < chirpCount; i++) {
      const startTime = audioCtx.currentTime + i * 0.12;
      const osc = audioCtx.createOscillator();
      const chirpGain = audioCtx.createGain();
      osc.type = 'sine';
      const f = baseFreq * (i === 0 ? 1 : 0.8 + Math.random() * 0.4);
      osc.frequency.setValueAtTime(f, startTime);
      osc.frequency.exponentialRampToValueAtTime(
        f * (0.5 + Math.random()),
        startTime + 0.1
      );

      chirpGain.gain.setValueAtTime(0, startTime);
      chirpGain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(chirpGain);
      chirpGain.connect(destination);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }

    chirpTimer = setTimeout(scheduleChirp, 800 + Math.random() * 3000);
  };
  scheduleChirp();

  return () => {
    if (chirpTimer !== null) clearTimeout(chirpTimer);
    try {
      source.stop();
    } catch {
      // 忽略已停止的 source
    }
    source.disconnect();
    filter.disconnect();
    noiseGain.disconnect();
  };
};

// 各噪音类型的设置函数映射
const NOISE_SETUP: Record<
  NoiseType,
  (audioCtx: AudioContext, destination: AudioNode) => CleanupFn
> = {
  rain: setupRain,
  fire: setupFire,
  waves: setupWaves,
  forest: setupForest,
};

/**
 * 白噪音播放器组件
 *
 * 使用 Web Audio API 实时生成 4 种环境音（雨声/篝火/海浪/森林），
 * 不依赖任何外部音频文件。组件卸载时自动清理 AudioContext 与所有节点。
 */
export const WhiteNoisePlayer = () => {
  const [activeNoise, setActiveNoise] = useState<NoiseType | null>(null);
  const [volume, setVolume] = useState<number>(50);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // AudioContext 与音频节点的引用
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const cleanupFnRef = useRef<CleanupFn | null>(null);

  // 清理当前音效链（保留 AudioContext 与 masterGain 以便恢复播放）
  const cleanupNoise = useCallback(() => {
    if (cleanupFnRef.current) {
      cleanupFnRef.current();
      cleanupFnRef.current = null;
    }
  }, []);

  // 彻底清理所有音频资源（AudioContext + masterGain + 音效链）
  const cleanupAll = useCallback(() => {
    cleanupNoise();
    if (masterGainRef.current) {
      masterGainRef.current.disconnect();
      masterGainRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, [cleanupNoise]);

  // 组件卸载时清理所有资源
  useEffect(() => {
    return cleanupAll;
  }, [cleanupAll]);

  // 音量变化时更新 masterGain
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(
        volume / 100,
        audioCtxRef.current.currentTime
      );
    }
  }, [volume]);

  // 确保 AudioContext 与 masterGain 已就绪，返回 masterGain
  const ensureAudioGraph = useCallback((): GainNode | null => {
    if (!audioCtxRef.current) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtxRef.current = new AudioContextCtor();
    }
    // 浏览器自动播放策略可能将 ctx 挂起，用户交互后恢复
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (!masterGainRef.current) {
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = volume / 100;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    return masterGainRef.current;
  }, [volume]);

  // 选择并播放指定白噪音
  const handleSelectNoise = useCallback(
    (type: NoiseType) => {
      // 先清理当前音效链
      cleanupNoise();

      const masterGain = ensureAudioGraph();
      if (!masterGain || !audioCtxRef.current) return;

      // 构建新的音效链
      cleanupFnRef.current = NOISE_SETUP[type](audioCtxRef.current, masterGain);

      setActiveNoise(type);
      setIsPlaying(true);
    },
    [cleanupNoise, ensureAudioGraph]
  );

  // 播放/停止切换
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      // 停止：仅清理音效链，保留 AudioContext 以便恢复
      cleanupNoise();
      setIsPlaying(false);
    } else if (activeNoise) {
      // 恢复播放：重新构建当前选中噪音的音效链
      const masterGain = ensureAudioGraph();
      if (!masterGain || !audioCtxRef.current) return;
      cleanupFnRef.current = NOISE_SETUP[activeNoise](
        audioCtxRef.current,
        masterGain
      );
      setIsPlaying(true);
    }
  }, [isPlaying, activeNoise, cleanupNoise, ensureAudioGraph]);

  const PlayIcon = isPlaying ? VolumeX : Volume2;

  return (
    <div
      className="white-noise-player"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
      }}
    >
      {/* 白噪音类型选择按钮 */}
      <div
        className="white-noise-buttons"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {(Object.keys(NOISE_CONFIG) as NoiseType[]).map((type) => {
          const { label, Icon } = NOISE_CONFIG[type];
          const isActive = activeNoise === type && isPlaying;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelectNoise(type)}
              aria-pressed={isActive}
              aria-label={label}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: 12,
                minWidth: TOUCH_TARGET,
                minHeight: TOUCH_TARGET,
                border: isActive ? '2px solid #6c8' : '1px solid #ccc',
                borderRadius: 8,
                background: isActive ? '#e8f5e9' : 'transparent',
                cursor: 'pointer',
                color: isActive ? '#2e7d32' : 'inherit',
              }}
            >
              <Icon size={24} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* 音量控制 */}
      <div
        className="white-noise-volume"
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span aria-hidden="true" style={{ fontSize: 18 }}>
          🔊
        </span>
        <label htmlFor="noise-volume">音量</label>
        <input
          id="noise-volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="音量"
        />
        <span style={{ minWidth: 32, textAlign: 'right' }}>{volume}</span>
      </div>

      {/* 播放/停止按钮 */}
      <button
        type="button"
        onClick={handleTogglePlay}
        disabled={!activeNoise}
        aria-label={isPlaying ? '停止播放' : '开始播放'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 12,
          minWidth: TOUCH_TARGET,
          minHeight: TOUCH_TARGET,
          border: '1px solid #ccc',
          borderRadius: 8,
          background: isPlaying ? '#ffe0b2' : 'transparent',
          cursor: activeNoise ? 'pointer' : 'not-allowed',
          opacity: activeNoise ? 1 : 0.5,
        }}
      >
        <PlayIcon size={20} aria-hidden="true" />
        <span>{isPlaying ? '停止' : '播放'}</span>
      </button>
    </div>
  );
};

export default WhiteNoisePlayer;
