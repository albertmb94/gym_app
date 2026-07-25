import { useState, useRef } from 'react';
import { Eye, EyeOff, KeyRound, User, Loader2, Trash2, Dumbbell } from 'lucide-react';
import { Field, TextInput } from './ui/Field';
import { Button } from './ui/Button';
import { useLanguage } from '../contexts/LanguageContext';
import type { LoginResult } from '../hooks/useStorage';
import type { StoredUser } from '../hooks/useStorage';
import { cn } from '../utils/cn';

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
        <div className="w-full max-w-md surface p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-primary">{t.profile.recoveryCode}</h1>
          <p className="mt-2 text-sm text-secondary">{t.profile.recoveryCodeDesc}</p>
          <div
            role="status"
            aria-live="polite"
            className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-center font-mono text-2xl tracking-widest text-amber-200"
          >
            {recoveryCode}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                navigator.clipboard?.writeText(recoveryCode);
              }}
            >
              {t.profile.copy}
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,122,26,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(232,93,4,0.16),transparent_55%)]"
      />
      <div className="relative w-full max-w-md space-y-6">
        <header className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-xl"
          >
            <Dumbbell className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.app.name}</h1>
          <p className="mt-1 text-sm text-secondary">{t.auth.welcome}</p>
        </header>

        <section className="surface p-6 shadow-2xl">
          <div role="tablist" aria-label={t.nav.primary} className="mb-5 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
            <button
              role="tab"
              type="button"
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
              className={cn(
                'rounded-xl py-2 text-sm font-semibold transition-colors',
                mode === 'login' ? 'bg-orange-500 text-white' : 'text-secondary hover:text-primary',
              )}
            >
              {t.auth.signIn}
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={mode === 'register'}
              onClick={() => setMode('register')}
              className={cn(
                'rounded-xl py-2 text-sm font-semibold transition-colors',
                mode === 'register' ? 'bg-orange-500 text-white' : 'text-secondary hover:text-primary',
              )}
            >
              {t.auth.register}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label={t.auth.username} required>
              {(id) => (
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <TextInput
                    id={id}
                    ref={usernameRef}
                    type="text"
                    autoComplete="username"
                    spellCheck={false}
                    inputMode="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    invalid={Boolean(error) && !username.trim()}
                    autoFocus
                  />
                </div>
              )}
            </Field>

            <Field
              label={t.auth.password}
              required
              description={t.auth.passwordHelp}
            >
              {(id) => (
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <TextInput
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    invalid={Boolean(error) && password.length < 8}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              )}
            </Field>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              iconLeft={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            >
              {mode === 'login' ? t.auth.signIn : t.auth.register}
            </Button>

            <p className="text-center text-xs text-muted">
              {mode === 'login' ? t.auth.localOnly : t.auth.syncBenefit}
            </p>
          </form>
        </section>

        {knownUsers.length > 0 && (
          <section className="surface p-4 shadow-2xl">
            <h2 className="px-2 pb-2 text-sm font-semibold text-secondary">{t.auth.recentUsers}</h2>
            <ul className="space-y-1">
              {knownUsers.map((user) => (
                <li key={user.userId} className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 hover:bg-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(user.username);
                      usernameRef.current?.focus();
                    }}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-orange-500/20 text-orange-200">
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-primary">{user.username}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t.auth.removeUserConfirm)) onRemoveUser(user.userId);
                    }}
                    aria-label={`${t.auth.removeUser}: ${user.username}`}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-300"
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