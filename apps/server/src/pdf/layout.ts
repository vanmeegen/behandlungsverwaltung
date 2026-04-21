// Layout constants (points) for text overlay on DIN A4 templates.
// Assumes the user's Briefkopf ends ~120 mm from the top of page 1, and
// leaves the top 340 points untouched. All other pages are full-height.
//
// Tabellenzone `rechnung.*` ist mit dem Tabellenrahmen in der
// briefvorlage.pdf abgestimmt (pdftemplateconcept §4.1 / pdftemplate-
// implementation §6.1). Die übrigen Werte werden weiterhin vom
// Stundennachweis-Renderer genutzt.

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

  // Tabellenzone der Rechnung (Ursprung unten-links).
  rechnung: {
    tableTopY: 540,
    tableBottomY: 180,
    rowHeight: 16,
    fontSize: 10,
    columns: {
      posX: 56,
      mengeX: 100,
      einheitX: 140,
      bezeichnungX: 180,
      einzelX: 430,
      gesamtX: 500,
    },
  },
};

export const MAX_ROWS_PER_PAGE = Math.floor(
  (LAYOUT.rechnung.tableTopY - LAYOUT.rechnung.tableBottomY) / LAYOUT.rechnung.rowHeight,
);
