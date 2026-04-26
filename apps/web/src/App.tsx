import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { rootStore } from './models/rootStore';
import { BehandlungEditPage } from './pages/BehandlungEditPage';
import { ErziehungsberechtigterFormPage } from './pages/ErziehungsberechtigterFormPage';
import { AuftraggeberDetailPage } from './pages/AuftraggeberDetailPage';
import { AuftraggeberFormPage } from './pages/AuftraggeberFormPage';
import { AuftraggeberListPage } from './pages/AuftraggeberListPage';
import { KindDetailPage } from './pages/KindDetailPage';
import { KindFormPage } from './pages/KindFormPage';
import { KindListPage } from './pages/KindListPage';
import { RechnungCreatePage } from './pages/RechnungCreatePage';
import { RechnungDownloadPage } from './pages/RechnungDownloadPage';
import { RechnungListPage } from './pages/RechnungListPage';
import { SchnellerfassungPage } from './pages/SchnellerfassungPage';
import { StundennachweisPage } from './pages/StundennachweisPage';
import { TemplateUploadPage } from './pages/TemplateUploadPage';
import { TherapieFormPage } from './pages/TherapieFormPage';
import { TherapieListPage } from './pages/TherapieListPage';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<AppShell uiStore={rootStore.uiStore} />}>
        <Route path="/" element={<Navigate to="/schnellerfassung" replace />} />
        <Route path="/kinder" element={<KindListPage store={rootStore.kindStore} />} />
        <Route
          path="/kinder/new"
          element={<KindFormPage store={rootStore.kindStore} ezbStore={rootStore.ezbStore} />}
        />
        <Route
          path="/kinder/:id"
          element={<KindFormPage store={rootStore.kindStore} ezbStore={rootStore.ezbStore} />}
        />
        <Route
          path="/kinder/:id/erziehungsberechtigte/:slot"
          element={<ErziehungsberechtigterFormPage ezbStore={rootStore.ezbStore} />}
        />
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
          path="/behandlungen/:id/bearbeiten"
          element={<BehandlungEditPage behandlungStore={rootStore.behandlungStore} />}
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
        <Route
          path="/rechnungen"
          element={
            <RechnungListPage
              rechnungStore={rootStore.rechnungStore}
              kindStore={rootStore.kindStore}
              auftraggeberStore={rootStore.auftraggeberStore}
            />
          }
        />
        <Route
          path="/rechnungen/download"
          element={
            <RechnungDownloadPage
              rechnungStore={rootStore.rechnungStore}
              auftraggeberStore={rootStore.auftraggeberStore}
            />
          }
        />
        <Route
          path="/stundennachweis"
          element={
            <StundennachweisPage
              kindStore={rootStore.kindStore}
              auftraggeberStore={rootStore.auftraggeberStore}
              stundennachweisStore={rootStore.stundennachweisStore}
            />
          }
        />
      </Route>
    </Routes>
  );
}
