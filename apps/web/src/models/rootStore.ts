import { createGraphQLClient } from '../api/graphqlClient';
import { AuftraggeberStore } from './AuftraggeberStore';
import { BehandlungStore } from './BehandlungStore';
import { KindStore } from './KindStore';
import { RechnungStore } from './RechnungStore';
import { StundennachweisStore } from './StundennachweisStore';
import { TemplateStore } from './TemplateStore';
import { TherapieStore } from './TherapieStore';
import { UiStore } from './UiStore';

const fetcher = createGraphQLClient();

export interface RootStore {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
  behandlungStore: BehandlungStore;
  templateStore: TemplateStore;
  rechnungStore: RechnungStore;
  stundennachweisStore: StundennachweisStore;
  uiStore: UiStore;
}

export const rootStore: RootStore = {
  kindStore: new KindStore(fetcher),
  auftraggeberStore: new AuftraggeberStore(fetcher),
  therapieStore: new TherapieStore(fetcher),
  behandlungStore: new BehandlungStore(fetcher),
  templateStore: new TemplateStore(fetcher),
  rechnungStore: new RechnungStore(fetcher),
  stundennachweisStore: new StundennachweisStore(fetcher),
  uiStore: new UiStore(),
};
