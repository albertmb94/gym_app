import { useState, useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, History, BarChart2, User, Dumbbell, MoreHorizontal, LogOut, CloudOff, Cloud, AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/cn';
import type { SyncState } from '../../lib/sync';

interface ShellProps {
  username: string;
  syncStatus: SyncState;
  syncConflict: { serverRevision: number; serverData: import('../../types').AppData | null } | null;
  onResolveConflict: (strategy: 'local' | 'remote' | 'merge') => Promise<void>;
  onForceSync: () => Promise<void>;
  onLogout: () => void;
  children: ReactNode;
}

interface NavItem {
  to: string;
  labelKey: 'home' | 'history' | 'cardio' | 'stats' | 'profile';
  icon: typeof Home;
  matchPaths?: string[];
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', labelKey: 'home', icon: Home, matchPaths: ['/'] },
  { to: '/history', labelKey: 'history', icon: History, matchPaths: ['/history'] },
  { to: '/cardio', labelKey: 'cardio', icon: Dumbbell, matchPaths: ['/cardio'] },
  { to: '/stats', labelKey: 'stats', icon: BarChart2, matchPaths: ['/stats'] },
  { to: '/profile', labelKey: 'profile', icon: User, matchPaths: ['/profile', '/plan', '/exercises'] },
];

function SyncBadge({ status, onClick }: { status: SyncState; onClick: () => void }) {
  const { t } = useLanguage();
  let label: string = t.sync.local;
  let Icon = CloudOff;
  let variant: 'idle' | 'pending' | 'error' | 'success' = 'idle';
  if (status.kind === 'pulling' || status.kind === 'pushing') {
    label = t.sync.syncing;
    Icon = Loader2;
    variant = 'pending';
  } else if (status.kind === 'synced') {
    label = t.sync.synced;
    Icon = Cloud;
    variant = 'success';
  } else if (status.kind === 'error') {
    label = t.sync.error;
    Icon = AlertTriangle;
    variant = 'error';
  } else if (status.kind === 'conflict') {
    label = t.sync.conflict;
    Icon = AlertTriangle;
    variant = 'error';
  } else if (status.kind === 'offline') {
    label = t.sync.offline;
    Icon = CloudOff;
    variant = 'idle';
  }

  const variantClass = {
    idle: 'bg-white/5 text-[color:var(--text-muted)] border-white/10',
    pending: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
    error: 'bg-red-500/15 text-red-200 border-red-400/30',
    success: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        variantClass,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', variant === 'pending' && 'animate-spin')} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function ConflictDialog({
  onResolve,
}: {
  onResolve: (strategy: 'local' | 'remote' | 'merge') => Promise<void>;
}) {
  const { t } = useLanguage();
  return (
    <div
      role="alertdialog"
      aria-labelledby="conflict-title"
      aria-describedby="conflict-desc"
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" aria-hidden="true" />
      <div className="relative w-full max-w-md glass-strong rounded-3xl p-6 shadow-2xl animate-slide-up">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-400" aria-hidden="true" />
          <div className="flex-1">
            <h2 id="conflict-title" className="text-lg font-semibold text-primary">
              {t.sync.conflictTitle}
            </h2>
            <p id="conflict-desc" className="mt-1 text-sm text-secondary">
              {t.sync.conflictDesc}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => onResolve('merge')}
            className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.99]"
          >
            {t.sync.mergeLocalAndRemote}
          </button>
          <button
            type="button"
            onClick={() => onResolve('local')}
            className="w-full rounded-2xl border border-app px-4 py-3 text-sm font-semibold text-primary hover:bg-white/5"
          >
            {t.sync.keepLocal}
          </button>
          <button
            type="button"
            onClick={() => onResolve('remote')}
            className="w-full rounded-2xl border border-app px-4 py-3 text-sm font-semibold text-primary hover:bg-white/5"
          >
            {t.sync.useRemote}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Shell({
  username,
  syncStatus,
  syncConflict,
  onResolveConflict,
  onForceSync,
  onLogout,
  children,
}: ShellProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-canvas text-primary relative">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[300] focus:rounded-lg focus:bg-orange-500 focus:px-3 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>

      <header
        role="banner"
        className="sticky top-0 z-40 glass border-b border-app"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 safe-top">
          <Link to="/" className="flex items-center gap-2 text-primary" aria-label={t.app.name}>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg"
            >
              <Dumbbell className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight">{t.app.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <SyncBadge status={syncStatus} onClick={onForceSync} />
            <span className="hidden text-sm text-secondary sm:inline">{username}</span>
            <button
              type="button"
              onClick={onLogout}
              aria-label={t.profile.logout}
              className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-primary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 sm:pb-8">
        {children}
      </main>

      <nav
        aria-label={t.nav.primary}
        className="sticky bottom-0 z-40 glass border-t border-app safe-bottom"
      >
        <div className="mx-auto flex h-16 max-w-5xl items-stretch justify-around px-2">
          {PRIMARY_NAV.map((item) => {
            const active = location.pathname === item.to ||
              (item.matchPaths?.some((p) => location.pathname === p) ?? false);
            const Icon = item.icon;
            const label = (t.nav as Record<string, string>)[item.labelKey] || item.labelKey;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium',
                  active ? 'text-brand' : 'text-muted hover:text-secondary',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className={cn(
              'flex min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium',
              moreOpen ? 'text-brand' : 'text-muted hover:text-secondary',
            )}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            <span>{t.nav.more}</span>
          </button>
        </div>

        {moreOpen && (
          <div
            role="menu"
            className="mx-auto mb-2 max-w-5xl rounded-2xl glass-strong p-2 shadow-2xl"
          >
            <div className="grid gap-1 sm:grid-cols-2">
              {[
                { to: '/plan', label: t.nav.plan, icon: Home },
                { to: '/exercises', label: t.nav.exercises, icon: Dumbbell },
              ].map((entry) => {
                const Icon = entry.icon;
                const active = location.pathname === entry.to;
                return (
                  <NavLink
                    key={entry.to}
                    to={entry.to}
                    role="menuitem"
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                      active ? 'bg-orange-500/20 text-brand' : 'text-secondary hover:bg-white/5 hover:text-primary',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{entry.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {syncConflict && <ConflictDialog onResolve={onResolveConflict} />}
    </div>
  );
}