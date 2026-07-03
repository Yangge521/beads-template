import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import type { Badge } from '../hooks/useAchievements';
import { useTranslation } from '../context/LanguageContext';

interface AchievementBadgesProps {
  badges: Badge[];
  unlockedCount: number;
  /** 新解锁的徽章 id 列表（用于高亮提示） */
  newlyUnlocked?: string[];
  onReset?: () => void;
}

/**
 * 成就徽章展示面板（可折叠）。
 * 已解锁徽章高亮显示，未解锁徽章灰显并展示进度。
 */
export default function AchievementBadges({
  badges,
  unlockedCount,
  newlyUnlocked = [],
  onReset,
}: AchievementBadgesProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const total = badges.length;

  return (
    <section className="achievement-panel" aria-label={t('achievement.title')}>
      <button
        type="button"
        className="achievement-panel__header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls="achievement-panel-body"
      >
        <Trophy size={18} aria-hidden="true" />
        <span className="achievement-panel__title">{t('achievement.title')}</span>
        <span className="achievement-panel__count" aria-hidden="true">
          {unlockedCount}/{total}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div id="achievement-panel-body" className="achievement-panel__body">
          <ul className="achievement-panel__grid">
            {badges.map(badge => {
              const isNew = newlyUnlocked.includes(badge.id);
              return (
                <li
                  key={badge.id}
                  className={`achievement-badge ${badge.unlocked ? 'achievement-badge--unlocked' : 'achievement-badge--locked'} ${isNew ? 'achievement-badge--new' : ''}`}
                  title={t(badge.descKey)}
                  aria-label={`${t(badge.nameKey)} - ${t(badge.descKey)}${badge.unlocked ? '' : ` (${badge.progress ?? ''})`}`}
                >
                  <span className="achievement-badge__emoji" aria-hidden="true">
                    {badge.emoji}
                  </span>
                  <span className="achievement-badge__name">{t(badge.nameKey)}</span>
                  {!badge.unlocked && badge.progress && (
                    <span className="achievement-badge__progress" aria-hidden="true">{badge.progress}</span>
                  )}
                  {isNew && <span className="achievement-badge__new-flag" aria-hidden="true">NEW</span>}
                </li>
              );
            })}
          </ul>
          {onReset && unlockedCount > 0 && (
            <button
              type="button"
              className="achievement-panel__reset"
              onClick={() => {
                if (confirm(t('achievement.resetConfirm'))) onReset();
              }}
            >
              {t('achievement.reset')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
