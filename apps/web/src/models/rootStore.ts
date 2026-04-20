import { createGraphQLClient } from '../api/graphqlClient';
import { HelloModel } from './HelloModel';
import { KindStore } from './KindStore';

const fetcher = createGraphQLClient();

export interface RootStore {
  helloModel: HelloModel;
  kindStore: KindStore;
}

export const rootStore: RootStore = {
  helloModel: new HelloModel(fetcher),
  kindStore: new KindStore(fetcher),
};
