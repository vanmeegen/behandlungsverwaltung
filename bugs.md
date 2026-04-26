# Bug-Fix-Plan — strikt TDD (Red → Green) pro Bug

Jeder Bug bekommt **zuerst** einen fehlschlagenden Test, dann die Minimal-
Implementation, bis genau dieser Test grün wird. Pro Bug ein eigener Commit.

| #   | Bug                                                                    | Test-Form                        | Test-Datei                                                                                             |
| --- | ---------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | `/files/templates/...` 404                                             | Unit (HTTP-Route)                | `apps/server/src/__tests__/http/templatesRoute.spec.ts` (neu)                                          |
| 2   | Therapie-Dropdown zeigt rohe Enum-IDs (`lerntherapie`)                 | Component                        | `apps/web/src/__tests__/components/Schnellerfassung.spec.tsx` (+ Test)                                 |
| 3   | „Entfernen"-Button löscht Vorlage nicht                                | Unit (Store) + Component         | `apps/web/src/__tests__/stores/TemplateStore.spec.ts` (+ Test), `TemplateUploadPage.spec.tsx` (+ Test) |
| 4   | Rechnungsnummer-Input frisst Tasteneingaben                            | Component                        | `apps/web/src/__tests__/components/RechnungCreatePage.spec.tsx` (+ Test)                               |
| 5   | Geänderte Rechnungsnummer landet nicht in PDF                          | identisch zu Bug 4 (Submit-Pfad) | dito                                                                                                   |
| 6   | „noch verfügbar" gehört rechts neben BE-Stepper, nicht in die Liste    | Component                        | `Schnellerfassung.spec.tsx` (+ Test)                                                                   |
| 7   | Anzeige „noch verfügbar" wird nach Erfassen nicht aktualisiert (stale) | Component                        | `Schnellerfassung.spec.tsx` (+ Test)                                                                   |
| 8   | Rechnung erstellen — gar keine Rückmeldung (kein Erfolg, kein Fehler)  | Component                        | `RechnungCreatePage.spec.tsx` (+ Test)                                                                 |
| 9   | Auftraggeber-Dropdown muss auf Therapien des gewählten Kindes filtern  | Component                        | `RechnungCreatePage.spec.tsx` (+ Test)                                                                 |

Test-Wahl-Begründung steht jeweils unter dem Bug.

---

## Bug 1 — `/files/templates/<filename>` liefert 404

**Symptom**: Im UI verlinkt `TemplateUploadPage` jede Datei mit
`/files/templates/${tpl.filename}`. Server kennt nur `/bills/`, `/timesheets/`,
`/graphql`. → 404.

**Test-Form**: Unit auf der HTTP-Route. Begründung: Reine Server-Route, keine
DB, kein React. Pendant `billsRoute.spec.ts` existiert bereits — gleiche
Struktur, ein File schreiben, `Bun.serve`-Helper aus dem Test wiederverwenden.

### 1.1 Red

`apps/server/src/__tests__/http/templatesRoute.spec.ts` neu, analog zu
`billsRoute.spec.ts`:

- Test 1: `GET /templates/example.pdf` mit existierender Datei in
  `paths.templatesDir` → 200, `content-type: application/pdf`, body = Datei.
- Test 2: Path-Traversal `GET /templates/../etc/passwd` → 404.
- Test 3: Nicht existierende Datei → 404.

### 1.2 Green

- `apps/server/src/http/billsRoute.ts`: `templatesHandler` exportieren
  (analog `timesheetsHandler` — eine Zeile, gleicher `serveFrom`-Helper).
- `apps/server/src/index.ts`: Import erweitern, Route registrieren:
  `if (url.pathname.startsWith('/templates/')) return templatesHandler(url, appPaths);`

### 1.3 Frontend-Konsistenz

- `apps/web/src/pages/TemplateUploadPage.tsx` Zeile 219:
  `/files/templates/${tpl.filename}` → `/templates/${tpl.filename}`.
  (Keine UI-Logikänderung, keine zusätzlichen Tests; bestehende Komponenten-
  Tests dürfen nicht brechen.)

---

## Bug 2 — Therapie-Dropdown zeigt rohe Enum-IDs statt Labels

**Symptom**: In `SchnellerfassungPage` Zeile 145 wird der Dropdown-Text als
`${t.form}${ag ? ` · ${...}` : ''}` gebaut → „lerntherapie · Foo GmbH" statt
„Lern-Therapie · Foo GmbH". Wirkt für den Benutzer wie eine Enum-Inkompatibilität,
weil der Tätigkeit-Dropdown unten dieselben Werte aber **mit** Label zeigt.
(Es gibt keine echte TS/GraphQL-Inkompatibilität — TherapieForm ⊂ Taetigkeit
auf Wert-Ebene; reines Display-Bug.)

**Test-Form**: Component-Test. Begründung: Reine UI-Anzeige aus Stamm-Daten;
kein Backend, kein Routing — `@testing-library` reicht. `Schnellerfassung.spec.tsx`
existiert bereits mit Renderer-Helper.

### 2.1 Red

In `apps/web/src/__tests__/components/Schnellerfassung.spec.tsx` Test
hinzufügen:

- Seede ein Kind, einen Auftraggeber, eine Therapie mit `form: 'lerntherapie'`.
- Wähle Kind → Therapie-Dropdown enthält **eine Option** mit Text, der
  `Lern-Therapie` enthält und **nicht** `lerntherapie` (case-sensitive).

### 2.2 Green

- `SchnellerfassungPage.tsx`: `THERAPIE_FORM_LABELS` aus `@behandlungsverwaltung/shared`
  importieren; Dropdown-Label-Builder nutzt `THERAPIE_FORM_LABELS[t.form]` statt `t.form`.

---

## Bug 3 — Vorlagen-„Entfernen"-Button löscht nichts

**Symptom**: `TemplateUploadPage.tsx` Zeile 230-231 ruft `templateStore.load()`
statt einer Delete-Mutation. Server-Mutation `deleteTemplate(kind, auftraggeberId)`
existiert (mutations/templates.ts:100), aber der Web-Store hat keine `remove`-
Methode.

**Test-Form**: Zweiteilig.

1. **Store-Unit**: `TemplateStore.remove({kind, auftraggeberId})` ruft die
   `deleteTemplate`-GraphQL-Mutation mit den richtigen Variablen auf und
   entfernt die Zeile aus `items`. → Unit auf `TemplateStore`, mocked
   `GraphQLFetcher`. Begründung: Logik-Änderung im Store, isoliert testbar.
2. **Component**: Klick auf „Entfernen" ruft `templateStore.remove(...)` mit
   den Daten der angeklickten Zeile. → Component-Test, `vi.fn()` als Spy.

### 3.1 Red — Store

`apps/web/src/__tests__/stores/TemplateStore.spec.ts` (existiert) erweitern:

- Test: `store.remove({kind: 'rechnung', auftraggeberId: '5'})` →
  `fetcher` wird einmal mit `DELETE_TEMPLATE`-Mutation und Variables
  `{kind: 'rechnung', auftraggeberId: '5'}` aufgerufen.
- Test: nach erfolgreichem Remove ist die entsprechende Zeile aus `store.items`
  verschwunden.

### 3.2 Green — Store

- `TemplateStore.ts`: `DELETE_TEMPLATE` GraphQL-Mutation-Konstante.
- Methode `remove({kind, auftraggeberId}): Promise<boolean>` —
  Fetcher-Aufruf, dann `items` lokal filtern.

### 3.3 Red — Component

`TemplateUploadPage.spec.tsx` (existiert) Test:

- Pre-seede `templateStore.items` mit einer Vorlage.
- Spy/Mock auf `templateStore.remove`.
- Klick auf „Entfernen"-Button → `remove` wurde mit `{kind, auftraggeberId}` der
  Zeile aufgerufen.

### 3.4 Green — Component

- `TemplateUploadPage.tsx` Zeile 230: `onClick` ruft
  `void templateStore.remove({ kind: tpl.kind, auftraggeberId: tpl.auftraggeberId })`.

---

## Bug 4 — Rechnungsnummer-Input frisst Tastendrücke

**Symptom**: `RechnungCreatePage.tsx` Zeile 66
`event.target.value.replace(/\D+/g, '').slice(0, 4)` — bei Anzeige „0001" und
Cursor am Ende: User tippt „9" → Roh-Wert „00019" → Strip → „00019" →
**`slice(0, 4)`** → „0001" → `parseInt` → 1. Nichts ändert sich.

**Test-Form**: Component-Test mit `fireEvent.change`. Begründung: Genau dieser
Input-Handler wird verifiziert; das Problem ist UI-spezifisch.

### 4.1 Red

`RechnungCreatePage.spec.tsx` (existiert) Test:

- Render Page mit einem Store, dessen `draft.lfdNummer = 1` (Anzeige „0001").
- `fireEvent.change` auf `rechnung-create-lfd` mit `target.value = '00019'`
  (das simuliert: User tippt „9" hinten an „0001").
- Erwartung: `store.draftRechnung.lfdNummer === 19` und Anzeige zeigt „0019".

### 4.2 Green

- `RechnungCreatePage.tsx` Zeile 66:
  `slice(0, 4)` → `slice(-4)` (rechte 4 Ziffern behalten statt linke).

### 4.3 Bug 5 abgedeckt

Bug 5 („geänderte Rechnungsnummer landet nicht in PDF") ist Folge von Bug 4
— Server-Pfad ist getestet (`rechnung.createMonatsrechnung.spec.ts:169-183`)
und nutzt `lfdNummer` korrekt. Mit Bug 4 grün geht der Wert raus.
**Zusatz-Sicherung** im selben Test:

- Nach `change`-Event Submit-Button klicken; verifiziere via Spy auf
  `store.saveDraft`, dass `draftRechnung.lfdNummer === 19` zur Submit-Zeit
  gesetzt ist (kein extra Test nötig — selber `it`-Block).

---

## Bug 6 — „noch verfügbar" gehört rechts neben BE-Stepper

**Symptom**: User möchte den Hinweis „noch verfügbar: N BE" prominenter im
Erfassungs-Formular rechts neben dem `BeStepper` haben. Aktuell steckt er in
`BehandlungsListeInline` über der erfassten Liste — also unterhalb des Formulars
und nur sichtbar, sobald eine Therapie gewählt ist.

**Test-Form**: Component-Test. Begründung: reine Layout-/Render-Frage. Wir
prüfen, dass die Anzeige unmittelbar unter/neben den BE-Steppern existiert
und den korrekten Wert aus `selectedTherapie.verfuegbareBe` zeigt.

### 6.1 Red

In `Schnellerfassung.spec.tsx` neuer Test:

- Therapie ist gewählt (`bewilligteBe = 60`, ohne Behandlungen → `verfuegbareBe = 60`).
- Render Page → ein Element mit `data-testselector="schnellerfassung-noch-verfuegbar"`
  ist sichtbar im **Formular-Container** (nicht nur in der Liste) und enthält
  Text `60 BE` o. ä.
- Test schlägt fehl, weil dieses Element heute nur in `BehandlungsListeInline`
  existiert.

### 6.2 Green

- `SchnellerfassungPage.tsx`: BE-Stepper-Box wird zu einer horizontalen `Stack`
  (`direction="row"`, `alignItems="center"`, `justifyContent="space-between"`).
  Rechts daneben eine `<Typography data-testselector="schnellerfassung-noch-verfuegbar">`
  mit `noch verfügbar: {selectedTherapie?.verfuegbareBe ?? 0} BE`.
  Nur sichtbar, wenn `selectedTherapie` gesetzt ist.
- `BehandlungsListeInline.tsx`: das duplizierte „noch verfügbar"-Span (Zeilen
  40–46) bleibt vorerst stehen, falls bestehende Tests darauf setzen — wir
  benennen ihn ggf. um (`schnellerfassung-behandlungsliste-noch-verfuegbar`
  bleibt wie er ist; Bug 6 fügt einen **zweiten** Anzeiger im Formular hinzu).

---

## Bug 7 — „noch verfügbar" wird nach Erfassen nicht aktualisiert (stale)

**Symptom**: Nach `behandlungStore.saveDraft()` zeigt die Anzeige weiter den
Wert vor dem Speichern. Ursache: `selectedTherapie?.verfuegbareBe` liest aus
`therapieStore.items`, das **einmalig** beim Mount geladen wird. Der
GraphQL-Resolver `Therapie.verfuegbareBe` rechnet zwar live, aber der
Web-Store wird nach einer Behandlungs-Mutation nicht neu geholt.

**Test-Form**: Component-Test. Begründung: Das Verhalten ist End-zu-End-im-UI:
Submit auslösen → Anzeige muss sich aktualisieren. Mit `vi.fn()` als Fetcher
können wir die zweite Therapie-Antwort steuern und prüfen, dass der Wert
sich neu rendert.

### 7.1 Red

In `Schnellerfassung.spec.tsx`:

- Mock-Fetcher liefert für die erste `therapien`-Query `verfuegbareBe = 60`,
  für die zweite (nach Submit) `verfuegbareBe = 58`.
- Render → Anzeige zeigt 60.
- Behandlung mit `be: 2` erfassen, Submit klicken, `await Promise.resolve()` × n.
- Anzeige zeigt 58.
- Test schlägt fehl, weil heute nichts die Therapie nachlädt.

### 7.2 Green

- `BehandlungStore.saveDraft()` (oder dessen Aufrufer in
  `SchnellerfassungPage.onSubmit`) ruft nach erfolgreichem Speichern
  `therapieStore.load()` (oder gezielter: ein neues `therapieStore.reload(id)`).
  Minimal-Variante: in `onSubmit` nach `saveDraft` `void therapieStore.load()`
  einbauen — das ist null Logik im Store und passt zum bestehenden Muster
  in `behandlungStore.delete` (das nach Löschen Behandlungen neu lädt).

---

## Bug 8 — „Rechnung erstellen" gibt keinerlei Rückmeldung

**Symptom**: User klickt Submit (April 2026 / 26.04.2026 / Muster, Axel /
Landratsamt Dachau). Es passiert sichtbar **nichts** — kein
`rechnung-create-success`-Alert, kein `rechnung-create-error`-Alert. Mögliche
Ursachen:

- Server wirft `KeineTherapieError` oder `KeineBehandlungenError`; das wird
  von `parseErrorCode` zwar erkannt, aber falls die Mutation den Error im
  GraphQL-`errors[]`-Array statt als geworfene Exception zurückgibt, kann der
  Store den Fehler verschlucken.
- Oder: ein voriges `lastCreated` ist sichtbar und der User übersieht den
  ausbleibenden Wechsel.

**Test-Form**: Component-Test in `RechnungCreatePage.spec.tsx`. Begründung:
Wir wollen die UI-Fallback-Garantie absichern — egal welcher Fehler-Code: ein
Alert wird sichtbar. Plus: nach einem Submit, der scheitert, wird der alte
`lastCreated`-Erfolgs-Alert ausgeblendet.

### 8.1 Red

- Test 1 — generischer Server-Fehler: Fetcher wirft `Error('Boom — irgend was Unbekanntes')`.
  Submit klicken → ein Element mit `role="alert"`, das `Boom` enthält, wird
  sichtbar (`data-testselector="rechnung-create-error"`).
- Test 2 — KEINE_BEHANDLUNGEN (bereits existierender Test bestätigen, falls
  vorhanden) — sicherstellen, dass der spezifische Alert weiterhin greift.
- Test 3 — nach erstem erfolgreichen Submit (lastCreated gesetzt) bricht
  zweiter Submit mit Fehler ab → der `success`-Alert ist nicht mehr im DOM,
  der `error`-Alert ist sichtbar.

Diese Tests schlagen fehl, falls der Store bei unbekannten Fehlern `error`
nicht setzt oder `lastCreated` nicht zurücksetzt.

### 8.2 Green

- `RechnungStore.saveDraft`: bei jedem Fehlerpfad
  `runInAction(() => { this.error = parseErrorCode(err); this.lastCreated = null; })`.
  Sicherstellen, dass auch der Default-Pfad (UNKNOWN) `error.message` einen
  Inhalt hat, sonst Fallback-Text „Unbekannter Fehler beim Erstellen der Rechnung".
- Falls die Mutation tatsächlich keinen Fehler wirft, aber `errors[]` enthält:
  GraphQL-Client-Helper anpassen — der `gql`-Wrapper im Web nutzt bereits
  `body.errors`, kurz prüfen.

---

## Bug 9 — Auftraggeber-Dropdown soll auf Therapien des Kindes filtern

**Symptom**: Im Rechnung-erstellen-Formular werden **alle** Auftraggeber
gelistet, nicht nur jene, zu denen es eine Therapie für das gewählte Kind
gibt. Folge: User kann eine Kombination wählen, für die definitiv keine
Behandlungen existieren können.

**Test-Form**: Component-Test in `RechnungCreatePage.spec.tsx`. Begründung:
Die Filter-Logik ist UI-state-getrieben (Kind-Auswahl). Reiner View-Layer-
Filter, kein Server-Eingriff nötig (Therapien werden ohnehin geladen).

### 9.1 Red

- Render mit:
  - 2 Kinder, 3 Auftraggeber, 1 Therapie (Kind A → Auftraggeber 1).
- Wähle Kind A → Auftraggeber-Dropdown enthält **nur** Auftraggeber 1.
- Wähle Kind B → Dropdown ist leer (oder nur „bitte wählen"). Wert wird
  geleert, falls vorher schon ein Auftraggeber gewählt war, der jetzt nicht
  mehr in der Liste ist.

Schlägt fehl, weil heute alle Auftraggeber gezeigt werden.

### 9.2 Green

- `RechnungCreatePage.tsx`: `RechnungStore` braucht Zugriff auf den
  `TherapieStore` (Prop oder direkt im Page-Component injiziert). Beim Mount
  einmal `therapieStore.load()` aufrufen.
- Im Render:
  ```ts
  const erlaubteAgIds = new Set(
    therapieStore.items.filter((t) => t.kindId === draft.kindId).map((t) => t.auftraggeberId),
  );
  const auftraggeberOptions = draft.kindId
    ? auftraggeberStore.items.filter((a) => erlaubteAgIds.has(a.id))
    : [];
  ```
- Beim Kindwechsel (`draft.setKindId`): wenn aktueller `draft.auftraggeberId`
  nicht in der neuen Liste → `setAuftraggeberId('')`. Minimal-invasiv im
  `onChange`-Handler des Kind-Selects.
- Routing in `App.tsx` ggf. anpassen, damit `RechnungCreatePage` den
  `therapieStore` aus dem `rootStore` bekommt.

---

## Reihenfolge & Commits

Ein Commit pro Bug, in dieser Reihenfolge (jeder Bug eigener Test-First-Zyklus):

1. `fix(server): /templates/<filename>-Route + Web-Link (Bug 1)`
2. `fix(web): Therapie-Dropdown nutzt THERAPIE_FORM_LABELS (Bug 2)`
3. `feat(web): TemplateStore.remove + Vorlagen-Löschen-Button (Bug 3)`
4. `fix(web): Rechnungsnummer-Input behält rechte 4 Ziffern (Bug 4 + 5)`
5. `feat(schnellerfassung): „noch verfügbar"-Anzeige neben BE-Stepper (Bug 6)`
6. `fix(schnellerfassung): Therapie nach Behandlung neu laden (Bug 7)`
7. `fix(rechnung): garantierte Fehler-Rückmeldung im Submit-Pfad (Bug 8)`
8. `feat(rechnung): Auftraggeber-Dropdown auf Therapien des Kindes filtern (Bug 9)`

## Verifikation

```bash
bun run --filter='@behandlungsverwaltung/server' test    # +3 Tests (Bug 1)
bun run --filter='@behandlungsverwaltung/web' test       # +10 Tests (Bug 2, 3a, 3b, 4, 6, 7, 8×3, 9×2)
bun run --filter='@behandlungsverwaltung/server' typecheck
bun run --filter='@behandlungsverwaltung/web' typecheck
```
