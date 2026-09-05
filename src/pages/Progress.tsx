import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useProgressData } from '@/hooks/useProgressData';
import { getLevels } from '@/services/gameService';
import { weekdayInitials } from '@/services/progressService';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ProgressChart } from '@/components/ProgressChart';
import { Icon } from '@/components/Icon';
import type { GameSession } from '@/types';
import { GAME_DEFINITIONS } from '@/services/gameService';
import { CardSkeleton } from '@/components/Skeleton';
import { ContentState } from '@/components/ContentState';

const GAME_LABEL: Record<string, string> = {
  'picture-pairs': 'games.picturePairs',
  'pattern-recall': 'games.patternRecall',
  'daily-routine': 'games.dailyRoutine',
};

export function Progress() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { summary, loading, sessions, error, reload } = useProgressData();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const readScreen = `${t('progress.title')}. ${t('progress.subtitle')}`;

  const hasData = !!summary && summary.gamesCompleted > 0;

  if (loading) return <><AppHeader subtitle={t('nav.progress')} readText={readScreen} /><main className="page stack"><CardSkeleton rows={3} /><CardSkeleton rows={5} /></main></>;

  if (error) return <><AppHeader subtitle={t('nav.progress')} readText={readScreen} /><main className="page"><ContentState title="Progress is unavailable" detail={error} tone="amber" action={{ label: 'Try again', onClick: () => void reload() }} /></main></>;

  if (!loading && !hasData) {
    return (
      <>
        <AppHeader subtitle={t('nav.progress')} readText={readScreen} />
        <main className="page">
          <div className="stack-lg">
            <div>
              <h1 className="page-title">{t('progress.title')}</h1>
              <p className="page-sub">{t('progress.subtitle')}</p>
            </div>
            <Card variant="tint" padLg>
              <div className="text-center stack">
                <span aria-hidden="true" style={{ fontSize: '3rem' }}>
                  🌱
                </span>
                <h2 className="card-title">{t('progress.emptyTitle')}</h2>
                <p className="muted">{t('progress.emptyBody')}</p>
                <Button icon="play" block size="lg" onClick={() => navigate('/games')}>
                  {t('progress.playFirst')}
                </Button>
              </div>
            </Card>
            <p className="disclaimer">{t('progress.trendDisclaimer')}</p>
          </div>
        </main>
      </>
    );
  }

  const initials = weekdayInitials();
  const bars =
    summary?.weekly.map((d, i) => ({
      label: initials[i] ?? '',
      value: d.gamesCompleted,
      variant: d.gamesCompleted > 0 ? ('default' as const) : ('muted' as const),
    })) ?? [];

  const levels = getLevels();
  const completedSessions = sessions.filter((session) => session.completed);
  const byGame = Object.entries(completedSessions.reduce<Record<string, GameSession[]>>((groups, session) => { (groups[session.gameType] ??= []).push(session); return groups; }, {}));
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - (period === 'daily' ? 0 : period === 'weekly' ? 6 : 29));
  const periodSessions = completedSessions.filter((session) => session.timestamp >= periodStart.getTime());
  const categoryStats = Object.entries(periodSessions.reduce<Record<string, GameSession[]>>((groups, session) => { const category = GAME_DEFINITIONS[session.gameType].category; (groups[category] ??= []).push(session); return groups; }, {}));
  const avgResponse = periodSessions.length ? Math.round(periodSessions.reduce((sum, session) => sum + session.durationSec, 0) / periodSessions.length) : 0;
  const avgMistakes = periodSessions.length ? Math.round(periodSessions.reduce((sum, session) => sum + Math.max(0, session.attempts - Math.round((session.accuracy / 100) * session.attempts)), 0) / periodSessions.length) : 0;

  return (
    <>
      <AppHeader subtitle={t('nav.progress')} readText={readScreen} />
      <main className="page">
        <div className="stack-lg">
          <div>
            <h1 className="page-title">{t('progress.title')}</h1>
            <p className="page-sub">{t('progress.subtitle')}</p>
          </div>

          {/* Key stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card__value">{summary?.gamesCompleted ?? 0}</div>
              <div className="stat-card__label">{t('progress.gamesCompleted')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{summary?.averageScore ?? 0}%</div>
              <div className="stat-card__label">{t('progress.avgPerformance')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">{summary?.currentLevel ?? 1}</div>
              <div className="stat-card__label">{t('progress.currentLevel')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">
                {summary?.streakDays ?? 0}
              </div>
              <div className="stat-card__label">
                {t('progress.activityStreak')} ·{' '}
                {(summary?.streakDays ?? 0) === 1 ? t('progress.day') : t('progress.days')}
              </div>
            </div>
          </div>

          {/* Weekly chart */}
          <Card padLg>
            <div className="row-between" style={{ marginBottom: '0.75rem' }}>
              <h2 className="card-title">{t('progress.weeklyTitle')}</h2>
              <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>
                📊
              </span>
            </div>
            <ProgressChart
              bars={bars}
              ariaLabel={t('progress.weeklyTitle')}
            />
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              {t('progress.playedThisWeek', { n: summary?.daysPlayedThisWeek ?? 0 })}
            </p>
          </Card>

          <Card>
            <div className="row-between"><h2 className="card-title">Activity details</h2><div className="row" style={{ gap: '0.25rem' }}>{(['daily', 'weekly', 'monthly'] as const).map((value) => <Button key={value} variant={period === value ? 'secondary' : 'ghost'} onClick={() => setPeriod(value)}>{value}</Button>)}</div></div>
            <div className="stat-grid" style={{ marginTop: '0.75rem' }}><div className="stat-card"><div className="stat-card__value">{periodSessions.length}</div><div className="stat-card__label">Sessions</div></div><div className="stat-card"><div className="stat-card__value">{avgResponse}s</div><div className="stat-card__label">Average time</div></div><div className="stat-card"><div className="stat-card__value">{avgMistakes}</div><div className="stat-card__label">Mistakes</div></div></div>
            {categoryStats.map(([category, entries]) => <div className="metric-row" key={category}><span>{category}</span><span className="pill">{Math.round(entries.reduce((sum, entry) => sum + entry.accuracy, 0) / entries.length)}%</span></div>)}
          </Card>

          {/* Per-game levels */}
          <Card>
            <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>
              {t('settings.difficultyTitle')}
            </h2>
            {(Object.keys(levels) as Array<keyof typeof levels>).map((g) => (
              <div className="metric-row" key={g}>
                <span>{t(GAME_LABEL[g])}</span>
                <span className="pill pill--green">
                  {t('home.level')} {levels[g]}
                </span>
              </div>
            ))}
          </Card>

          <Card>
            <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Your game activity</h2>
            {byGame.map(([game, entries]) => {
              const average = Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length);
              return <div className="metric-row" key={game}><div><strong>{GAME_DEFINITIONS[game as keyof typeof GAME_DEFINITIONS]?.title ?? game}</strong><div className="muted">{GAME_DEFINITIONS[game as keyof typeof GAME_DEFINITIONS]?.category} · {entries.length} sessions</div></div><span className="pill pill--green">{average}%</span></div>;
            })}
            {byGame.length === 0 && <p className="muted">Play a game to see your activity here.</p>}
          </Card>

          {/* Encouragement */}
          <Card variant="tint">
            <div className="row" style={{ gap: '0.6rem' }}>
              <Icon name="sparkle" size={22} />
              <p style={{ margin: 0 }}>{t('progress.insight')}</p>
            </div>
          </Card>

          <p className="disclaimer">{t('progress.trendDisclaimer')}</p>
        </div>
      </main>
    </>
  );
}
