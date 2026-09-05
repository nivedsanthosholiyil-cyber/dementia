import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import { useSettings } from '@/hooks/useSettings';
import { useProgressData } from '@/hooks/useProgressData';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { listAuthorizedPatients } from '@/services/patientService';
import type { PatientRecord } from '@/types';

const GAME_LABEL: Record<string, string> = {
  'picture-pairs': 'games.picturePairs',
  'pattern-recall': 'games.patternRecall',
  'daily-routine': 'games.dailyRoutine',
};

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export function CaregiverPatient() {
  const { t } = useI18n();
  const { settings, updateActiveProfile } = useSettings();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [patientMessage, setPatientMessage] = useState('');
  const { recentSessions } = useProgressData();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    listAuthorizedPatients().then(setPatients).catch((error) => setPatientMessage(error instanceof Error ? error.message : 'Unable to load authorized patients.'));
  }, []);

  const patient = settings.patientName.trim() || 'Patient';
  const readScreen = `${t('caregiver.patientProfile')}. ${patient}.`;

  return (
    <>
      <AppHeader subtitle={t('nav.patient')} readText={readScreen} />
      <main className="page">
        <div className="stack-lg">
          {isSupabaseConfigured && <Card>
            <h2 className="card-title">Choose patient</h2>
            <p className="muted">Only patients linked to this caregiver and currently sharing are shown.</p>
            {patients.length === 0 ? <p className="muted">No authorized patients yet.</p> : patients.map((candidate) => <button type="button" className="link-row" key={candidate.id} onClick={() => updateActiveProfile({ id: candidate.id, patientName: candidate.name })}><div><strong>{candidate.name}</strong><div className="muted">{candidate.id === settings.activePatientId ? 'Current patient' : 'Select patient'}</div></div><Icon name="chevron-right" size={20} /></button>)}
            {patientMessage && <p className="muted" role="status">{patientMessage}</p>}
          </Card>}
          <div>
            <h1 className="page-title">{t('caregiver.patientProfile')}</h1>
          </div>

          {/* Profile */}
          <Card padLg>
            <div className="row" style={{ gap: '0.9rem' }}>
              <span
                aria-hidden="true"
                style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '9999px',
                  background: 'var(--secondary-container)',
                  color: 'var(--secondary-dark)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                }}
              >
                {patient.charAt(0)}
              </span>
              <div>
                <h2 className="card-title">{patient}</h2>
                <p className="muted">
                  {t('caregiver.relationFather')} · {t('caregiver.device')}
                </p>
              </div>
            </div>
          </Card>

          {/* Emergency contact */}
          <Card>
            <div className="metric-row">
              <div className="row" style={{ gap: '0.6rem' }}>
                <Icon name="phone" size={22} />
                <strong>{t('settings.emergencyTitle')}</strong>
              </div>
              <span className="pill">{settings.emergencyContact}</span>
            </div>
            <div className="metric-row">
              <div className="row" style={{ gap: '0.6rem' }}>
                <Icon name="users" size={22} />
                <strong>{t('settings.familyTitle')}</strong>
              </div>
              <span className="pill">{settings.caregiverName}</span>
            </div>
          </Card>
          <div className="grid-2"><Button variant="secondary" block onClick={() => navigate('/caregiver/people')}>My People</Button><Button variant="secondary" block onClick={() => navigate('/caregiver/reminders')}>Reminders</Button></div>

          {/* Recent sessions */}
          <Card>
            <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>
              {t('caregiver.recentSessions')}
            </h2>
            {recentSessions.length === 0 ? (
              <p className="muted">{t('caregiver.noSessions')}</p>
            ) : (
              <div>
                {recentSessions.map((s) => (
                  <div className="metric-row" key={s.id}>
                    <div>
                      <strong>{t(GAME_LABEL[s.gameType])}</strong>
                      <div className="muted">
                        {t('home.level')} {s.level} · {timeAgo(s.timestamp)}
                      </div>
                    </div>
                    <span className="pill pill--green">{s.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="disclaimer">{t('caregiver.trendDisclaimer')}</p>
        </div>
      </main>
    </>
  );
}
