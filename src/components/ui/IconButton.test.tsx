import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('renders with required aria-label and title', () => {
    render(<IconButton label="Borrar" icon={<Trash2 />} />);
    const btn = screen.getByRole('button', { name: 'Borrar' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('title', 'Borrar');
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<IconButton label="X" icon={<Trash2 />} disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
