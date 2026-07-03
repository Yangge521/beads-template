import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'beads-achievements';

export interface AchievementRecord {
  /** 每个模板的完成次数（id -> 次数） */
  templateCompletions: Record<string, number>;
  /** 累计完成总数 */
  totalCompletions: number;
  /** 累计完成时长（秒） */
  totalSeconds: number;
  /** 最快完成时长（秒） */
  fastestSeconds: number | null;
  /** 已解锁徽章 id 列表 */
  unlocked: string[];
  /** 完成过的模板 id 集合（去重） */
  uniqueTemplates: string[];
}

export interface Badge {
  id: string;
  /** 徽章 emoji（装饰用，需 aria-hidden） */
  emoji: string;
  /** i18n key: `achievement.badge.{id}.name` */
  nameKey: string;
  /** i18n key: `achievement.badge.{id}.desc` */
  descKey: string;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 进度描述（如 "3/5"），已解锁时为 null */
  progress?: string | null;
}

const EMPTY: AchievementRecord = {
  templateCompletions: {},
  totalCompletions: 0,
  totalSeconds: 0,
  fastestSeconds: null,
  unlocked: [],
  uniqueTemplates: [],
};

/** 徽章 id -> 解锁条件检查函数 */
const BADGE_IDS = [
  'firstStep',      // 完成第 1 个模板
  'collector',      // 完成过 3 个不同模板
  'master',         // 完成过 5 个不同模板
  'persistent',     // 累计完成 10 次
  'speedrunner',    // 单次完成 ≤ 300 秒（5 分钟）
  'flash',          // 单次完成 ≤ 120 秒（2 分钟）
  'explorer',       // 累计完成 30 次
  'legend',         // 累计完成 50 次
] as const;

function load(): AchievementRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as AchievementRecord;
    // 字段兜底，避免旧数据缺字段
    return {
      templateCompletions: parsed.templateCompletions ?? {},
      totalCompletions: parsed.totalCompletions ?? 0,
      totalSeconds: parsed.totalSeconds ?? 0,
      fastestSeconds: parsed.fastestSeconds ?? null,
      unlocked: parsed.unlocked ?? [],
      uniqueTemplates: parsed.uniqueTemplates ?? [],
    };
  } catch {
    return EMPTY;
  }
}

function save(rec: AchievementRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
}

/** 计算当前已解锁的徽章 id 列表 */
function computeUnlocked(rec: AchievementRecord): string[] {
  const unlocked = new Set<string>(rec.unlocked);
  const uniqueCount = rec.uniqueTemplates.length;

  if (rec.totalCompletions >= 1) unlocked.add('firstStep');
  if (uniqueCount >= 3) unlocked.add('collector');
  if (uniqueCount >= 5) unlocked.add('master');
  if (rec.totalCompletions >= 10) unlocked.add('persistent');
  if (rec.fastestSeconds !== null && rec.fastestSeconds <= 120) {
    unlocked.add('flash');
    unlocked.add('speedrunner');
  } else if (rec.fastestSeconds !== null && rec.fastestSeconds <= 300) {
    unlocked.add('speedrunner');
  }
  if (rec.totalCompletions >= 30) unlocked.add('explorer');
  if (rec.totalCompletions >= 50) unlocked.add('legend');

  return Array.from(unlocked);
}

/**
 * 成就系统 hook：
 * - 记录模板完成次数、累计时长
 * - 自动解锁徽章
 * - 跨标签页同步
 */
export function useAchievements() {
  const [record, setRecord] = useState<AchievementRecord>(load);

  // 跨标签页同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setRecord(load());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /**
   * 记录一次模板完成。
   * @returns 新解锁的徽章 id 列表（用于触发庆祝提示）
   */
  const recordCompletion = useCallback((templateId: string, seconds: number) => {
    const cur = load();
    const safeSeconds = Math.max(0, Math.round(seconds));
    const next: AchievementRecord = {
      templateCompletions: {
        ...cur.templateCompletions,
        [templateId]: (cur.templateCompletions[templateId] ?? 0) + 1,
      },
      totalCompletions: cur.totalCompletions + 1,
      totalSeconds: cur.totalSeconds + safeSeconds,
      fastestSeconds:
        cur.fastestSeconds === null
          ? safeSeconds
          : Math.min(cur.fastestSeconds, safeSeconds),
      unlocked: cur.unlocked,
      uniqueTemplates: Array.from(new Set([...cur.uniqueTemplates, templateId])),
    };
    next.unlocked = computeUnlocked(next);
    const newlyUnlocked = next.unlocked.filter(id => !cur.unlocked.includes(id));
    save(next);
    setRecord(next);
    return newlyUnlocked;
  }, []);

  const resetAchievements = useCallback(() => {
    save(EMPTY);
    setRecord(EMPTY);
  }, []);

  /** 构造徽章列表（含未解锁项的进度信息） */
  const badges: Badge[] = BADGE_IDS.map(id => {
    const unlocked = record.unlocked.includes(id);
    let progress: string | null = null;
    if (!unlocked) {
      switch (id) {
        case 'firstStep':
          progress = `${Math.min(record.totalCompletions, 1)}/1`;
          break;
        case 'collector':
          progress = `${Math.min(record.uniqueTemplates.length, 3)}/3`;
          break;
        case 'master':
          progress = `${Math.min(record.uniqueTemplates.length, 5)}/5`;
          break;
        case 'persistent':
          progress = `${Math.min(record.totalCompletions, 10)}/10`;
          break;
        case 'explorer':
          progress = `${Math.min(record.totalCompletions, 30)}/30`;
          break;
        case 'legend':
          progress = `${Math.min(record.totalCompletions, 50)}/50`;
          break;
        case 'speedrunner':
        case 'flash':
        default:
          progress = null;
      }
    }
    const emojiMap: Record<string, string> = {
      firstStep: '🎯',
      collector: '🧩',
      master: '👑',
      persistent: '🔥',
      speedrunner: '⚡',
      flash: '💫',
      explorer: '🧭',
      legend: '🏆',
    };
    return {
      id,
      emoji: emojiMap[id] ?? '🏅',
      nameKey: `achievement.badge.${id}.name`,
      descKey: `achievement.badge.${id}.desc`,
      unlocked,
      progress,
    };
  });

  const unlockedCount = record.unlocked.length;

  return {
    record,
    badges,
    unlockedCount,
    recordCompletion,
    resetAchievements,
  };
}
