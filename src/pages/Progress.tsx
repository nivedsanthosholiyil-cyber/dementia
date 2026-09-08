import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useProgressData } from '@/hooks/useProgressData';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { CardSkeleton } from '@/components/Skeleton';
import { ContentState } from '@/components/ContentState';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Progress() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { summary, loading, error, reload } = useProgressData();
  const readScreen = `${t('progress.title')}. ${t('progress.subtitle')}`;

  if (loading) {
    return <><AppHeader subtitle={t('nav.progress')} readText={readScreen} /><main className="page stack"><CardSkeleton rows={3} /><CardSkeleton rows={4} /></main></>;
  }

  if (error) {
    return <><AppHeader subtitle={t('nav.progress')} readText={readScreen} /><main className="page"><ContentState title="Progress is unavailable" detail={error} tone="amber" action={{ label: 'Try again', onClick: () => void reload() }} /></main></>;
  }

  const completed = summary?.gamesCompleted ?? 0;
  const activeDays = summary?.daysPlayedThisWeek ?? 0;
  const weekly = summary?.weekly ?? [];
  const firstStep = completed === 0;
  const encouragement = firstStep
    ? t('progress.firstStep')
    : completed === 1
      ? t('progress.oneActivity')
      : t('progress.playedThisWeek', { n: completed });

  return (
    <>
      <AppHeader subtitle={t('nav.progress')} readText={readScreen} />
      <main className="page progress-page">
        <section className="screen-intro">
          <p className="eyebrow">{t('progress.gentleLookBack')}</p>
          <h1>{t('progress.title')}</h1>
          <p>{t('progress.subtitle')}</p>
        </section>

        <section className="progress-celebration" aria-label={t('progress.thisWeek')}>
          <div className="progress-celebration__icon"><Icon name={firstStep ? 'leaf' : 'heart'} size={30} /></div>
          <div>
            <p className="eyebrow">{t('progress.thisWeek')}</p>
            <h2>{firstStep ? t('progress.freshStart') : t('progress.doingWell')}</h2>
            <p>{encouragement}</p>
          </div>
        </section>

        <section className="progress-week" aria-labelledby="week-title">
          <div className="section-heading"><h2 id="week-title">{t('progress.week')}</h2><span>{activeDays} {activeDays === 1 ? t('progress.day') : t('progress.days')} {t('progress.active')}</span></div>
          <div className="week-dots" role="img" aria-label={`${activeDays} ${activeDays === 1 ? t('progress.day') : t('progress.days')} ${t('progress.thisWeek').toLowerCase()}`}>
            {WEEK_DAYS.map((day, index) => {
              const active = (weekly[index]?.gamesCompleted ?? 0) > 0;
              return <div className={`week-dots__day ${active ? 'is-active' : ''}`} key={`${day}-${index}`}><span aria-hidden="true">{active ? <Icon name="check" size={18} /> : ''}</span><small>{day}</small></div>;
            })}
          </div>
          <p className="text-muted">{t('progress.activityMark')}</p>
        </section>

        <section className="progress-note">
          <Icon name="sparkle" size={24} />
          <div><strong>{t('progress.effortTitle')}</strong><p>{t('progress.effortBody')}</p></div>
        </section>

        {firstStep && <Button size="lg" block icon="play" onClick={() => navigate('/games')}>{t('progress.chooseActivity')}</Button>}
        <p className="disclaimer">{t('progress.trendDisclaimer')}</p>
      </main>
    </>
  );
}
