// Layout constants (points) for text overlay on DIN A4 templates.
// Assumes the user's Briefkopf ends ~120 mm from the top of page 1, and
// leaves the top 340 points untouched. All other pages are full-height.
//
// Tabellenzone `rechnung.*` ist auf die optimierte Rechnungsvorlage
// `rechnungsvorlage.pdf` abgestimmt: Tabellenrahmen 50/183.5 –
// 545/513.3, Header 22 pt hoch (Unterkante y=491.3), Spaltentrenner
// bei x = 50, 96, 136, 176, 415, 480, 545. Spalten in der Vorlage:
// Pos · Anzahl · Einheit · Bezeichnung · BE € · Gesamt €. Die übrigen
// Werte werden weiterhin vom Stundennachweis-Renderer genutzt.

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
    tableTopY: 480,
    tableBottomY: 188,
    rowHeight: 16,
    fontSize: 10,
    columns: {
      posX: 54,
      mengeX: 100,
      einheitX: 140,
      bezeichnungX: 180,
      einzelX: 419,
      gesamtX: 484,
    },
  },
};

export const MAX_ROWS_PER_PAGE = Math.floor(
  (LAYOUT.rechnung.tableTopY - LAYOUT.rechnung.tableBottomY) / LAYOUT.rechnung.rowHeight,
);
