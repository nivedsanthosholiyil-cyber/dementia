import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { PasswordField } from '@/components/PasswordField';
import { useSettings } from '@/hooks/useSettings';
import {
  authErrorMessage,
  isStrongEnoughPassword,
  isValidUsername,
  PASSWORD_REQUIREMENTS,
  signInWithGoogle,
  signIn,
  signUp,
} from '@/services/authService';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, setVoiceEnabled, setAccessibility, enterGuest, refreshAuth } = useSettings();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [message, setMessage] = useState(() => (location.state as { resetComplete?: boolean } | null)?.resetComplete ? 'Your password was updated. You can sign in with it now.' : '');
  const [error, setError] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setMessage('');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setMessage('');
    setError('');
    const normalizedUsername = username.trim().toLowerCase();
    if (!isValidUsername(normalizedUsername)) {
      setError('Username must be 3–32 characters using only letters, numbers, or underscores.');
      return;
    }
    if (mode === 'sign-up') {
      if (!name.trim()) {
        setError('Enter your name.');
        return;
      }
      if (!isStrongEnoughPassword(password)) {
        setError(PASSWORD_REQUIREMENTS);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const result = await signUp(normalizedUsername, password, name || normalizedUsername);
        if (!result.session) throw new Error('Disable Supabase email confirmation for username-only hackathon mode.');
        if (!await refreshAuth()) throw new Error('Your account was created, but its profile could not be loaded. Please try again.');
      } else {
        await signIn(normalizedUsername, password);
        if (!await refreshAuth()) throw new Error('Your sign-in succeeded, but your account profile could not be loaded. Please try again.');
      }
      navigate('/', { replace: true });
    } catch (reason) {
      setError(authErrorMessage(reason, mode === 'sign-up' ? 'Unable to create your account.' : 'Unable to sign in.'));
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async () => {
    setGoogleLoading(true);
    setMessage('');
    setError('');
    try {
      await signInWithGoogle();
    } catch (reason) {
      setError(authErrorMessage(reason, 'Unable to start Google sign-in.'));
      setGoogleLoading(false);
    }
  };

  const guestLogin = async () => {
    setGuestLoading(true);
    setMessage('');
    setError('');
    try {
      await enterGuest();
      navigate('/home', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start Guest Mode.');
      setGuestLoading(false);
    }
  };

  const heading = mode === 'sign-up' ? 'Create your account' : 'Sign in on this device.';
  const submitLabel = mode === 'sign-up' ? 'Create account' : 'Continue';

  return (
    <>
      <AppHeader />
      <main className="page page--flow auth-page">
        <section className="auth-hero text-center" aria-labelledby="auth-title">
          <div className="auth-hero__icon" aria-hidden="true">🧠</div>
          <p className="eyebrow">MemoryCare</p>
          <h1 id="auth-title">{heading}</h1>
          <p className="page-sub">A calm, secure place for familiar faces and daily support.</p>
        </section>

        <section className="card auth-card stack-lg" aria-label="Authentication options">
          <>
            <div className="stack-sm">
              <h2 className="card-title">Use Google</h2>
              <p className="muted">Continue with your Google account.</p>
              <Button type="button" size="lg" block variant="secondary" onClick={() => void googleLogin()} disabled={busy || googleLoading}>
                {googleLoading ? 'Opening Google…' : 'Continue with Google'}
              </Button>
            </div>
            <div className="auth-divider" role="separator"><span>or use username</span></div>
          </>

          <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
            <div className="stack-sm">
              <h2 className="card-title">Username and password</h2>
              {mode === 'sign-up' && <div className="field"><label className="field__label" htmlFor="auth-name">Your name</label><input id="auth-name" className="input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></div>}
              <div className="field"><label className="field__label" htmlFor="auth-username">Username</label><input id="auth-username" className="input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" autoFocus /></div>
              {(mode === 'sign-up' || mode === 'sign-in') && <>
                <PasswordField id="auth-password" label="Password" value={password} onChange={setPassword} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} />
                {mode === 'sign-up' && <>
                  <PasswordField id="auth-confirm-password" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                  <p className="muted">{PASSWORD_REQUIREMENTS}</p>
                </>}
              </>}
            </div>
            <Button type="button" size="lg" block disabled={busy} onClick={() => void submit()}>{busy ? 'Please wait…' : submitLabel}</Button>
          </form>

          <><div className="auth-divider" role="separator"><span>or try MemoryCare</span></div>
            <div className="stack-sm">
              <Button type="button" size="lg" block variant="ghost" onClick={() => void guestLogin()} disabled={busy || googleLoading || guestLoading}>
                {guestLoading ? 'Opening Guest Mode…' : 'Continue as Guest'}
              </Button>
              <p className="muted text-center">Try MemoryCare without an account. Your demo data stays on this device.</p>
            </div></>

          {error && <p className="banner banner--red" role="alert">{error}</p>}
          {message && <p className="banner banner--green" role="status" aria-live="polite">{message}</p>}

          <div className="auth-links">
            {mode === 'sign-in' && <p className="muted">New to MemoryCare? <button type="button" className="auth-link" onClick={() => switchMode('sign-up')}>Create account</button></p>}
            {mode === 'sign-up' && <p className="muted">Already have an account? <button type="button" className="auth-link" onClick={() => switchMode('sign-in')}>Sign In</button></p>}
          </div>
        </section>

        <section className="auth-preferences card stack-sm" aria-label="Accessibility preferences">
          <p className="eyebrow">Make it easier to use</p>
          <div className="auth-preferences__row"><span>Voice guidance</span><button type="button" className="auth-preference" aria-pressed={settings.voiceEnabled} onClick={() => setVoiceEnabled(!settings.voiceEnabled)}>{settings.voiceEnabled ? 'On' : 'Off'}</button></div>
          <div className="auth-preferences__row"><span>Large text</span><button type="button" className="auth-preference" aria-pressed={settings.accessibility.largeText} onClick={() => setAccessibility({ largeText: !settings.accessibility.largeText })}>{settings.accessibility.largeText ? 'On' : 'Off'}</button></div>
        </section>
        <p className="disclaimer">Your password is handled by Supabase Auth. MemoryCare never stores it.</p>
      </main>
    </>
  );
}
