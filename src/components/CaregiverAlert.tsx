import { Icon, type IconName } from './Icon';

interface CaregiverAlertProps {
  tone: 'info' | 'warn' | 'good';
  icon?: IconName;
  emoji?: string;
  title: string;
  detail?: string;
}

const toneClass: Record<CaregiverAlertProps['tone'], string> = {
  info: 'banner--soft',
  warn: 'banner--amber',
  good: 'banner--green',
};

export function CaregiverAlert({ tone, icon, emoji, title, detail }: CaregiverAlertProps) {
  return (
    <div className={`banner ${toneClass[tone]}`}>
      {emoji ? (
        <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>
          {emoji}
        </span>
      ) : (
        <Icon name={icon ?? 'sparkle'} size={22} />
      )}
      <div>
        <strong>{title}</strong>
        {detail && <div style={{ fontSize: 'var(--fs-caption)' }}>{detail}</div>}
      </div>
    </div>
  );
}
