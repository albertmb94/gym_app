import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Sheet } from './Sheet';

function SheetHarness({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Mi sheet" dismissible>
        <button>First focusable</button>
        <button>Last focusable</button>
      </Sheet>
    </>
  );
}

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    render(<SheetHarness defaultOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog with title when open', () => {
    render(<SheetHarness defaultOpen={true} />);
    expect(screen.getByRole('dialog', { name: 'Mi sheet' })).toBeInTheDocument();
  });

  it('closes when clicking the backdrop', () => {
    render(<SheetHarness defaultOpen={true} />);
    const dialog = screen.getByRole('dialog');
    // Backdrop is the sibling div with bg-black/40
    const backdrop = dialog.previousElementSibling as HTMLElement;
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<SheetHarness defaultOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close on Escape when not dismissible', () => {
    function NonDismissible() {
      return (
        <Sheet open={true} onClose={() => {}} title="Forced" dismissible={false}>
          body
        </Sheet>
      );
    }
    render(<NonDismissible />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
