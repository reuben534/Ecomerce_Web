import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole, X } from 'lucide-react';

async function authRequest(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (response.status === 204) return {};
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error ?? 'Something went wrong. Please try again.');
    error.code = result.code;
    throw error;
  }
  return result;
}

function AuthField({ label, name, type = 'text', autoComplete, required = true, ...props }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input name={name} type={type} autoComplete={autoComplete} required={required} {...props} />
    </label>
  );
}

function AuthDialog({ user, onClose, onAuthenticated, onLoggedOut }) {
  const [mode, setMode] = useState(user ? 'account' : 'login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [devResetCode, setDevResetCode] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verify');
    if (!token) return;
    setBusy(true);
    authRequest('verify-email', { token })
      .then((result) => {
        setMode('login');
        setMessage(result.message);
      })
      .catch((requestError) => {
        setMode('verification');
        setError(requestError.message);
      })
      .finally(() => setBusy(false));
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setMessage('');
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const fields = new FormData(event.currentTarget);
    try {
      const result = await authRequest('login', {
        email: fields.get('email'),
        password: fields.get('password'),
      });
      onAuthenticated(result.user);
      onClose();
    } catch (requestError) {
      if (requestError.code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(fields.get('email'));
        setMode('verification-required');
      } else {
        setError(requestError.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const fields = new FormData(event.currentTarget);
    const password = fields.get('password');
    if (password !== fields.get('confirmPassword')) {
      setError('Passwords do not match.');
      setBusy(false);
      return;
    }
    try {
      const result = await authRequest('register', {
        firstName: fields.get('firstName'),
        lastName: fields.get('lastName'),
        email: fields.get('email'),
        phone: fields.get('phone'),
        password,
      });
      setPendingEmail(fields.get('email'));
      setVerificationToken(result.devVerificationToken ?? '');
      setMessage(result.message);
      setMode('verification');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail(token = verificationToken) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await authRequest('verify-email', { token });
      setMode('login');
      setMessage(result.message);
      setVerificationToken('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await authRequest('resend-verification', { email: pendingEmail });
      setVerificationToken(result.devVerificationToken ?? '');
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const fields = new FormData(event.currentTarget);
    const email = fields.get('email');
    try {
      const result = await authRequest('forgot-password', { email });
      setPendingEmail(email);
      setDevResetCode(result.devResetCode ?? '');
      setMessage(result.message);
      setMode('reset');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const fields = new FormData(event.currentTarget);
    const password = fields.get('password');
    if (password !== fields.get('confirmPassword')) {
      setError('Passwords do not match.');
      setBusy(false);
      return;
    }
    try {
      const result = await authRequest('reset-password', {
        email: pendingEmail,
        code: fields.get('code'),
        password,
      });
      setDevResetCode('');
      setMode('login');
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await authRequest('logout', {});
      onLoggedOut();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const heading = {
    login: 'Welcome back',
    register: 'Make yourself at home',
    verification: 'Check your email',
    'verification-required': 'Verify your email',
    forgot: 'Reset your password',
    reset: 'Choose a new password',
    account: 'Your account',
  }[mode];

  return (
    <div className="auth-backdrop" onMouseDown={onClose}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="auth-dialog-header">
          <div className="auth-brand">smart<span>shop</span><i>.</i></div>
          <button className="icon-button" type="button" aria-label="Close account window" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="auth-dialog-content">
          {mode !== 'login' && mode !== 'account' && (
            <button
              className="auth-back"
              type="button"
              onClick={() => changeMode(mode === 'reset' ? 'forgot' : 'login')}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <span className="eyebrow">SMARTSHOP ACCOUNT</span>
          <h2 id="auth-title">{heading}</h2>

          {message && <div className="auth-message" role="status">{message}</div>}
          {error && <div className="auth-error" role="alert">{error}</div>}

          {mode === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <AuthField label="Email address" name="email" type="email" autoComplete="email" />
              <AuthField label="Password" name="password" type="password" autoComplete="current-password" />
              <button className="auth-text-link forgot-link" type="button" onClick={() => changeMode('forgot')}>
                Forgot password?
              </button>
              <button className="button button-dark auth-submit" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>Sign in <ArrowRight size={16} /></>}
              </button>
              <p className="auth-switch">New to SmartShop? <button className="auth-text-link" type="button" onClick={() => changeMode('register')}>Create account</button></p>
            </form>
          )}

          {mode === 'register' && (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-field-row">
                <AuthField label="First name" name="firstName" autoComplete="given-name" />
                <AuthField label="Last name" name="lastName" autoComplete="family-name" />
              </div>
              <AuthField label="Email address" name="email" type="email" autoComplete="email" />
              <AuthField label="Mobile number" name="phone" type="tel" autoComplete="tel" />
              <AuthField label="Password" name="password" type="password" autoComplete="new-password" minLength={12} />
              <p className="auth-hint">12+ characters, including uppercase, lowercase, a number, and a symbol.</p>
              <AuthField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} />
              <button className="button button-dark auth-submit" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>Create account <ArrowRight size={16} /></>}
              </button>
              <p className="auth-switch">Already have an account? <button className="auth-text-link" type="button" onClick={() => changeMode('login')}>Sign in</button></p>
            </form>
          )}

          {mode === 'verification' && (
            <div className="auth-state-panel">
              <div className="auth-state-icon"><Check size={23} /></div>
              <p>We sent a verification link to <strong>{pendingEmail}</strong>. Verify your address before signing in.</p>
              {verificationToken && (
                <div className="dev-action">
                  <span>Local development only. No email was sent.</span>
                  <button className="button button-dark auth-submit" type="button" disabled={busy} onClick={() => verifyEmail()}>
                    {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>Verify email <ArrowRight size={16} /></>}
                  </button>
                </div>
              )}
              <button className="auth-text-link" type="button" onClick={() => changeMode('login')}>Back to sign in</button>
            </div>
          )}

          {mode === 'verification-required' && (
            <div className="auth-state-panel">
              <p>Your email address <strong>{pendingEmail}</strong> needs verification before you can sign in.</p>
              <button className="button button-dark auth-submit" type="button" disabled={busy} onClick={resendVerification}>
                {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>Resend verification link <ArrowRight size={16} /></>}
              </button>
              {verificationToken && (
                <button className="auth-text-link" type="button" disabled={busy} onClick={() => verifyEmail()}>
                  Verify this account in local preview
                </button>
              )}
            </div>
          )}

          {mode === 'forgot' && (
            <form className="auth-form" onSubmit={requestPasswordReset}>
              <p className="auth-intro">Enter the email address on your account and we’ll send a reset code.</p>
              <AuthField label="Email address" name="email" type="email" autoComplete="email" />
              <button className="button button-dark auth-submit" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>Send reset code <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form className="auth-form" onSubmit={resetPassword}>
              <p className="auth-intro">Reset code sent to <strong>{pendingEmail}</strong>.</p>
              {devResetCode && <div className="dev-code"><span>Local development reset code</span><strong>{devResetCode}</strong></div>}
              <AuthField label="Reset code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} />
              <AuthField label="New password" name="password" type="password" autoComplete="new-password" minLength={12} />
              <AuthField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} />
              <button className="button button-dark auth-submit" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>Set new password <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {mode === 'account' && user && (
            <div className="auth-state-panel">
              <div className="account-avatar">{user.firstName.slice(0, 1).toUpperCase()}</div>
              <p className="account-name">{user.firstName} {user.lastName}</p>
              <p className="account-email">{user.email}</p>
              <div className="account-verified"><Check size={14} /> Email verified</div>
              <button className="button button-dark auth-submit" type="button" disabled={busy} onClick={signOut}>
                {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>Sign out <ArrowRight size={16} /></>}
              </button>
            </div>
          )}

          <div className="auth-security-note"><LockKeyhole size={13} /> Passwords are hashed by the local auth server.</div>
        </div>
      </section>
    </div>
  );
}

export default AuthDialog;