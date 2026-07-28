import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders as a section', () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('renders title and description in the header', () => {
    render(<Card title="Mi tarjeta" description="Subtítulo" />);
    expect(screen.getByRole('heading', { name: 'Mi tarjeta' })).toBeInTheDocument();
    expect(screen.getByText('Subtítulo')).toBeInTheDocument();
  });

  it('renders actions in the header', () => {
    render(
      <Card title="X" actions={<button>CTA</button>}>
        body
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'CTA' })).toBeInTheDocument();
  });

  it('renders children body', () => {
    render(<Card>Contenido personalizado</Card>);
    expect(screen.getByText('Contenido personalizado')).toBeInTheDocument();
  });
});
