import { useState, useRef } from 'react';
import { Eye, EyeOff, KeyRound, User, Trash2, Activity } from 'lucide-react';
import { Field, TextInput } from './ui/Field';
import { Button } from './ui/Button';
import { SegmentedControl } from './ui/SegmentedControl';
import { useLanguage } from '../contexts/LanguageContext';
import type { LoginResult } from '../hooks/useStorage';
import type { StoredUser } from '../hooks/useStorage';

interface Props {
  onLogin: (username: string, token: string) => Promise<LoginResult>;
  onRegister: (username: string, token: string) => Promise<LoginResult>;
  knownUsers: StoredUser[];
  onRemoveUser: (userId: string) => void;
}

type Mode = 'login' | 'register';

export default function LoginScreen({ onLogin, onRegister, knownUsers, onRemoveUser }: Props) {
  const { t } = useLanguage();
  const usernameRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(t.auth.usernameRequired);
      usernameRef.current?.focus();
      return;
    }
    if (!/^[a-z0-9._-]{2,32}$/i.test(cleanUsername)) {
      setError(t.auth.usernameHelp);
      return;
    }
    if (password.length < 8) {
      setError(t.auth.passwordHelp);
      return;
    }
    setSubmitting(true);
    try {
      const result = mode === 'login'
        ? await onLogin(cleanUsername, password)
        : await onRegister(cleanUsername, password);
      if (!result.ok) {
        const key = result.error === 'taken'
          ? 'usernameTaken'
          : result.error === 'invalid' || result.error === 'credentials'
            ? 'invalidCredentials'
            : 'network';
        setError(t.errors[key] || result.message);
        return;
      }
      if (mode === 'register' && result.recoveryCode) {
        setRecoveryCode(result.recoveryCode);
      }
    } catch (err) {
      setError(t.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  if (recoveryCode) {
    return (
      <main
        role="main"
        className="grid min-h-dvh place-items-center bg-canvas px-4 py-8"
      >
        <div className="w-full max-w-md glass-1 p-6">
          <h1 className="text-[20px] font-semibold text-primary tracking-tight">{t.profile.recoveryCode}</h1>
          <p className="mt-2 text-[14px] text-secondary">{t.profile.recoveryCodeDesc}</p>
          <div
            role="status"
            aria-live="polite"
            className="mt-5 rounded-2xl border border-[color:var(--accent-soft-strong)] bg-accent-soft p-5 text-center font-mono text-[26px] tracking-[0.18em] text-accent"
          >
            {recoveryCode}
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={async () => {
                try {
                  await navigator.clipboard?.writeText(recoveryCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* clipboard no disponible */
                }
              }}
            >
              {copied ? t.profile.copied : t.profile.copy}
            </Button>
            <Button variant="primary" fullWidth onClick={() => setRecoveryCode(null)}>
              {t.general.continue}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      role="main"
      className="relative grid min-h-dvh place-items-center bg-canvas overflow-hidden px-4 py-8"
    >
      {/* Capa decorativa: mesh gradient muy sutil inspirado en visionOS */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 20% 20%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%),' +
            'radial-gradient(50% 40% at 80% 70%, color-mix(in srgb, var(--info) 8%, transparent), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md space-y-5">
        <header className="flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="mb-4 grid h-16 w-16 place-items-center rounded-[20px] glass-tint"
            style={{ boxShadow: '0 12px 40px -10px color-mix(in srgb, var(--accent) 60%, transparent)' }}
          >
            <Activity className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-[28px] font-semibold text-primary tracking-tight">{t.app.name}</h1>
          <p className="mt-1 text-[14px] text-secondary">{t.auth.welcome}</p>
        </header>

        <section className="glass-1 p-6">
          <div className="mb-5">
            <SegmentedControl
              ariaLabel={t.nav.primary}
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: 'login' as Mode, label: t.auth.signIn },
                { value: 'register' as Mode, label: t.auth.register },
              ]}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label={t.auth.username} required>
              {(id) => (
                <TextInput
                  id={id}
                  ref={usernameRef}
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  inputMode="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  invalid={Boolean(error) && !username.trim()}
                  leadingIcon={<User className="h-4 w-4" aria-hidden="true" />}
                  autoFocus
                />
              )}
            </Field>

            <Field
              label={t.auth.password}
              required
              description={t.auth.passwordHelp}
            >
              {(id) => (
                <TextInput
                  id={id}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={Boolean(error) && password.length < 8}
                  minLength={8}
                  leadingIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                      className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  }
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="text-[13px] text-[color:var(--danger)]">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
            >
              {mode === 'login' ? t.auth.signIn : t.auth.register}
            </Button>

            <p className="text-center text-[12px] text-muted">
              {mode === 'login' ? t.auth.localOnly : t.auth.syncBenefit}
            </p>
          </form>
        </section>

        {knownUsers.length > 0 && (
          <section className="glass-1 p-4">
            <h2 className="px-2 pb-2 text-[13px] font-semibold text-secondary">{t.auth.recentUsers}</h2>
            <ul className="space-y-1">
              {knownUsers.map((user) => (
                <li
                  key={user.userId}
                  className="flex items-center justify-between gap-2 rounded-[12px] px-2 py-2 hover:bg-surface-2 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(user.username);
                      usernameRef.current?.focus();
                    }}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent text-[14px] font-semibold"
                    >
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-[14px] font-medium text-primary">{user.username}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t.auth.removeUserConfirm)) onRemoveUser(user.userId);
                    }}
                    aria-label={`${t.auth.removeUser}: ${user.username}`}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-[color:var(--danger)]/15 hover:text-[color:var(--danger)] transition-colors"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
