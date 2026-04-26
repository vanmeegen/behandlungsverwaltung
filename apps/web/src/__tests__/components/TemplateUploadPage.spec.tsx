import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { AuftraggeberStore, type Auftraggeber } from '../../models/AuftraggeberStore';
import { TemplateStore } from '../../models/TemplateStore';
import { TemplateUploadPage } from '../../pages/TemplateUploadPage';

const jugendamt: Auftraggeber = {
  id: '20',
  typ: 'firma',
  firmenname: 'Jugendamt Köln',
  vorname: null,
  nachname: null,
  strasse: 'X',
  hausnummer: '1',
  plz: '51103',
  stadt: 'Köln',
  stundensatzCents: 4500,
  abteilung: null,
  rechnungskopfText: 'Mein Honorar …:',
};

function renderPage(uploadFetcher: ReturnType<typeof vi.fn>): {
  templateStore: TemplateStore;
  aStore: AuftraggeberStore;
} {
  const fetcher = vi.fn(async (query: string, variables?: Record<string, unknown>) => {
    if (query.includes('templateFiles {')) return { templateFiles: [] };
    return uploadFetcher(query, variables);
  });
  const templateStore = new TemplateStore(fetcher as unknown as GraphQLFetcher);
  const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
  aStore.items = [jugendamt];
  render(
    <MemoryRouter>
      <TemplateUploadPage templateStore={templateStore} auftraggeberStore={aStore} />
    </MemoryRouter>,
  );
  return { templateStore, aStore };
}

function base64FromArrayLike(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes));
}

describe('<TemplateUploadPage /> — Auto-Upload (AC-TPL-04)', () => {
  it('renders a single "PDF-Datei hochladen" button (no separate submit)', () => {
    renderPage(vi.fn());
    expect(screen.getByTestId('template-upload-kind')).toBeInTheDocument();
    expect(screen.getByTestId('template-upload-auftraggeberId')).toBeInTheDocument();
    expect(screen.getByTestId('template-upload-file-btn')).toBeInTheDocument();
  });

  it('auto-starts upload on file change without needing a second button click (AC-TPL-04)', async () => {
    const uploadFetcher = vi.fn().mockResolvedValue({
      uploadTemplate: {
        id: '1',
        kind: 'rechnung',
        auftraggeberId: null,
        filename: 'rechnung-global.pdf',
      },
    });
    renderPage(uploadFetcher);
    await new Promise((r) => setTimeout(r, 20));

    const pdfBytes = [0x25, 0x50, 0x44, 0x46, 0x2d];
    const file = new File([new Uint8Array(pdfBytes)], 'my.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('template-upload-file') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await new Promise((r) => setTimeout(r, 30));
    expect(uploadFetcher).toHaveBeenCalledTimes(1);
    const [, variables] = uploadFetcher.mock.calls[0] as [string, Record<string, unknown>];
    const input = (
      variables as { input: { kind: string; auftraggeberId: string | null; base64: string } }
    ).input;
    expect(input.kind).toBe('rechnung');
    expect(input.auftraggeberId).toBeNull();
    expect(input.base64).toBe(base64FromArrayLike(pdfBytes));
  });
});

describe('<TemplateUploadPage /> — Vorlage löschen (Bug 3)', () => {
  it('dispatches deleteTemplate with the row data when "Entfernen" is clicked', async () => {
    const fetcher = vi.fn(async (query: string, _vars?: Record<string, unknown>) => {
      if (query.includes('templateFiles {')) return { templateFiles: [] };
      return { deleteTemplate: true };
    });
    const templateStore = new TemplateStore(fetcher as unknown as GraphQLFetcher);
    templateStore.items = [{ id: '1', kind: 'rechnung', auftraggeberId: '20', filename: 'r.pdf' }];
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    aStore.items = [jugendamt];
    render(
      <MemoryRouter>
        <TemplateUploadPage templateStore={templateStore} auftraggeberStore={aStore} />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: 'Entfernen' });
    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 20));
    const deleteCall = fetcher.mock.calls.find(([q]) => (q as string).includes('deleteTemplate'));
    expect(deleteCall).toBeDefined();
    expect(deleteCall![1]).toEqual({ kind: 'rechnung', auftraggeberId: '20' });
  });

  it('passes auftraggeberId=null for global template removal', async () => {
    const fetcher = vi.fn(async (query: string, _vars?: Record<string, unknown>) => {
      if (query.includes('templateFiles {')) return { templateFiles: [] };
      return { deleteTemplate: true };
    });
    const templateStore = new TemplateStore(fetcher as unknown as GraphQLFetcher);
    templateStore.items = [
      { id: '2', kind: 'rechnung', auftraggeberId: null, filename: 'global.pdf' },
    ];
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    render(
      <MemoryRouter>
        <TemplateUploadPage templateStore={templateStore} auftraggeberStore={aStore} />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: 'Entfernen' });
    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 20));
    const deleteCall = fetcher.mock.calls.find(([q]) => (q as string).includes('deleteTemplate'));
    expect(deleteCall).toBeDefined();
    expect(deleteCall![1]).toEqual({ kind: 'rechnung', auftraggeberId: null });
  });
});
