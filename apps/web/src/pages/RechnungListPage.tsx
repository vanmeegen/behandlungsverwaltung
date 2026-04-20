import { formatEuro } from '@behandlungsverwaltung/shared';
import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import type { Rechnung, RechnungStore } from '../models/RechnungStore';

interface RechnungListPageProps {
  rechnungStore: RechnungStore;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
}

export const RechnungListPage = observer(
  ({ rechnungStore, kindStore, auftraggeberStore }: RechnungListPageProps) => {
    const { filter } = rechnungStore;

    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
      void rechnungStore.load(filter.toInput());
    }, [rechnungStore, kindStore, auftraggeberStore, filter]);

    function onKindChange(e: ChangeEvent<HTMLSelectElement>): void {
      filter.setKindId(e.target.value);
      void rechnungStore.load(filter.toInput());
    }
    function onAgChange(e: ChangeEvent<HTMLSelectElement>): void {
      filter.setAuftraggeberId(e.target.value);
      void rechnungStore.load(filter.toInput());
    }
    function onMonthChange(e: ChangeEvent<HTMLInputElement>): void {
      const raw = e.target.value;
      if (raw === '') {
        filter.clearMonat();
      } else if (/^\d{4}-\d{2}$/.test(raw)) {
        const [y, m] = raw.split('-') as [string, string];
        filter.setMonat(Number.parseInt(y, 10), Number.parseInt(m, 10));
      }
      void rechnungStore.load(filter.toInput());
    }

    const monthValue =
      filter.year !== null && filter.month !== null
        ? `${filter.year}-${String(filter.month).padStart(2, '0')}`
        : '';

    function kindLabel(r: Rechnung): string {
      const k = kindStore.items.find((x) => x.id === r.kindId);
      return k ? `${k.nachname}, ${k.vorname}` : r.kindId;
    }
    function agLabel(r: Rechnung): string {
      const a = auftraggeberStore.items.find((x) => x.id === r.auftraggeberId);
      if (!a) return r.auftraggeberId;
      if (a.typ === 'firma') return a.firmenname ?? '';
      return `${a.nachname ?? ''}, ${a.vorname ?? ''}`;
    }

    return (
      <section data-testselector="rechnung-list-page">
        <h1>Rechnungsübersicht</h1>
        <div data-testselector="rechnung-list-filter">
          <label>
            Kind
            <select
              data-testselector="rechnung-list-filter-kindId"
              value={filter.kindId}
              onChange={onKindChange}
            >
              <option value="">– alle –</option>
              {kindStore.items.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nachname}, {k.vorname}
                </option>
              ))}
            </select>
          </label>
          <label>
            Auftraggeber
            <select
              data-testselector="rechnung-list-filter-auftraggeberId"
              value={filter.auftraggeberId}
              onChange={onAgChange}
            >
              <option value="">– alle –</option>
              {auftraggeberStore.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.typ === 'firma' ? a.firmenname : `${a.nachname ?? ''}, ${a.vorname ?? ''}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Monat
            <input
              type="month"
              data-testselector="rechnung-list-filter-monat"
              value={monthValue}
              onChange={onMonthChange}
            />
          </label>
        </div>

        {rechnungStore.items.length === 0 ? (
          <p data-testselector="rechnung-list-empty">Keine Rechnungen vorhanden.</p>
        ) : (
          <table data-testselector="rechnung-list-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Monat</th>
                <th>Kind</th>
                <th>Auftraggeber</th>
                <th>Gesamtsumme</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {rechnungStore.items.map((r) => (
                <tr key={r.id} data-testselector={`rechnung-row-${r.nummer}`}>
                  <td>{r.nummer}</td>
                  <td>{`${String(r.monat).padStart(2, '0')}/${r.jahr}`}</td>
                  <td>{kindLabel(r)}</td>
                  <td>{agLabel(r)}</td>
                  <td data-testselector={`rechnung-row-${r.nummer}-gesamtsumme`}>
                    {formatEuro(r.gesamtCents)}
                  </td>
                  <td>
                    <a
                      href={`/bills/${r.dateiname}`}
                      download={r.dateiname}
                      data-testselector={`rechnung-row-${r.nummer}-download`}
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    );
  },
);
