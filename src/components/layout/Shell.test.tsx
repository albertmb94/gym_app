import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Shell from './Shell';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

const noopSync = { kind: 'idle' } as const;
const baseProps = {
  username: 'tester',
  syncStatus: noopSync,
  syncConflict: null,
  onResolveConflict: vi.fn(),
  onForceSync: vi.fn(),
  onLogout: vi.fn(),
};

function renderShell(initialPath: string = '/') {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Shell {...baseProps}>
            <div>content</div>
          </Shell>
        </MemoryRouter>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe('Shell', () => {
  it('renders the bottom nav with position fixed (so it stays at the bottom)', () => {
    renderShell('/');
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav.className).toMatch(/fixed/);
    expect(nav.className).toMatch(/bottom-0/);
  });

  it('renders the 5 primary nav items plus the More button', () => {
    renderShell('/');
    // 5 NavLinks (Inicio, Historial, Cardio, Progreso, Perfil) + Plus button
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(5);
    // The "Más" button — query by aria-label
    expect(screen.getByRole('button', { name: /Más/i })).toBeInTheDocument();
  });

  it('opens the More submenu above the nav when clicked', () => {
    renderShell('/');
    const moreBtn = screen.getByRole('button', { name: /Más/i });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(moreBtn);
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    // The submenu lives at bottom-full (above the nav)
    expect(menu.className).toMatch(/bottom-full/);
    // It contains the 2 extra entries
    expect(screen.getByRole('menuitem', { name: /Plan/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Ejercicios/i })).toBeInTheDocument();
  });

  it('closes the More submenu when navigating away', () => {
    renderShell('/');
    const moreBtn = screen.getByRole('button', { name: /Más/i });
    fireEvent.click(moreBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    // Navigate to a plan entry — the menu should close
    fireEvent.click(screen.getByRole('menuitem', { name: /Plan/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('marks the current route as aria-current=page', () => {
    renderShell('/history');
    const historyLink = screen.getByRole('link', { name: /Historial/i });
    expect(historyLink).toHaveAttribute('aria-current', 'page');
  });

  it('calls onLogout when the logout button is pressed', () => {
    renderShell('/');
    const onLogout = baseProps.onLogout;
    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders the main content area with id main-content for the skip link', () => {
    renderShell('/');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders the sync badge with a button that calls onForceSync when clicked', () => {
    renderShell('/');
    // The sync badge button is the only CloudOff-styled button in the header on idle.
    const badges = screen.getAllByRole('button', { name: /Local/i });
    expect(badges.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(badges[0]);
    expect(baseProps.onForceSync).toHaveBeenCalled();
  });
});
