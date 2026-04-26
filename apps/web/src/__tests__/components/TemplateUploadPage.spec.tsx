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
  // The page calls templateStore.load() on mount; return an empty list for
  // the templateFiles query and delegate to uploadFetcher for mutations.
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

describe('<TemplateUploadPage />', () => {
  it('renders both template kinds, an Auftraggeber selector and a file input', () => {
    renderPage(vi.fn());
    for (const id of [
      'template-upload-kind',
      'template-upload-auftraggeberId',
      'template-upload-file',
      'template-upload-submit',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it('posts kind + auftraggeberId="" (global) + base64 on submit', async () => {
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

    const pdfBytes = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
    const file = new File([new Uint8Array(pdfBytes)], 'my.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('template-upload-file') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    fireEvent.click(screen.getByTestId('template-upload-submit'));
    await new Promise((r) => setTimeout(r, 20));
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
