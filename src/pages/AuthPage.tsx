import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { useSettings } from '@/hooks/useSettings';
import {
  authErrorMessage,
  isStrongEnoughPassword,
  isValidEmail,
  PASSWORD_REQUIREMENTS,
  resetPasswordForEmail,
  signIn,
  signInWithGoogle,
  signUp,
} from '@/services/authService';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, setVoiceEnabled, setAccessibility, enterGuest } = useSettings();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address, such as you@example.com.');
      return;
    }
    if (mode === 'forgot-password') {
      setBusy(true);
      try {
        await resetPasswordForEmail(normalizedEmail);
        setMessage('If an account exists for this email, a password reset link is on its way. Check your inbox.');
      } catch (reason) {
        setError(authErrorMessage(reason, 'Unable to send the password reset email.'));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!password) {
      setError('Enter your password.');
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
    }
    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const result = await signUp(normalizedEmail, password, name);
        if (!result.session) {
          switchMode('sign-in');
          setEmail(normalizedEmail);
          setMessage('Account created. Check your email to confirm your address, then sign in here.');
          return;
        }
      } else {
        await signIn(normalizedEmail, password);
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

  const heading = mode === 'sign-up' ? 'Create your account' : mode === 'forgot-password' ? 'Reset your password' : 'Sign in on this device.';
  const submitLabel = mode === 'sign-up' ? 'Create account' : mode === 'forgot-password' ? 'Send reset link' : 'Sign In';

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
          {mode !== 'forgot-password' && <>
            <div className="stack-sm">
              <h2 className="card-title">Use Google</h2>
              <p className="muted">Continue with your Google account.</p>
              <Button type="button" size="lg" block variant="secondary" onClick={() => void googleLogin()} disabled={busy || googleLoading}>
                {googleLoading ? 'Opening Google…' : 'Continue with Google'}
              </Button>
            </div>
            <div className="auth-divider" role="separator"><span>or use email</span></div>
          </>}

          <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
            <div className="stack-sm">
              <h2 className="card-title">{mode === 'forgot-password' ? 'Email address' : 'Email and password'}</h2>
              {mode === 'sign-up' && <div className="field"><label className="field__label" htmlFor="auth-name">Your name</label><input id="auth-name" className="input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></div>}
              <div className="field"><label className="field__label" htmlFor="auth-email">Email address</label><input id="auth-email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" inputMode="email" autoComplete="email" autoFocus /></div>
              {mode !== 'forgot-password' && <>
                <div className="field"><label className="field__label" htmlFor="auth-password">Password</label><input id="auth-password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} /></div>
                {mode === 'sign-up' && <>
                  <div className="field"><label className="field__label" htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" className="input" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" /></div>
                  <p className="muted">{PASSWORD_REQUIREMENTS}</p>
                </>}
              </>}
            </div>
            <Button type="submit" size="lg" block disabled={busy}>{busy ? 'Please wait…' : submitLabel}</Button>
          </form>

          <div className="auth-divider" role="separator"><span>or try MemoryCare</span></div>
          <div className="stack-sm">
            <Button type="button" size="lg" block variant="ghost" onClick={() => void guestLogin()} disabled={busy || googleLoading || guestLoading}>
              {guestLoading ? 'Opening Guest Mode…' : 'Continue as Guest'}
            </Button>
            <p className="muted text-center">Try MemoryCare without an account. Your demo data stays on this device.</p>
          </div>

          {error && <p className="banner banner--red" role="alert">{error}</p>}
          {message && <p className="banner banner--green" role="status" aria-live="polite">{message}</p>}

          <div className="auth-links">
            {mode === 'sign-in' && <button type="button" className="auth-link" onClick={() => switchMode('forgot-password')}>Forgot password?</button>}
            {mode === 'forgot-password' && <button type="button" className="auth-link" onClick={() => switchMode('sign-in')}>Back to Sign In</button>}
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
