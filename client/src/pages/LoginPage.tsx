import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';

const TOKEN_KEY = 'diabetes_app_token';
const USER_KEY = 'diabetes_app_user';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const C = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  accent: '#10B981',
  accentLight: '#ECFDF5',
  danger: '#EF4444',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
};

const inputStyle: CSSProperties = {
  padding: '11px 14px',
  borderRadius: 10,
  border: `1.5px solid ${C.border}`,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  color: C.text,
  background: '#fff',
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'viewer';
  diabetesType: string;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
};

type Props = {
  onLogin: (token: string, user: AuthUser) => void;
};

type MainMode = 'login' | 'register';
type ForgotStep = 'email' | 'reset';

export function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<MainMode>('login');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'owner' | 'viewer'>('owner');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function switchMode(m: MainMode) {
    setMode(m);
    setError('');
    setSuccessMsg('');
    setShowForgot(false);
    setForgotStep('email');
    setGeneratedCode('');
    setResetSuccess(false);
  }

  function openForgot() {
    setShowForgot(true);
    setForgotStep('email');
    setError('');
    setSuccessMsg('');
    setGeneratedCode('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetSuccess(false);
  }

  function closeForgot() {
    setShowForgot(false);
    setError('');
    setSuccessMsg('');
    setGeneratedCode('');
    setResetSuccess(false);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message || 'Login failed');
        return;
      }
      const { token, user } = data as { token: string; user: AuthUser };
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      onLogin(token, user);
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, role: regRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message || 'Registration failed');
        return;
      }
      const { token, user } = data as { token: string; user: AuthUser };
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      onLogin(token, user);
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotEmail(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message || 'Request failed');
        return;
      }
      const { resetToken } = data as { resetToken?: string };
      if (resetToken) setGeneratedCode(resetToken);
      setForgotStep('reset');
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, resetToken: resetCode, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { message?: string }).message || 'Reset failed');
        return;
      }
      setResetSuccess(true);
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  const btnStyle = (disabled: boolean): CSSProperties => ({
    background: disabled ? C.muted : C.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 0',
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 4,
    transition: 'background 0.15s',
    width: '100%',
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, padding: 'clamp(20px, 5vw, 36px) clamp(16px, 6vw, 40px)', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💊</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text, fontFamily: 'Georgia, serif' }}>GlucoFamily</div>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Diabetes Management</div>
          </div>
        </div>

        {/* ── FORGOT PASSWORD FLOW ── */}
        {showForgot ? (
          <>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <button onClick={closeForgot} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                ← Back to sign in
              </button>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>
                {forgotStep === 'email' ? '🔑 Forgot Password' : '🔒 Reset Password'}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                {forgotStep === 'email'
                  ? 'Enter your email to receive a reset code'
                  : `Enter the 6-digit code for ${forgotEmail}`}
              </div>
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {(['email', 'reset'] as ForgotStep[]).map((s, i) => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: forgotStep === 'email' ? (i === 0 ? C.primary : C.border) : C.primary, transition: 'background 0.3s' }} />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#FEF2F2', border: `1px solid ${C.danger}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.danger, marginBottom: 18, fontWeight: 500 }}>
                {error}
              </div>
            )}

            {/* Success state */}
            {resetSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, color: C.accent, fontSize: 15 }}>Password reset successfully!</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>You can now sign in with your new password.</div>
                </div>
                <button onClick={closeForgot} style={btnStyle(false)}>Back to Sign In</button>
              </div>
            ) : forgotStep === 'email' ? (
              /* Step 1 — enter email */
              <form onSubmit={handleForgotEmail} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email address</label>
                  <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                </div>
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? 'Sending...' : 'Get Reset Code'}
                </button>
              </form>
            ) : (
              /* Step 2 — enter code + new password */
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Show the code since no email service */}
                {generatedCode && (
                  <div style={{ background: C.warningLight, border: `1px solid ${C.warning}`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: C.warning, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      📧 No email service — your code is:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: 6 }}>
                        {generatedCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => { void navigator.clipboard.writeText(generatedCode); }}
                        style={{ background: C.warning, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Copy
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Valid for 15 minutes. Connect a mail service to send this by email instead.</div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>6-digit reset code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 20, letterSpacing: 6, textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>New password <span style={{ fontWeight: 400 }}>(min 8 chars)</span></label>
                  <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm new password</label>
                  <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, borderColor: confirmPassword && confirmPassword !== newPassword ? C.danger : C.border }} />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>Passwords don't match</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => { setForgotStep('email'); setError(''); }} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: `1.5px solid ${C.border}`, background: '#fff', color: C.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="submit" disabled={loading} style={{ ...btnStyle(loading), flex: 2, marginTop: 0 }}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* ── NORMAL LOGIN / REGISTER FLOW ── */
          <>
            {/* Tab switcher */}
            <div style={{ display: 'flex', background: C.bg, borderRadius: 12, padding: 4, marginBottom: 28 }}>
              {(['login', 'register'] as const).map((m) => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: mode === m ? C.card : 'transparent', color: mode === m ? C.primary : C.muted, fontWeight: mode === m ? 700 : 500, fontSize: 14, boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#FEF2F2', border: `1px solid ${C.danger}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.danger, marginBottom: 18, fontWeight: 500 }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.accent, marginBottom: 18, fontWeight: 500 }}>
                {successMsg}
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
                  <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Password</label>
                    <button
                      type="button"
                      onClick={openForgot}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: C.primary, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label>
                  <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Saloni" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
                  <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Password <span style={{ fontWeight: 400 }}>(min 8 characters)</span>
                  </label>
                  <input type="password" required minLength={8} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Role</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['owner', 'viewer'] as const).map((r) => (
                      <button key={r} type="button" onClick={() => setRegRole(r)}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${regRole === r ? C.primary : C.border}`, background: regRole === r ? C.primaryLight : '#fff', color: regRole === r ? C.primary : C.muted, fontWeight: regRole === r ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {r === 'owner' ? '👤 Owner' : '👁 Viewer'}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                    {regRole === 'owner' ? 'Owner: logs their own data, manages family access' : 'Viewer: monitors a family member (read-only access)'}
                  </div>
                </div>
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}
          </>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: C.muted }}>
          Your health data is stored securely and never shared.
        </div>
      </div>
    </div>
  );
}
