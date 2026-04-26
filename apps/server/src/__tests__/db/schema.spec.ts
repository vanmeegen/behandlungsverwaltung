import { describe, expect, it } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import {
  auftraggeber,
  behandlungen,
  kinder,
  rechnungBehandlungen,
  rechnungen,
  templateFiles,
  therapien,
} from '../../db/schema';

type TableLike = Parameters<typeof getTableConfig>[0];

function columnNames(table: TableLike): string[] {
  return getTableConfig(table)
    .columns.map((c) => c.name)
    .sort();
}

function foreignKeyRefs(table: TableLike): Array<{
  from: string;
  toTable: string;
  toColumn: string;
}> {
  return getTableConfig(table).foreignKeys.map((fk) => {
    const ref = fk.reference();
    const fromCol = ref.columns[0];
    const toCol = ref.foreignColumns[0];
    if (!fromCol || !toCol) {
      throw new Error(`FK in ${getTableConfig(table).name} is missing a column binding`);
    }
    return {
      from: fromCol.name,
      toTable: getTableConfig(ref.foreignTable).name,
      toColumn: toCol.name,
    };
  });
}

describe('db/schema — kinder (PRD §2.1)', () => {
  it('has table name "kinder"', () => {
    expect(getTableConfig(kinder).name).toBe('kinder');
  });

  it('has exactly the columns required by the PRD', () => {
    expect(columnNames(kinder)).toEqual(
      [
        'aktenzeichen',
        'created_at',
        'geburtsdatum',
        'hausnummer',
        'id',
        'nachname',
        'plz',
        'stadt',
        'strasse',
        'updated_at',
        'vorname',
      ].sort(),
    );
  });

  it('id is the primary key', () => {
    const id = getTableConfig(kinder).columns.find((c) => c.name === 'id');
    expect(id?.primary).toBe(true);
  });

  it('plz is NOT NULL (AC-KIND-02 DB-level echo)', () => {
    const plz = getTableConfig(kinder).columns.find((c) => c.name === 'plz');
    expect(plz?.notNull).toBe(true);
  });
});

describe('db/schema — auftraggeber (PRD §2.2)', () => {
  it('has the expected columns', () => {
    expect(columnNames(auftraggeber)).toEqual(
      [
        'abteilung',
        'created_at',
        'firmenname',
        'gruppe1_prozent',
        'gruppe1_stundensatz_cents',
        'gruppe2_prozent',
        'gruppe2_stundensatz_cents',
        'gruppe3_prozent',
        'gruppe3_stundensatz_cents',
        'gruppe4_prozent',
        'gruppe4_stundensatz_cents',
        'hausnummer',
        'id',
        'nachname',
        'plz',
        'rechnungskopf_text',
        'stadt',
        'strasse',
        'stundensatz_cents',
        'typ',
        'updated_at',
        'vorname',
      ].sort(),
    );
  });

  it('plz is NOT NULL (AC-AG-03)', () => {
    const plz = getTableConfig(auftraggeber).columns.find((c) => c.name === 'plz');
    expect(plz?.notNull).toBe(true);
  });

  it('stundensatz_cents is NOT NULL integer', () => {
    const col = getTableConfig(auftraggeber).columns.find((c) => c.name === 'stundensatz_cents');
    expect(col?.notNull).toBe(true);
    expect(col?.dataType).toBe('number');
  });

  it('firmenname / vorname / nachname are nullable (typ-discriminator fills one side)', () => {
    const cfg = getTableConfig(auftraggeber);
    const firmenname = cfg.columns.find((c) => c.name === 'firmenname');
    const vorname = cfg.columns.find((c) => c.name === 'vorname');
    const nachname = cfg.columns.find((c) => c.name === 'nachname');
    expect(firmenname?.notNull).toBe(false);
    expect(vorname?.notNull).toBe(false);
    expect(nachname?.notNull).toBe(false);
  });
});

describe('db/schema — therapien (PRD §2.3)', () => {
  it('has the expected columns', () => {
    expect(columnNames(therapien)).toEqual(
      [
        'taetigkeit',
        'auftraggeber_id',
        'bewilligte_be',
        'created_at',
        'form',
        'gruppentherapie',
        'id',
        'kind_id',
        'kommentar',
        'updated_at',
      ].sort(),
    );
  });

  it('references kinder(id) and auftraggeber(id)', () => {
    const refs = foreignKeyRefs(therapien);
    expect(refs).toContainEqual({ from: 'kind_id', toTable: 'kinder', toColumn: 'id' });
    expect(refs).toContainEqual({
      from: 'auftraggeber_id',
      toTable: 'auftraggeber',
      toColumn: 'id',
    });
  });

  it('kommentar and taetigkeit are nullable', () => {
    const cfg = getTableConfig(therapien);
    expect(cfg.columns.find((c) => c.name === 'kommentar')?.notNull).toBe(false);
    expect(cfg.columns.find((c) => c.name === 'taetigkeit')?.notNull).toBe(false);
  });

  it('gruppentherapie is NOT NULL with default false (AC-TH-04)', () => {
    const cfg = getTableConfig(therapien);
    const col = cfg.columns.find((c) => c.name === 'gruppentherapie');
    expect(col?.notNull).toBe(true);
    expect(col?.hasDefault).toBe(true);
  });
});

describe('db/schema — behandlungen (PRD §2.4)', () => {
  it('has the expected columns', () => {
    expect(columnNames(behandlungen)).toEqual(
      [
        'taetigkeit',
        'be',
        'created_at',
        'datum',
        'gruppentherapie',
        'id',
        'therapie_id',
        'updated_at',
      ].sort(),
    );
  });

  it('references therapien(id)', () => {
    const refs = foreignKeyRefs(behandlungen);
    expect(refs).toContainEqual({
      from: 'therapie_id',
      toTable: 'therapien',
      toColumn: 'id',
    });
  });

  it('taetigkeit is nullable (resolver substitutes Therapie default or null)', () => {
    const col = getTableConfig(behandlungen).columns.find((c) => c.name === 'taetigkeit');
    expect(col?.notNull).toBe(false);
  });
});

describe('db/schema — rechnungen (PRD §4)', () => {
  it('has the expected columns', () => {
    expect(columnNames(rechnungen)).toEqual(
      [
        'auftraggeber_id',
        'created_at',
        'dateiname',
        'downloaded_at',
        'gesamt_cents',
        'id',
        'jahr',
        'kind_id',
        'monat',
        'nummer',
        'rechnungsdatum',
        'stundensatz_cents_snapshot',
      ].sort(),
    );
  });

  it('references kinder(id) and auftraggeber(id)', () => {
    const refs = foreignKeyRefs(rechnungen);
    expect(refs).toContainEqual({ from: 'kind_id', toTable: 'kinder', toColumn: 'id' });
    expect(refs).toContainEqual({
      from: 'auftraggeber_id',
      toTable: 'auftraggeber',
      toColumn: 'id',
    });
  });

  it('declares a unique index on (jahr, monat, kind_id, auftraggeber_id) for duplicate detection (AC-RECH-05)', () => {
    const cfg = getTableConfig(rechnungen);
    const cols = ['jahr', 'monat', 'kind_id', 'auftraggeber_id'];
    const match = cfg.indexes.find((idx) => {
      // `columns` on an Index contains either SQLiteColumn instances or SQL expressions.
      const names = idx.config.columns
        .map((c) => (typeof c === 'object' && 'name' in c ? (c.name as string) : null))
        .filter((n): n is string => n !== null)
        .sort();
      return idx.config.unique === true && names.join(',') === cols.slice().sort().join(',');
    });
    expect(match).toBeDefined();
  });

  it('nummer is unique text (Rechnungsnummer YYYY-MM-NNNN)', () => {
    const cfg = getTableConfig(rechnungen);
    const nummer = cfg.columns.find((c) => c.name === 'nummer');
    expect(nummer?.notNull).toBe(true);
    expect(nummer?.isUnique).toBe(true);
  });
});

describe('db/schema — rechnung_behandlungen (snapshot lines)', () => {
  it('has the expected columns', () => {
    expect(columnNames(rechnungBehandlungen)).toEqual(
      [
        'behandlung_id',
        'id',
        'rechnung_id',
        'snapshot_taetigkeit',
        'snapshot_be',
        'snapshot_date',
        'snapshot_zeilenbetrag_cents',
      ].sort(),
    );
  });

  it('references rechnungen(id) and behandlungen(id)', () => {
    const refs = foreignKeyRefs(rechnungBehandlungen);
    expect(refs).toContainEqual({
      from: 'rechnung_id',
      toTable: 'rechnungen',
      toColumn: 'id',
    });
    expect(refs).toContainEqual({
      from: 'behandlung_id',
      toTable: 'behandlungen',
      toColumn: 'id',
    });
  });
});

describe('db/schema — template_files', () => {
  it('has the expected columns', () => {
    expect(columnNames(templateFiles)).toEqual(
      ['auftraggeber_id', 'created_at', 'filename', 'id', 'kind'].sort(),
    );
  });

  it('auftraggeber_id is nullable (null = global template)', () => {
    const col = getTableConfig(templateFiles).columns.find((c) => c.name === 'auftraggeber_id');
    expect(col?.notNull).toBe(false);
  });

  it('references auftraggeber(id) via its nullable FK', () => {
    const refs = foreignKeyRefs(templateFiles);
    expect(refs).toContainEqual({
      from: 'auftraggeber_id',
      toTable: 'auftraggeber',
      toColumn: 'id',
    });
  });

  it('declares a unique index on (kind, auftraggeber_id)', () => {
    const cfg = getTableConfig(templateFiles);
    const expected = ['auftraggeber_id', 'kind'];
    const match = cfg.indexes.find((idx) => {
      const names = idx.config.columns
        .map((c) => (typeof c === 'object' && 'name' in c ? (c.name as string) : null))
        .filter((n): n is string => n !== null)
        .sort();
      return idx.config.unique === true && names.join(',') === expected.join(',');
    });
    expect(match).toBeDefined();
  });
});
