import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../../components/AppShell';
import { UiStore } from '../../models/UiStore';
import { APP_VERSION, BUILD_DATE, GIT_SHA } from '../../version';

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

  it('zeigt Version, Commit-SHA und Build-Datum als Tooltip am Logo', async () => {
    renderShell();
    const logo = screen.getByAltText('bewegtes Lernen');
    fireEvent.mouseOver(logo);
    const tooltip = await waitFor(() => screen.getByTestId('app-version-tooltip'));
    expect(tooltip).toHaveTextContent(`Version v${APP_VERSION}`);
    expect(tooltip).toHaveTextContent(`Commit ${GIT_SHA}`);
    expect(tooltip).toHaveTextContent(`Build ${BUILD_DATE}`);
  });
});
