import type { Locator, Page } from '@playwright/test';

export type TemplateKindValue = 'rechnung' | 'stundennachweis';

export class TemplateUploadPage {
  readonly page: Page;
  readonly kindSelect: Locator;
  readonly auftraggeberSelect: Locator;
  readonly fileInput: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.kindSelect = page.getByTestId('template-upload-kind');
    this.auftraggeberSelect = page.getByTestId('template-upload-auftraggeberId');
    this.fileInput = page.getByTestId('template-upload-file');
    this.snackbar = page.getByTestId('template-upload-snackbar');
  }

  async goto(): Promise<void> {
    await this.page.goto('/vorlagen');
  }

  async chooseKind(kind: TemplateKindValue): Promise<void> {
    await this.kindSelect.selectOption(kind);
  }

  async chooseAuftraggeber(id: string): Promise<void> {
    // Empty id means "– global –" (value="").
    await this.auftraggeberSelect.selectOption(id);
  }

  async uploadFile(path: string): Promise<void> {
    // Auto-Upload: das setInputFiles triggert ein change-Event, das die
    // Page direkt verarbeitet — kein Submit-Button mehr.
    await this.fileInput.setInputFiles(path);
  }
}
