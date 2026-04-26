import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../../components/AppShell';
import { UiStore } from '../../models/UiStore';

function renderShell(): void {
  render(
    <MemoryRouter>
      <AppShell uiStore={new UiStore()} />
    </MemoryRouter>,
  );
}

describe('<AppShell /> — Menü-Label-Umbenennung (PRD §3.1)', () => {
  it('has a nav entry "Behandlungen" pointing to /behandlungen', () => {
    renderShell();
    const link = screen.getByTestId('nav-behandlungen');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Behandlungen');
  });

  it('does not have a nav entry with text "Schnellerfassung"', () => {
    renderShell();
    expect(screen.queryByText('Schnellerfassung')).not.toBeInTheDocument();
  });
});
