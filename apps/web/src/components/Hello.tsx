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
    return (
      <p role="status" data-testselector="hello-loading">
        Lade…
      </p>
    );
  }
  if (model.error) {
    return (
      <p role="alert" data-testselector="hello-error">
        Fehler: {model.error}
      </p>
    );
  }
  return <h1 data-testselector="hello-greeting">{model.message}</h1>;
});
