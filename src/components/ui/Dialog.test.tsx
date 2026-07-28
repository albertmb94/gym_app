import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(<Dialog open={false} onClose={() => {}} title="X">body</Dialog>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a modal dialog with title and description when open', () => {
    render(
      <Dialog open={true} onClose={() => {}} title="Confirmar" description="¿Seguro?">
        body
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Confirmar' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument();
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<Dialog open={true} onClose={onClose} title="X">body</Dialog>);
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.previousElementSibling as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape when dismissible', () => {
    const onClose = vi.fn();
    render(<Dialog open={true} onClose={onClose} title="X">body</Dialog>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    render(
      <Dialog
        open={true}
        onClose={() => {}}
        title="X"
        footer={<button>Save</button>}
      >
        body
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
