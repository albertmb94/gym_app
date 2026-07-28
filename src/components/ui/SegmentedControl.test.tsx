import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';

type Mode = 'all' | 'muscle';
const options = [
  { value: 'all' as Mode, label: 'Todos' },
  { value: 'muscle' as Mode, label: 'Músculo' },
];

describe('SegmentedControl', () => {
  it('renders all options as a tablist', () => {
    render(<SegmentedControl<Mode> options={options} value="all" onChange={() => {}} ariaLabel="Filtros" />);
    expect(screen.getByRole('tablist', { name: 'Filtros' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('marks the selected tab with aria-selected', () => {
    render(<SegmentedControl<Mode> options={options} value="muscle" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Músculo' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the new value when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<SegmentedControl<Mode> options={options} value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Músculo' }));
    expect(onChange).toHaveBeenCalledWith('muscle');
  });

  it('does not call onChange when the disabled tab is clicked', () => {
    const onChange = vi.fn();
    const optsWithDisabled = [
      { value: 'all' as Mode, label: 'Todos' },
      { value: 'muscle' as Mode, label: 'Músculo', disabled: true },
    ];
    render(<SegmentedControl<Mode> options={optsWithDisabled} value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Músculo' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
