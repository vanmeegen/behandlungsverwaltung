import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { BehandlungsListeInline } from '../../components/BehandlungsListeInline';
import type { Behandlung } from '../../models/BehandlungStore';

const b1: Behandlung = {
  id: '1',
  therapieId: '7',
  datum: '2026-04-01T00:00:00.000Z',
  be: 2,
  taetigkeit: 'lerntherapie',
  gruppentherapie: false,
};

const b2: Behandlung = {
  id: '2',
  therapieId: '7',
  datum: '2026-04-15T00:00:00.000Z',
  be: 3,
  taetigkeit: 'lerntherapie',
  gruppentherapie: false,
};

function renderListe(
  behandlungen: Behandlung[],
  verfuegbareBe?: number | null,
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <BehandlungsListeInline behandlungen={behandlungen} verfuegbareBe={verfuegbareBe} />
    </MemoryRouter>,
  );
}

describe('<BehandlungsListeInline /> (AC-BEH-10, AC-BEH-11)', () => {
  it('shows Datum, Tätigkeit, BE columns', () => {
    renderListe([b1], 58);
    expect(screen.getByText('Datum')).toBeInTheDocument();
    expect(screen.getByText('Tätigkeit')).toBeInTheDocument();
    expect(screen.getByText('BE')).toBeInTheDocument();
  });

  it('shows noch verfügbar hint', () => {
    renderListe([b1], 58);
    expect(
      screen.getByTestId('schnellerfassung-behandlungsliste-noch-verfuegbar'),
    ).toHaveTextContent('noch verfügbar: 58 BE');
  });

  it('renders one row per Behandlung', () => {
    renderListe([b1, b2], 55);
    expect(screen.getAllByTestId(/schnellerfassung-behandlungsliste-zeile-/)).toHaveLength(2);
  });

  it('shows Bearbeiten button', () => {
    renderListe([b1], 58);
    expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
  });

  it('shows Löschen button when onDelete is provided', () => {
    render(
      <MemoryRouter>
        <BehandlungsListeInline
          behandlungen={[b1]}
          verfuegbareBe={58}
          onDelete={(): void => undefined}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Löschen')).toBeInTheDocument();
  });

  it('hides the noch-verfügbar indicator when verfuegbareBe is null', () => {
    renderListe([b1], null);
    expect(
      screen.queryByTestId('schnellerfassung-behandlungsliste-noch-verfuegbar'),
    ).not.toBeInTheDocument();
  });

  it('passes therapieId to onDelete callback (for cross-therapy delete)', () => {
    const spy = vi.fn();
    render(
      <MemoryRouter>
        <BehandlungsListeInline behandlungen={[b1]} verfuegbareBe={58} onDelete={spy} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Löschen'));
    expect(spy).toHaveBeenCalledWith('1', '7');
  });
});
