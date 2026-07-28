import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { Dumbbell } from 'lucide-react';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Sin datos" description="Empieza a registrar" />);
    expect(screen.getByRole('heading', { name: 'Sin datos' })).toBeInTheDocument();
    expect(screen.getByText('Empieza a registrar')).toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    const { container } = render(<EmptyState title="X" icon={<Dumbbell data-testid="dumbbell" />} />);
    expect(screen.getByTestId('dumbbell')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders an action when provided', () => {
    render(
      <EmptyState
        title="Sin workouts"
        action={<button>Crear</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
  });
});
