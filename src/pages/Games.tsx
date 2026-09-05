import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useVoice } from '@/hooks/useVoice';
import { AppHeader } from '@/components/AppHeader';
import { GameCard } from '@/components/GameCard';
import { VoiceButton } from '@/components/VoiceButton';
import { Icon } from '@/components/Icon';

export function Games() {
  const { t } = useI18n();
  const { say } = useVoice();
  const navigate = useNavigate();

  const readScreen = `${t('games.title')}. ${t('games.subtitle')}`;

  return (
    <>
      <AppHeader subtitle={t('nav.games')} readText={readScreen} />
      <main className="page">
        <div className="stack-sm">
          <h1>{t('games.title')}</h1>
          <p className="text-muted" style={{ fontSize: 'var(--fs-body-lg)' }}>
            {t('games.subtitle')}
          </p>
        </div>

        <VoiceButton
          text={`${t('games.picturePairs')}. ${t('games.picturePairsDesc')} ${t(
            'games.patternRecall',
          )}. ${t('games.patternRecallDesc')} ${t('games.dailyRoutine')}. ${t(
            'games.dailyRoutineDesc',
          )}`}
          label={t('games.listenInstructions')}
        />

        <div className="banner banner--green">
          <span className="medallion medallion--green" aria-hidden="true">
            <Icon name="leaf" size={24} />
          </span>
          <div>
            <strong>{t('games.warmUpTitle')}</strong>
            <div style={{ fontSize: 'var(--fs-caption)' }}>{t('games.warmUpBody')}</div>
          </div>
        </div>

        <GameCard
          emoji="🧠"
          title={t('games.picturePairs')}
          description={t('games.picturePairsDesc')}
          toneKey="easy"
          minutes="3–5"
          onPlay={() => navigate('/games/picture-pairs')}
          onHear={() => say(`${t('games.picturePairs')}. ${t('games.picturePairsDesc')}`)}
        />
        <GameCard emoji="👤" title="Who Is This Person?" description="Recognize familiar people and faces." toneKey="calm" minutes="2–4" onPlay={() => navigate('/games/who-is-this-person')} onHear={() => say('Who Is This Person? Recognize familiar people and faces.')} />
        <GameCard
          emoji="🔢"
          title={t('games.patternRecall')}
          description={t('games.patternRecallDesc')}
          toneKey="calm"
          minutes="3"
          onPlay={() => navigate('/games/pattern-recall')}
          onHear={() => say(`${t('games.patternRecall')}. ${t('games.patternRecallDesc')}`)}
        />
        <GameCard
          emoji="🌤️"
          title={t('games.dailyRoutine')}
          description={t('games.dailyRoutineDesc')}
          toneKey="relaxing"
          minutes="4"
          onPlay={() => navigate('/games/daily-routine')}
          onHear={() => say(`${t('games.dailyRoutine')}. ${t('games.dailyRoutineDesc')}`)}
        />

        <div className="banner banner--soft">
          <span className="medallion medallion--amber" aria-hidden="true">
            <Icon name="heart" size={24} />
          </span>
          <div>
            <strong>{t('games.alwaysPace')}</strong>
            <div style={{ fontSize: 'var(--fs-caption)' }}>{t('games.alwaysPaceBody')}</div>
          </div>
        </div>
      </main>
    </>
  );
}
