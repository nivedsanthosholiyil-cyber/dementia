import { useI18n } from '@/i18n';
import { Button } from './Button';
import { Icon } from './Icon';

interface GameCardProps {
  emoji: string;
  title: string;
  description: string;
  toneKey: 'easy' | 'calm' | 'relaxing';
  minutes: string;
  onPlay: () => void;
  onHear?: () => void;
}

const toneToVariant: Record<GameCardProps['toneKey'], string> = {
  easy: 'medallion--green',
  calm: 'medallion--amber',
  relaxing: 'medallion--soft',
};

export function GameCard({
  emoji,
  title,
  description,
  toneKey,
  minutes,
  onPlay,
  onHear,
}: GameCardProps) {
  const { t } = useI18n();
  return (
    <div className="card stack-sm">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className={`medallion ${toneToVariant[toneKey]}`} aria-hidden="true">
          {emoji}
        </span>
        <div className="grow">
          <h3>{title}</h3>
          <div
            className="row"
            style={{ gap: '0.4rem', color: 'var(--on-secondary-container)', marginTop: '0.15rem' }}
          >
            <span className="chip chip--green">{t(`games.${toneKey}`)}</span>
            <span className="text-muted" style={{ fontSize: 'var(--fs-caption)' }}>
              {minutes} {t('games.mins')}
            </span>
          </div>
        </div>
        {onHear && (
          <button
            type="button"
            className="medallion medallion--soft"
            style={{ width: '2.75rem', height: '2.75rem', fontSize: '1rem' }}
            aria-label={t('common.readAloud')}
            onClick={onHear}
          >
            <Icon name="volume" size={22} />
          </button>
        )}
      </div>
      <p className="text-muted">{description}</p>
      <Button variant="primary" size="lg" block icon="play" onClick={onPlay}>
        {t('games.play')}
      </Button>
    </div>
  );
}
