import type { Locator, Page } from '@playwright/test';

export type TemplateKindValue = 'rechnung' | 'stundennachweis';

export class TemplateUploadPage {
  readonly page: Page;
  readonly kindSelect: Locator;
  readonly auftraggeberSelect: Locator;
  readonly fileInput: Locator;
  readonly submit: Locator;
  readonly fileName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.kindSelect = page.getByTestId('template-upload-kind');
    this.auftraggeberSelect = page.getByTestId('template-upload-auftraggeberId');
    this.fileInput = page.getByTestId('template-upload-file');
    this.submit = page.getByTestId('template-upload-submit');
    this.fileName = page.getByTestId('template-upload-file-name');
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

  async setFile(path: string): Promise<void> {
    await this.fileInput.setInputFiles(path);
  }

  async submitAndWait(): Promise<void> {
    await this.submit.click();
  }
}
