import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TherapieList } from '../../components/TherapieList';
import type { Therapie } from '../../models/TherapieStore';

const emptyTherapie: Therapie = {
  id: '1',
  kindId: '10',
  auftraggeberId: '20',
  form: 'lerntherapie',
  kommentar: null,
  startdatum: '2026-01-01',
  bewilligteBe: 60,
  taetigkeit: null,
  gruppentherapie: false,
  geleisteteBe: 0,
  kind: { vorname: 'Anna', nachname: 'Musterfrau' },
};

function renderList(items: Therapie[]): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <TherapieList items={items} />
    </MemoryRouter>,
  );
}

describe('<TherapieList /> — table structure (AC-TH-06)', () => {
  it('renders Nachname, Vorname, Geleistete BE, Therapieform columns', () => {
    renderList([emptyTherapie]);
    expect(screen.getByText('Nachname')).toBeInTheDocument();
    expect(screen.getByText('Vorname')).toBeInTheDocument();
    expect(screen.getByText('Geleistete BE')).toBeInTheDocument();
    expect(screen.getByText('Therapieform')).toBeInTheDocument();
  });

  it('shows Kind name and geleisteteBe=0 for empty Therapie', () => {
    renderList([emptyTherapie]);
    expect(screen.getByText('Musterfrau')).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Lern-Therapie')).toBeInTheDocument();
  });

  it('shows correct geleisteteBe from the Therapie data', () => {
    const t = { ...emptyTherapie, geleisteteBe: 42 };
    renderList([t]);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
