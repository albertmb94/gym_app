import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field, TextInput } from './Field';

describe('Field', () => {
  it('renders label and associates it to the input', () => {
    render(
      <Field label="Email">
        <TextInput type="email" />
      </Field>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('marks the label as required when required prop is set', () => {
    render(
      <Field label="Password" required>
        <TextInput type="password" />
      </Field>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    render(
      <Field label="Username" description="2-32 chars">
        <TextInput />
      </Field>,
    );
    expect(screen.getByText('2-32 chars')).toBeInTheDocument();
  });

  it('shows error in red when provided', () => {
    render(
      <Field label="X" error="Required">
        <TextInput invalid />
      </Field>,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Required');
  });

  it('passes id + describedBy to render prop children', () => {
    render(
      <Field label="Test" description="hint">
        {(id, describedBy) => (
          <input id={id} aria-describedby={describedBy} />
        )}
      </Field>,
    );
    const input = screen.getByLabelText('Test');
    expect(input).toHaveAttribute('aria-describedby');
  });
});
