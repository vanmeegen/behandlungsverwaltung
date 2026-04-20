import { Link, Route, Routes } from 'react-router-dom';
import { Hello } from './components/Hello';
import { rootStore } from './models/rootStore';
import { KindFormPage } from './pages/KindFormPage';
import { KindListPage } from './pages/KindListPage';

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
      </nav>
      <Routes>
        <Route path="/" element={<Hello model={rootStore.helloModel} />} />
        <Route path="/kinder" element={<KindListPage store={rootStore.kindStore} />} />
        <Route path="/kinder/new" element={<KindFormPage store={rootStore.kindStore} />} />
        <Route path="/kinder/:id" element={<KindFormPage store={rootStore.kindStore} />} />
      </Routes>
    </main>
  );
}
