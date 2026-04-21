// Regenerates the e2e rechnung template fixture with the AcroForm fields
// the production renderer fills (pdftemplateconcept §4.2). Run via:
//   bun run apps/web/e2e/fixtures/make-template.ts
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(import.meta.url), '..');
const outPath = resolve(here, 'template-rechnung.pdf');

const doc = await PDFDocument.create();
const page = doc.addPage([595.28, 841.89]);
const font = await doc.embedFont(StandardFonts.Helvetica);
const form = doc.getForm();

// Static footer text so the e2e can still match the UStG hint from the
// template (it's no longer drawn by the renderer).
page.drawText('Umsatzsteuerfreie Leistungen gem. § 4 Nr. 14 UStG umsatzsteuerfrei', {
  x: 56,
  y: 120,
  size: 9,
  font,
});

const fields: Array<[string, number, number, number, number]> = [
  ['empfaengerAdresse', 50, 700, 250, 60],
  ['rechnungsnummer', 350, 750, 200, 20],
  ['rechnungsdatum', 350, 720, 200, 20],
  ['leistungszeitraum', 350, 690, 200, 20],
  ['einleitungstext', 50, 620, 500, 40],
  ['kindTitel', 50, 570, 500, 20],
  ['gesamtsumme', 450, 150, 100, 20],
  ['unterschriftName', 50, 80, 200, 20],
];
for (const [name, x, y, w, h] of fields) {
  const tf = form.createTextField(name);
  tf.addToPage(page, { x, y, width: w, height: h });
}

const bytes = await doc.save();
writeFileSync(outPath, bytes);
console.log(`Wrote ${outPath} (${bytes.byteLength} bytes)`);
