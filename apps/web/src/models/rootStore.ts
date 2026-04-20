import { createGraphQLClient } from '../api/graphqlClient';
import { AuftraggeberStore } from './AuftraggeberStore';
import { HelloModel } from './HelloModel';
import { KindStore } from './KindStore';
import { TherapieStore } from './TherapieStore';

const fetcher = createGraphQLClient();

export interface RootStore {
  helloModel: HelloModel;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
}

export const rootStore: RootStore = {
  helloModel: new HelloModel(fetcher),
  kindStore: new KindStore(fetcher),
  auftraggeberStore: new AuftraggeberStore(fetcher),
  therapieStore: new TherapieStore(fetcher),
};
