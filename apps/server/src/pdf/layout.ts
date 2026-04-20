// Layout constants (points) for text overlay on a DIN A4 template.
// Assumes the user's Briefkopf ends ~120 mm from the top of page 1, and
// leaves the top 340 points untouched. All other pages are full-height.

export const LAYOUT = {
  marginLeft: 56,
  marginRight: 56,
  anschriftTop: 730,
  bodyTop: 540,
  bodyLineHeight: 16,
  tableHeaderFontSize: 10,
  tableRowFontSize: 10,
  titleFontSize: 14,
  smallFontSize: 9,
  // column x-coordinates for the Rechnung table (left edge):
  // Datum | Arbeitsthema | BE | Einzelpreis | Gesamt
  colDatumX: 56,
  colArbeitsthemaX: 120,
  colBeX: 340,
  colEinzelpreisX: 380,
  colGesamtX: 470,
};
