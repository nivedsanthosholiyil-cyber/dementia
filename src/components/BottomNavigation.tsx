import { NavLink } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { Icon, type IconName } from './Icon';

interface NavDef {
  to: string;
  labelKey: string;
  icon: IconName;
  end?: boolean;
}

const PATIENT_NAV: NavDef[] = [
  { to: '/home', labelKey: 'nav.home', icon: 'home' },
  { to: '/games', labelKey: 'nav.games', icon: 'games' },
  { to: '/reminders', labelKey: 'nav.reminders', icon: 'bell' },
  { to: '/progress', labelKey: 'nav.progress', icon: 'chart' },
  { to: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];

const CAREGIVER_NAV: NavDef[] = [
  { to: '/caregiver', labelKey: 'nav.overview', icon: 'home', end: true },
  { to: '/caregiver/progress', labelKey: 'nav.progress', icon: 'chart' },
  { to: '/caregiver/alerts', labelKey: 'nav.alerts', icon: 'bell' },
  { to: '/caregiver/patient', labelKey: 'nav.patient', icon: 'users' },
  { to: '/caregiver/settings', labelKey: 'nav.settings', icon: 'settings' },
];

export function BottomNavigation({ role }: { role: 'patient' | 'caregiver' }) {
  const { t } = useI18n();
  const items = role === 'patient' ? PATIENT_NAV : CAREGIVER_NAV;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav__inner">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="nav-item"
          >
            <span className="nav-item__icon">
              <Icon name={item.icon} size={26} />
            </span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
