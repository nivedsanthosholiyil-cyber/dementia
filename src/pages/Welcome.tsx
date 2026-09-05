import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n, LANGUAGES } from '@/i18n';
import { useSettings } from '@/hooks/useSettings';
import { greetingKey } from '@/utils/helpers';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { VoiceButton } from '@/components/VoiceButton';
import { Icon } from '@/components/Icon';
import { Toggle } from '@/components/Toggle';
import { biometricStatus, createProfile, registerPasskey, savePin, verifyPasskey, verifyPin } from '@/services/profileService';
import { activeProfileFrom, displayName } from '@/utils/profile';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signInWithGoogle, signUp } from '@/services/authService';
import { createPatient } from '@/services/patientService';

export function Welcome() {
  const { t } = useI18n();
  const { settings, setVoiceEnabled, setAccessibility, completeOnboarding, updateActiveProfile, update } =
    useSettings();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [patientName, setPatientName] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const greeting = t(`welcome.${greetingKey()}`);
  const readText = `${greeting}. ${t('welcome.headline')} ${t('welcome.subtitle')}`;
  const currentLang = LANGUAGES.find((l) => l.code === settings.language);
  const routeForRole = (role: 'patient' | 'caregiver') => role === 'caregiver' ? '/caregiver' : '/home';

  const startPatient = async () => {
    if (!name.trim() || pin.length < 4) return;
    if (isSupabaseConfigured) {
      try {
        const result = await signUp(email, password, name, 'patient');
        if (!result.session) { setAuthMessage('Account created. Check your email to confirm, then log in.'); return; }
        const patient = await createPatient({ name: name.trim(), share_with_caregiver: false }, result.user.id);
        updateActiveProfile({ id: patient.id, patientName: patient.name, caregiverName: '', role: 'patient' });
        completeOnboarding(); navigate('/home');
      } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Unable to create account.'); }
      return;
    }
    const patient = await createProfile(name);
    await savePin(pin);
    updateActiveProfile({ id: patient.id, patientName: patient.name, caregiverName: '', role: 'patient' });
    completeOnboarding();
    navigate('/home');
  };
  const startCaregiver = async () => {
    if (!name.trim() || !patientName.trim() || pin.length < 4) return;
    if (isSupabaseConfigured) {
      try {
        const result = await signUp(email, password, name, 'caregiver');
        if (!result.session) { setAuthMessage('Account created. Check your email to confirm, then log in.'); return; }
        updateActiveProfile({ id: '', patientName: patientName.trim(), caregiverName: name.trim(), role: 'caregiver' });
        completeOnboarding(); navigate('/caregiver');
      } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Unable to create account.'); }
      return;
    }
    const patient = await createProfile(patientName);
    await savePin(pin);
    updateActiveProfile({ id: patient.id, patientName: patient.name, caregiverName: name.trim(), role: 'caregiver' });
    completeOnboarding();
    navigate('/caregiver');
  };
  const googleLogin = async () => {
    setGoogleLoading(true); setAuthMessage('');
    try { await signInWithGoogle(); }
    catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Unable to start Google sign-in.'); setGoogleLoading(false); }
  };
  const signInWithPin = async () => {
    if (await verifyPin(pin)) { update({ authenticated: true }); navigate(routeForRole(activeProfileFrom(settings).role)); }
    else setAuthMessage('PIN verification failed. Please try again.');
  };
  const signInWithPasskey = async () => {
    try { if (await verifyPasskey()) { update({ authenticated: true }); navigate(routeForRole(activeProfileFrom(settings).role)); } }
    catch (error) { setAuthMessage(error instanceof Error ? `Passkey verification failed: ${error.message}` : 'Passkey verification failed.'); }
  };
  const setupPasskey = async () => {
    try { const profile = activeProfileFrom(settings); await registerPasskey(profile.id, displayName(profile)); setAuthMessage('Passkey set up successfully.'); }
    catch (error) { setAuthMessage(error instanceof Error ? `Passkey registration failed: ${error.message}` : 'Passkey registration failed.'); }
  };

  if (isSupabaseConfigured) return <><AppHeader /><main className="page page--flow"><div className="card stack-lg text-center" style={{ marginTop: 'var(--space-lg)' }}><span className="medallion medallion--green" aria-hidden="true" style={{ alignSelf: 'center', width: '4.5rem', height: '4.5rem', fontSize: '2.25rem' }}>🌿</span><div className="stack-sm"><h1>Welcome to MemoryCare</h1><p className="text-muted">Continue securely to care for yourself or someone you love.</p></div><Button size="lg" block variant="primary" onClick={() => void googleLogin()} disabled={googleLoading}>{googleLoading ? 'Opening Google…' : 'Continue with Google'}</Button><p className="muted">Your account is protected by Supabase Auth.</p>{authMessage && <p role="status" className="banner banner--amber">{authMessage}</p>}</div></main></>;

  if (settings.onboarded && !settings.authenticated) return <><AppHeader /><main className="page page--flow"><div className="stack-sm text-center"><h1>Welcome back, {displayName(activeProfileFrom(settings))}</h1><p className="text-muted">Sign in on this device.</p></div><div className="card stack-sm"><label className="field__label" htmlFor="sign-in-pin">PIN</label><input id="sign-in-pin" className="input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" type="password" /><Button block onClick={signInWithPin}>Use PIN instead</Button>{biometricStatus() === 'supported' ? <><Button variant="secondary" block onClick={signInWithPasskey}>Sign in with Face ID / Passkey</Button><Button variant="ghost" block onClick={setupPasskey}>Set up Face ID / Passkey</Button></> : <p className="muted">Face ID / passkeys are unavailable in this browser or context. Use your PIN instead.</p>}{authMessage && <p role="status" className="muted">{authMessage}</p>}</div></main></>;

  return (
    <>
      <AppHeader readText={readText} />
      <main className="page page--flow">
        {/* Hero */}
        <div
          className="card"
          style={{
            background:
              'linear-gradient(135deg, var(--secondary-container) 0%, var(--primary-fixed) 130%)',
            border: 'none',
            padding: 'var(--space-lg)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="stack text-center" style={{ position: 'relative', zIndex: 1 }}>
            <div
              aria-hidden="true"
              style={{
                fontSize: '4.5rem',
                lineHeight: 1,
                filter: 'drop-shadow(0 6px 12px rgba(20,30,24,0.15))',
              }}
            >
              🧠
            </div>
            <span className="chip chip--soft" style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.7)' }}>
              <Icon name="leaf" size={18} /> {t('welcome.pacedForYou')}
            </span>
          </div>
        </div>

        <div className="stack-sm text-center">
          <h1 style={{ fontSize: 'var(--fs-display)' }}>{t('welcome.headline')}</h1>
          <p className="text-muted" style={{ fontSize: 'var(--fs-body-lg)' }}>
            {t('welcome.subtitle')}
          </p>
        </div>

        <div className="card stack-sm">
          <label className="field__label" htmlFor="onboard-name">Your name</label>
          <input id="onboard-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" autoComplete="name" />
          {isSupabaseConfigured && <><label className="field__label" htmlFor="onboard-email">Email</label><input id="onboard-email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" /><label className="field__label" htmlFor="onboard-password">Password</label><input id="onboard-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" type="password" autoComplete="new-password" /></>}
          <label className="field__label" htmlFor="onboard-patient">Patient name (for caregiver setup)</label>
          <input id="onboard-patient" className="input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Enter the patient’s name" autoComplete="name" />
          <label className="field__label" htmlFor="onboard-pin">Choose a 4+ digit demo PIN</label>
          <input id="onboard-pin" className="input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" type="password" minLength={4} placeholder="••••" />
          <small className="muted">{biometricStatus() === 'supported' ? 'A passkey can be set up after onboarding. PIN remains available as a fallback.' : 'Passkeys are unavailable in this browser or context. Use your local demo PIN.'}</small>
        </div>


        <div className="stack-sm">
          <Button variant="primary" size="lg" block icon="play" onClick={startPatient} disabled={!name.trim() || pin.length < 4}>
            {isSupabaseConfigured ? 'Create patient account' : t('welcome.getStarted')}
          </Button>
          <Button variant="secondary" size="lg" block icon="users" onClick={startCaregiver} disabled={!name.trim() || !patientName.trim() || pin.length < 4}>
            {isSupabaseConfigured ? 'Create caregiver account' : t('welcome.iAmCaregiver')}
          </Button>
        </div>

        {/* Helpful settings */}
        <div className="stack-sm">
          <div className="eyebrow">{t('welcome.helpfulSettings')}</div>

          <button className="setting-row" onClick={() => navigate('/language')}>
            <span className="medallion medallion--amber" aria-hidden="true">
              <Icon name="translate" size={26} />
            </span>
            <span className="setting-row__body">
              <span className="setting-row__title">{t('welcome.language')}</span>
              <span className="setting-row__desc">{currentLang?.native}</span>
            </span>
            <Icon name="chevron-right" size={22} />
          </button>

          <div className="setting-row">
            <span className="medallion medallion--green" aria-hidden="true">
              <Icon name="volume" size={26} />
            </span>
            <span className="setting-row__body">
              <span className="setting-row__title">{t('welcome.voicePrompt')}</span>
              <span className="setting-row__desc">
                {settings.voiceEnabled ? t('settings.on') : t('settings.off')}
              </span>
            </span>
            <Toggle
              checked={settings.voiceEnabled}
              onChange={setVoiceEnabled}
              label={t('welcome.voicePrompt')}
              onText={t('settings.on')}
              offText={t('settings.off')}
            />
          </div>

          <div className="setting-row">
            <span className="medallion medallion--soft" aria-hidden="true">
              <Icon name="text-size" size={26} />
            </span>
            <span className="setting-row__body">
              <span className="setting-row__title">{t('welcome.display')}</span>
              <span className="setting-row__desc">{t('welcome.easyView')}</span>
            </span>
            <Toggle
              checked={settings.accessibility.largeText}
              onChange={(v) => setAccessibility({ largeText: v })}
              label={t('settings.largeText')}
              onText={t('settings.on')}
              offText={t('settings.off')}
            />
          </div>
        </div>

        <VoiceButton text={readText} label={t('common.listen')} />

        <div className="banner banner--soft" style={{ fontSize: 'var(--fs-caption)' }}>
          <Icon name="shield" size={20} />
          <span>{t('common.disclaimer')}</span>
        </div>
      </main>
    </>
  );
}
