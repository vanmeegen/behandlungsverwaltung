import { Hello } from './components/Hello';
import { HelloModel } from './models/HelloModel';
import { createGraphQLClient } from './api/graphqlClient';

const helloModel = new HelloModel(createGraphQLClient());

export function App() {
  return (
    <main>
      <Hello model={helloModel} />
    </main>
  );
}
