import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import type { Therapie, TherapieFormValue } from '../models/TherapieStore';

interface TherapieListProps {
  items: Therapie[];
  emptyText?: string;
}

const FORM_LABEL: Record<TherapieFormValue, string> = {
  dyskalkulie: 'Dyskalkulietherapie',
  lerntherapie: 'Lerntherapie',
  heilpaedagogik: 'Heilpädagogik',
  elternberatung: 'Elternberatung',
  sonstiges: 'Sonstiges',
};

export const TherapieList = observer(
  ({ items, emptyText = 'Noch keine Therapien erfasst.' }: TherapieListProps) => {
    if (items.length === 0) {
      return <p data-testselector="therapie-list-empty">{emptyText}</p>;
    }
    return (
      <ul data-testselector="therapie-list">
        {items.map((t) => (
          <li key={t.id} data-testselector="therapie-row">
            <span data-testselector={`therapie-row-form-${t.id}`}>{FORM_LABEL[t.form]}</span>
            {' · '}
            <span data-testselector={`therapie-row-be-${t.id}`}>{t.bewilligteBe} BE</span>
            {t.arbeitsthema && (
              <>
                {' · '}
                <span data-testselector={`therapie-row-arbeitsthema-${t.id}`}>
                  {t.arbeitsthema}
                </span>
              </>
            )}
            <Link to={`/therapien/${t.id}`} data-testselector={`therapie-row-edit-${t.id}`}>
              Bearbeiten
            </Link>
          </li>
        ))}
      </ul>
    );
  },
);
