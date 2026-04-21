import { describe, expect, it } from 'bun:test';
import { GraphQLEnumType, GraphQLObjectType } from 'graphql';
import { schema } from '../../schema';

const EXPECTED_OBJECT_TYPES: Record<string, string[]> = {
  Kind: [
    'id',
    'vorname',
    'nachname',
    'geburtsdatum',
    'strasse',
    'hausnummer',
    'plz',
    'stadt',
    'aktenzeichen',
  ],
  Auftraggeber: [
    'id',
    'typ',
    'firmenname',
    'vorname',
    'nachname',
    'strasse',
    'hausnummer',
    'plz',
    'stadt',
    'stundensatzCents',
  ],
  Therapie: ['id', 'kindId', 'auftraggeberId', 'form', 'kommentar', 'bewilligteBe', 'arbeitsthema'],
  Behandlung: ['id', 'therapieId', 'datum', 'be', 'arbeitsthema'],
  Rechnung: [
    'id',
    'nummer',
    'jahr',
    'monat',
    'kindId',
    'auftraggeberId',
    'stundensatzCentsSnapshot',
    'gesamtCents',
    'dateiname',
  ],
};

const EXPECTED_ENUMS: Record<string, string[]> = {
  AuftraggeberTyp: ['firma', 'person'],
  TherapieForm: [
    'dyskalkulie',
    'lerntherapie',
    'lrs_therapie',
    'resilienztraining',
    'heilpaedagogik',
    'elternberatung',
    'sonstiges',
  ],
  Taetigkeit: [
    'dyskalkulie',
    'lerntherapie',
    'lrs_therapie',
    'resilienztraining',
    'heilpaedagogik',
    'elternberatung',
    'sonstiges',
    'elterngespraech',
    'lehrergespraech',
    'bericht',
    'foerderplan',
    'teamberatung',
  ],
  TemplateKind: ['rechnung', 'stundennachweis'],
};

describe('GraphQL object types (PRD §2)', () => {
  for (const [name, expectedFields] of Object.entries(EXPECTED_OBJECT_TYPES)) {
    describe(name, () => {
      const type = schema.getType(name);

      it('is exposed as an object type', () => {
        expect(type).toBeInstanceOf(GraphQLObjectType);
      });

      it('declares every field required by the PRD', () => {
        expect(type).toBeInstanceOf(GraphQLObjectType);
        const obj = type as GraphQLObjectType;
        const actualFields = Object.keys(obj.getFields()).sort();
        for (const f of expectedFields) {
          expect(actualFields).toContain(f);
        }
      });
    });
  }
});

describe('GraphQL enum types', () => {
  for (const [name, expectedValues] of Object.entries(EXPECTED_ENUMS)) {
    it(`${name} enumerates ${expectedValues.join(', ')}`, () => {
      const type = schema.getType(name);
      expect(type).toBeInstanceOf(GraphQLEnumType);
      const actual = (type as GraphQLEnumType)
        .getValues()
        .map((v) => v.value as string)
        .sort();
      expect(actual).toEqual([...expectedValues].sort());
    });
  }
});
