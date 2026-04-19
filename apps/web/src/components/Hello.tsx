import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import type { HelloModel } from '../models/HelloModel';

interface HelloProps {
  model: HelloModel;
}

export const Hello = observer(({ model }: HelloProps) => {
  useEffect(() => {
    void model.load();
  }, [model]);

  if (model.loading) {
    return <p role="status">Lade…</p>;
  }
  if (model.error) {
    return <p role="alert">Fehler: {model.error}</p>;
  }
  return <h1>{model.message}</h1>;
});
