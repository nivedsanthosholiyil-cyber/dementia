import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mood } from '@/types';
import { useI18n } from '@/i18n';
import { useSettings } from '@/hooks/useSettings';
import { useReminders } from '@/hooks/useReminders';
import { useProgressData } from '@/hooks/useProgressData';
import { greetingKey } from '@/utils/helpers';
import { formatTime } from '@/services/reminderService';
import { AppHeader } from '@/components/AppHeader';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Button } from '@/components/Button';
import { VoiceButton } from '@/components/VoiceButton';
import { Icon } from '@/components/Icon';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { storageService } from '@/services/storageService';
import { localDateKey } from '@/utils/date';

const DAILY_GAME_GOAL = 3;

export function PatientHome() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { reminders, completedCount, toggle } = useReminders();
  const { summary, todayGames } = useProgressData();
  const [moodNote, setMoodNote] = useState('');
  const [savedMood, setSavedMood] = useState<Mood | null>(null);
  const saveMood = async (mood: Mood) => {
    if (!settings.activePatientId) return;
    await storageService.putMood({ id: `m_${Date.now()}`, patientId: settings.activePatientId, mood, note: moodNote.trim() || undefined, date: localDateKey(), createdAt: Date.now() });
    setSavedMood(mood);
  };

  const greeting = t(`welcome.${greetingKey()}`);
  const total = reminders.length;
  const level = summary?.currentLevel ?? 1;

  const activity = Math.min(
    100,
    Math.round(
      ((total ? completedCount / total : 0) * 0.6 +
        Math.min(todayGames / DAILY_GAME_GOAL, 1) * 0.4) *
        100,
    ),
  );

  const routineItems = reminders.slice(0, 4);
  const weekdayName = new Date().toLocaleDateString([], { weekday: 'long' });

  const planText = `${greeting}, ${settings.patientName}. ${t('home.oneStep')} ${routineItems
    .map((r) => `${r.title} ${formatTime(r.time)}`)
    .join('. ')}`;
  const readScreen = `${greeting}, ${settings.patientName}. ${t('home.oneStep')}`;

  return (
    <>
      <AppHeader subtitle={t('nav.home')} readText={readScreen} />
      <main className="page">
        {/* Greeting */}
        <div
          className="card"
          style={{
            background: 'var(--surface-container)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="row-between" style={{ marginBottom: '0.5rem' }}>
            <span className="chip chip--green">
              <span className="chip__dot" /> {weekdayName}
            </span>
            <span
              className="row text-muted"
              style={{ gap: '0.3rem', fontSize: 'var(--fs-caption)', fontWeight: 700 }}
            >
              <Icon name={online ? 'wifi' : 'wifi-off'} size={18} />
              {t('offline.worksOffline')}
            </span>
          </div>
          <h1>
            {greeting}, {settings.patientName} 👋
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--fs-body-lg)', marginTop: '0.25rem' }}>
            {t('home.oneStep')}
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <VoiceButton text={planText} label={t('home.hearPlan')} />
          </div>
        </div>

        <OfflineBanner />

        {settings.guestMode && <div className="banner banner--amber" role="status"><span aria-hidden="true">🧪</span><span><strong>Guest Mode</strong> — your changes are saved only on this device.</span></div>}

        <section className="grid-2">
          <Button size="lg" block icon="play" onClick={() => navigate('/games')}>Play</Button>
          <Button size="lg" block variant="secondary" icon="chart" onClick={() => navigate('/progress')}>Progress</Button>
          <Button size="lg" block variant="secondary" icon="users" onClick={() => navigate('/people')}>My People</Button>
          <Button size="lg" block variant="ghost" icon="alert" onClick={() => navigate('/emergency')}>Emergency</Button>
        </section>

        <section className="card stack-sm">
          <h2>How are you feeling today?</h2>
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
            {(['happy', 'calm', 'neutral', 'sad', 'worried'] as Mood[]).map((mood) => <button className={`btn ${savedMood === mood ? 'btn--secondary' : 'btn--ghost'}`} type="button" key={mood} onClick={() => saveMood(mood)}>{mood}</button>)}
          </div>
          <input className="input" aria-label="Optional mood note" value={moodNote} onChange={(e) => setMoodNote(e.target.value)} placeholder="Optional note" />
        </section>

        {/* Start today's game */}
        <button
          type="button"
          className="card card--interactive"
          style={{
            background: 'var(--secondary)',
            color: 'var(--on-secondary)',
            border: 'none',
            boxShadow: 'var(--shadow-md)',
          }}
          onClick={() => navigate('/games/picture-pairs')}
        >
          <div className="row" style={{ gap: 'var(--space-md)' }}>
            <span
              className="medallion"
              aria-hidden="true"
              style={{ background: 'var(--primary-container)', color: '#3a2500' }}
            >
              <Icon name="play" size={30} />
            </span>
            <div className="grow">
              <h2 style={{ color: 'var(--on-secondary)' }}>{t('home.startGame')}</h2>
              <p style={{ color: 'var(--secondary-fixed)', fontSize: 'var(--fs-body)' }}>
                {t('home.startGameSub')} • {t('games.picturePairs')}
              </p>
            </div>
            <Icon name="arrow-right" size={26} />
          </div>
        </button>

        {/* Today's routine */}
        <section className="stack-sm">
          <div className="row-between">
            <h2>{t('home.todaysRoutine')}</h2>
            <span className="chip chip--soft">
              {completedCount} / {total} {t('home.ofDone')}
            </span>
          </div>

          {routineItems.map((r) => (
            <div key={r.id} className="card stack-sm" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <div className="row">
                <span
                  className={`medallion ${r.completed ? 'medallion--green' : 'medallion--soft'}`}
                  aria-hidden="true"
                >
                  {r.icon}
                </span>
                <div className="grow">
                  <div className={`setting-row__title ${r.completed ? 'strike' : ''}`}>
                    {r.title}
                  </div>
                  <div className="setting-row__desc">
                    {formatTime(r.time)} • {r.detail}
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn ${r.completed ? 'btn--secondary' : 'btn--warn'}`}
                  style={{ minHeight: '3rem', padding: '0 1rem' }}
                  onClick={() => toggle(r)}
                  aria-label={`${r.completed ? t('reminders.completed') : t('home.tapToCheck')}: ${r.title}`}
                >
                  <Icon name="check" size={20} />
                  <span>{r.completed ? t('common.done') : t('home.complete')}</span>
                </button>
              </div>
            </div>
          ))}
          <Button variant="ghost" block icon="bell" onClick={() => navigate('/reminders')}>
            {t('reminders.title')}
          </Button>
        </section>

        {/* Your day at a glance */}
        <section className="card card--tint stack" style={{ background: 'var(--surface-container)' }}>
          <h2>{t('home.yourDay')}</h2>
          <div className="row" style={{ gap: 'var(--space-lg)', justifyContent: 'center' }}>
            <div
              className="ring"
              style={{ ['--p' as string]: activity }}
              role="img"
              aria-label={`${activity}% ${t('home.yourDay')}`}
            >
              <div className="text-center">
                <div className="ring__value">{activity}%</div>
                <div className="ring__label">{t('common.done')}</div>
              </div>
            </div>
          </div>
          <div className="grid-2">
            <div className="stat">
              <div className="stat__value">
                {todayGames} / {DAILY_GAME_GOAL}
              </div>
              <div className="stat__label">{t('home.gamesCompleted')}</div>
            </div>
            <div className="stat">
              <div className="stat__value">
                {t('home.level')} {level}
              </div>
              <div className="stat__label">{t('home.currentStage')}</div>
            </div>
          </div>
          <div className="banner banner--amber">
            <Icon name="star" size={22} />
            <span>
              ⭐ {settings.patientName}, {t('home.encourage')}
            </span>
          </div>
        </section>
      </main>
    </>
  );
}
