import { Link, Route, Routes } from 'react-router-dom';
import { Hello } from './components/Hello';
import { rootStore } from './models/rootStore';
import { AuftraggeberDetailPage } from './pages/AuftraggeberDetailPage';
import { AuftraggeberFormPage } from './pages/AuftraggeberFormPage';
import { AuftraggeberListPage } from './pages/AuftraggeberListPage';
import { KindDetailPage } from './pages/KindDetailPage';
import { KindFormPage } from './pages/KindFormPage';
import { KindListPage } from './pages/KindListPage';
import { RechnungCreatePage } from './pages/RechnungCreatePage';
import { SchnellerfassungPage } from './pages/SchnellerfassungPage';
import { TemplateUploadPage } from './pages/TemplateUploadPage';
import { TherapieFormPage } from './pages/TherapieFormPage';
import { TherapieListPage } from './pages/TherapieListPage';

export function App(): JSX.Element {
  return (
    <main>
      <nav>
        <Link to="/" data-testselector="nav-home">
          Start
        </Link>
        {' · '}
        <Link to="/kinder" data-testselector="nav-kinder">
          Kinder
        </Link>
        {' · '}
        <Link to="/auftraggeber" data-testselector="nav-auftraggeber">
          Auftraggeber
        </Link>
        {' · '}
        <Link to="/therapien" data-testselector="nav-therapien">
          Therapien
        </Link>
        {' · '}
        <Link to="/schnellerfassung" data-testselector="nav-schnellerfassung">
          Schnellerfassung
        </Link>
        {' · '}
        <Link to="/vorlagen" data-testselector="nav-vorlagen">
          Vorlagen
        </Link>
        {' · '}
        <Link to="/rechnungen/neu" data-testselector="nav-rechnung-neu">
          Rechnung erstellen
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<Hello model={rootStore.helloModel} />} />
        <Route path="/kinder" element={<KindListPage store={rootStore.kindStore} />} />
        <Route path="/kinder/new" element={<KindFormPage store={rootStore.kindStore} />} />
        <Route path="/kinder/:id" element={<KindFormPage store={rootStore.kindStore} />} />
        <Route
          path="/kinder/:id/detail"
          element={
            <KindDetailPage
              kindStore={rootStore.kindStore}
              therapieStore={rootStore.therapieStore}
            />
          }
        />
        <Route
          path="/auftraggeber"
          element={<AuftraggeberListPage store={rootStore.auftraggeberStore} />}
        />
        <Route
          path="/auftraggeber/new"
          element={<AuftraggeberFormPage store={rootStore.auftraggeberStore} />}
        />
        <Route
          path="/auftraggeber/:id"
          element={<AuftraggeberFormPage store={rootStore.auftraggeberStore} />}
        />
        <Route
          path="/auftraggeber/:id/detail"
          element={
            <AuftraggeberDetailPage
              auftraggeberStore={rootStore.auftraggeberStore}
              therapieStore={rootStore.therapieStore}
            />
          }
        />
        <Route path="/therapien" element={<TherapieListPage store={rootStore.therapieStore} />} />
        <Route
          path="/therapien/new"
          element={
            <TherapieFormPage
              therapieStore={rootStore.therapieStore}
              kindStore={rootStore.kindStore}
              auftraggeberStore={rootStore.auftraggeberStore}
            />
          }
        />
        <Route
          path="/therapien/:id"
          element={
            <TherapieFormPage
              therapieStore={rootStore.therapieStore}
              kindStore={rootStore.kindStore}
              auftraggeberStore={rootStore.auftraggeberStore}
            />
          }
        />
        <Route
          path="/schnellerfassung"
          element={
            <SchnellerfassungPage
              kindStore={rootStore.kindStore}
              auftraggeberStore={rootStore.auftraggeberStore}
              therapieStore={rootStore.therapieStore}
              behandlungStore={rootStore.behandlungStore}
            />
          }
        />
        <Route
          path="/vorlagen"
          element={
            <TemplateUploadPage
              templateStore={rootStore.templateStore}
              auftraggeberStore={rootStore.auftraggeberStore}
            />
          }
        />
        <Route
          path="/rechnungen/neu"
          element={
            <RechnungCreatePage
              kindStore={rootStore.kindStore}
              auftraggeberStore={rootStore.auftraggeberStore}
              rechnungStore={rootStore.rechnungStore}
            />
          }
        />
      </Routes>
    </main>
  );
}
