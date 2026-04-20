import { createGraphQLClient } from '../api/graphqlClient';
import { AuftraggeberStore } from './AuftraggeberStore';
import { HelloModel } from './HelloModel';
import { KindStore } from './KindStore';

const fetcher = createGraphQLClient();

export interface RootStore {
  helloModel: HelloModel;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
}

export const rootStore: RootStore = {
  helloModel: new HelloModel(fetcher),
  kindStore: new KindStore(fetcher),
  auftraggeberStore: new AuftraggeberStore(fetcher),
};
