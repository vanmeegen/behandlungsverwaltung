import { createGraphQLClient } from '../api/graphqlClient';
import { AuftraggeberStore } from './AuftraggeberStore';
import { BehandlungStore } from './BehandlungStore';
import { HelloModel } from './HelloModel';
import { KindStore } from './KindStore';
import { RechnungStore } from './RechnungStore';
import { StundennachweisStore } from './StundennachweisStore';
import { TemplateStore } from './TemplateStore';
import { TherapieStore } from './TherapieStore';

const fetcher = createGraphQLClient();

export interface RootStore {
  helloModel: HelloModel;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
  behandlungStore: BehandlungStore;
  templateStore: TemplateStore;
  rechnungStore: RechnungStore;
  stundennachweisStore: StundennachweisStore;
}

export const rootStore: RootStore = {
  helloModel: new HelloModel(fetcher),
  kindStore: new KindStore(fetcher),
  auftraggeberStore: new AuftraggeberStore(fetcher),
  therapieStore: new TherapieStore(fetcher),
  behandlungStore: new BehandlungStore(fetcher),
  templateStore: new TemplateStore(fetcher),
  rechnungStore: new RechnungStore(fetcher),
  stundennachweisStore: new StundennachweisStore(fetcher),
};
