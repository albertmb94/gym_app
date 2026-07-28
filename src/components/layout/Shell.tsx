import { useState, useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, History, BarChart2, User, Dumbbell, MoreHorizontal, LogOut, CloudOff, Cloud, AlertTriangle, Loader2, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
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
    idle: 'bg-surface-2 text-muted border-app',
    pending: 'bg-[color:var(--info)]/15 text-[color:var(--info)] border-[color:var(--info)]/30',
    error: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/30',
    success: 'bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium',
        'transition-colors duration-150 ease-apple',
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade" aria-hidden="true" />
      <div className="relative w-full max-w-md glass-2 rounded-[28px] p-6 shadow-[var(--shadow-dialog)] animate-spring">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-[color:var(--warning)]" aria-hidden="true" />
          <div className="flex-1">
            <h2 id="conflict-title" className="text-[17px] font-semibold text-primary tracking-tight">
              {t.sync.conflictTitle}
            </h2>
            <p id="conflict-desc" className="mt-1 text-[13px] text-secondary">
              {t.sync.conflictDesc}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => onResolve('merge')}
            className="w-full rounded-[14px] bg-accent px-4 py-3 text-[14px] font-semibold text-on-accent hover:bg-[color:var(--accent-hover)] active:scale-[0.98] transition-all"
          >
            {t.sync.mergeLocalAndRemote}
          </button>
          <button
            type="button"
            onClick={() => onResolve('local')}
            className="w-full rounded-[14px] bg-surface-2 border border-app px-4 py-3 text-[14px] font-semibold text-primary hover:bg-surface-3 transition-colors"
          >
            {t.sync.keepLocal}
          </button>
          <button
            type="button"
            onClick={() => onResolve('remote')}
            className="w-full rounded-[14px] bg-surface-2 border border-app px-4 py-3 text-[14px] font-semibold text-primary hover:bg-surface-3 transition-colors"
          >
            {t.sync.useRemote}
          </button>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-primary transition-colors"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
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
      {/* Ambient mesh — visionOS-style subtle gradient that shifts per route */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(50% 40% at 20% 0%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 70%),' +
            'radial-gradient(40% 30% at 100% 100%, color-mix(in srgb, var(--info) 4%, transparent), transparent 70%)',
        }}
      />

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[300] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        {t.general.skipToContent}
      </a>

      <header
        role="banner"
        className="sticky top-0 z-40 glass-2 border-b border-app"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 safe-top">
          <Link to="/" className="flex items-center gap-2 text-primary" aria-label={t.app.name}>
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-[10px] glass-tint"
              style={{ boxShadow: '0 4px 14px -4px color-mix(in srgb, var(--accent) 60%, transparent)' }}
            >
              <Dumbbell className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{t.app.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <SyncBadge status={syncStatus} onClick={onForceSync} />
            <span className="max-w-[8rem] truncate text-[13px] text-secondary">{username}</span>
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogout}
              aria-label={t.profile.logout}
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-primary transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main
        key={location.pathname}
        id="main-content"
        className="animate-fade relative mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:pb-8"
      >
        {children}
      </main>

      <nav
        aria-label={t.nav.primary}
        className="sticky bottom-0 z-40 glass-2 border-t border-app safe-bottom"
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
                  'group flex min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[12px] text-[11px] font-medium',
                  'transition-colors duration-150 ease-apple',
                  active ? 'text-accent' : 'text-muted hover:text-primary',
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ease-apple',
                    active && 'bg-accent-soft',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
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
              'flex min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[12px] text-[11px] font-medium',
              'transition-colors duration-150 ease-apple',
              moreOpen ? 'text-accent' : 'text-muted hover:text-primary',
            )}
          >
            <span
              className={cn(
                'grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ease-apple',
                moreOpen && 'bg-accent-soft',
              )}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span>{t.nav.more}</span>
          </button>
        </div>

        {moreOpen && (
          <div
            role="menu"
            className="mx-auto mb-2 max-w-5xl rounded-[20px] glass-2 p-2 shadow-[var(--shadow-dialog)]"
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
                      'flex items-center gap-3 rounded-[12px] px-3 py-3 text-[14px] font-medium',
                      'transition-colors duration-150 ease-apple',
                      active ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-surface-2 hover:text-primary',
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
