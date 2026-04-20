# Behandlungsverwaltung — Implementation Plan

Living plan per `AGENTS.md`. Mark completed items with ✅ when done. Every step follows strict red → green → refactor TDD. E2E specs (`apps/web/e2e/*.e2e.ts`, page-object pattern, `data-testselector`) are written alongside the unit tests for any user-visible slice. No step is "done" until `bun run lint && bun run typecheck && bun run test:ci && bun run e2e` is green.

## Phase 0: Scaffolding

- ✅ Bun monorepo with workspaces (`apps/web`, `apps/server`, `packages/shared`)
- ✅ React + TypeScript + Vite + MobX frontend (`apps/web`)
- ✅ Bun + graphql-yoga + Pothos backend (`apps/server`)
- ✅ Drizzle ORM on `bun:sqlite` (`apps/server/src/db`)
- ✅ Vitest + jsdom + `@testing-library/*` for web tests (`src/__tests__/`)
- ✅ `bun test` for server schema test (`src/__tests__/schema.spec.ts`)
- ✅ ESLint (flat config) + Prettier
- ✅ Husky + lint-staged pre-commit hook
- ✅ Hello-world end-to-end: GraphQL `{ hello }` → MobX model → React observer
- ✅ Standalone single-file executables (`bun run build:standalone`)
  that embed the Vite bundle, GraphQL server, and SQLite — currently
  Windows x64 and macOS arm64. Binary auto-opens the default browser on
  launch and stores `app.db` next to itself.
- ✅ PWA manifest + service worker for Android installability
  (no native Bun support for Android; PWA is the supported path).

## Standalone distribution

- Build all targets: `bun run build:standalone -- --targets=all`
- Default targets: `windows-x64`, `darwin-arm64` (can be changed via
  `--targets=<list>`; full list: `linux-x64`, `linux-arm64`,
  `darwin-x64`, `darwin-arm64`, `windows-x64`).
- Output: `dist-standalone/behandlungsverwaltung-<target>[.exe]`.
- Android: not a Bun compile target. The web app ships as an installable
  PWA and can point at a standalone server on the LAN.

## Working rules (from AGENTS.md)

- Red/green TDD, step by step — **never** write production code without a failing test citing the AC.
- No React state hooks for app state — MobX observables + `observer`. `useEffect` only for one-shot `model.load()` bootstraps (as in `Hello.tsx`).
- Strict TypeScript, named exported types (no inline types shared across files).
- Run `bun run lint && bun run typecheck && bun run test:ci && bun run e2e` before each commit. Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).

## Cross-cutting concerns (implemented incrementally, not as a standalone phase)

These live in `packages/shared` and are re-used by server (Pothos input validation) and web (form validation). Add them in the first phase that needs them, then extend.

- **`packages/shared/src/validation/plz.ts`** — `plzSchema` (Zod) enforcing non-empty 5-digit German PLZ. Used by Kind + Auftraggeber. Implements AC-KIND-02 and AC-AG-03.
- **`packages/shared/src/validation/address.ts`** — shared `addressSchema` composing `plzSchema` with Straße/Hausnummer/Stadt.
- **`packages/shared/src/format/euro.ts`** — `formatEuro(amountCents: number): string` using `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`. Always cents in storage, formatting at the edge.
- **`packages/shared/src/format/filename.ts`** — `sanitizeKindesname(vorname: string, nachname: string): string` → ASCII-fold (`ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`), strip non-word chars, join with `_`. Consumed by Stundennachweis filename (AC-STD-04).
- **`packages/shared/src/domain/rechnungsnummer.ts`** — pure `generateRechnungsnummer(existing: readonly string[], year: number, month: number): string`. Phase 6 lives or dies here. Implements AC-RECH-03 / AC-RECH-04.
- **`packages/shared/src/domain/ids.ts`** — brand types (`KindId`, `AuftraggeberId`, `TherapieId`, `BehandlungId`, `RechnungId`) as `string & { readonly __brand: '...' }` to prevent id mix-ups across GraphQL/MobX/DB.

Add `zod` to `packages/shared/package.json` dependencies; wire `bun test` in the shared workspace so shared specs run through root `bun run test`.

---

## Phase 1: Domain foundation (Drizzle + GraphQL scaffolding, no UI)

Goal: all five tables exist, migrations generated, GraphQL types declared, no resolvers yet except read-only smoke queries.

### 1.1 Drizzle tables

- **Red (unit, server)**: add `apps/server/src/__tests__/db/schema.spec.ts` that imports each new table (`kinder`, `auftraggeber`, `therapien`, `behandlungen`, `rechnungen`, `templateFiles`) and asserts its columns via `getTableColumns` and that foreign keys point where expected.
- **Green**: extend `apps/server/src/db/schema.ts` with the tables below (all money as integer cents; all dates as `integer { mode: 'timestamp' }`; ids as `integer primaryKey autoIncrement`):
  - `kinder`: vorname, nachname, geburtsdatum, strasse, hausnummer, plz, stadt, aktenzeichen, createdAt, updatedAt
  - `auftraggeber`: typ (`'firma' | 'person'` as `text` with check), firmenname, vorname, nachname, strasse, hausnummer, plz, stadt, stundensatzCents, createdAt, updatedAt
  - `therapien`: kindId (FK), auftraggeberId (FK), form (`'dyskalkulie'|'lerntherapie'|'heilpaedagogik'|'elternberatung'|'sonstiges'`), kommentar (nullable, required only if form=sonstiges — enforced at app layer), bewilligteBe, **arbeitsthema (nullable — default for Behandlungen; PRD §2.3)**, createdAt, updatedAt
  - `behandlungen`: therapieId (FK), datum, be (integer ≥ 1), **arbeitsthema (text — pre-filled from Therapie.arbeitsthema on create, overridable per PRD §2.4 / AC-BEH-03)**, createdAt, updatedAt
  - `rechnungen`: nummer (TEXT UNIQUE — `YYYY-MM-NNNN`), jahr, monat, kindId (FK), auftraggeberId (FK), stundensatzCentsSnapshot, gesamtCents, dateiname, createdAt. Unique composite index on `(jahr, monat, kindId, auftraggeberId)` so AC-RECH-05 duplicate detection is purely DB-driven.
  - `rechnungBehandlungen`: rechnungId (FK), behandlungId (FK), snapshotDate, snapshotBe, **snapshotArbeitsthema** (per-line column in the invoice PDF, PRD §3.2), snapshotZeilenbetragCents. Snapshots freeze billed lines even if `behandlungen` is later edited/deleted.
  - `templateFiles`: id, kind (`'rechnung'|'stundennachweis'`), auftraggeberId (nullable — null = global), filename (relative to `templates/`), createdAt, unique `(kind, auftraggeberId)`.
- **Refactor**: split `schema.ts` into one file per entity under `apps/server/src/db/schema/`, re-export from `index.ts`. Update `drizzle.config.ts` path if needed.
- Run `bun run db:generate` and commit the SQL under `apps/server/drizzle/`.

### 1.2 Migration runner on server boot <!-- part of AC-SYS-01 -->

- **Red (unit, server)**: `apps/server/src/__tests__/db/migrate.spec.ts` — given a fresh temp sqlite file (via `DB_PATH` override), `runMigrations(db)` creates all tables.
- **Green**: add `apps/server/src/db/migrate.ts` (uses `drizzle-orm/bun-sqlite/migrator`). Call it from `src/index.ts` and `src/standalone.ts` before `Bun.serve`.
- **Refactor**: extract `createAndMigrateDb()` so tests and production share the bootstrap.

### 1.3 GraphQL types (Pothos objects, no resolvers yet)

- **Red (unit, server)**: `apps/server/src/__tests__/schema/types.spec.ts` — introspect `schema` and assert presence of `type Kind`, `type Auftraggeber`, `type Therapie`, `type Behandlung`, `type Rechnung`, and the enum types.
- **Green**: add `apps/server/src/schema/types/*.ts` files (one per entity). Register the SchemaContext with `db: Db`, update `builder.ts` to type it, inject the db into yoga's `context` in `index.ts` and `standalone.ts`.

### 1.4 Shared brand types + validators

- **Red (unit, shared)**: `packages/shared/src/__tests__/validation.spec.ts` — `plzSchema` rejects `""`, `"abcde"`, accepts `"12345"`; `addressSchema` composes correctly.
- **Green**: create the shared validators listed in Cross-cutting concerns.

### 1.5 Commit gate

- Run `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`. If green, `git commit -m "feat(domain): add drizzle schema, migrations and graphql types for Kind/Auftraggeber/Therapie/Behandlung/Rechnung"`.

---

## Phase 2: Kind (Stammdaten CRUD)

### 2.1 Server: `createKind` mutation <!-- implements AC-KIND-02, PRD §2.1 -->

- **Red (unit, server)**: `apps/server/src/__tests__/schema/kind.createKind.spec.ts` — parameterised validation table covering **every** field in §2.1:
  - empty PLZ → `"PLZ ist Pflicht"` (AC-KIND-02)
  - PLZ with non-digits (e.g. `"ABCDE"`) or wrong length → `"PLZ muss fünf Ziffern enthalten"`
  - empty `vorname` / `nachname` → respective Pflicht-errors
  - missing or malformed `geburtsdatum` → `"Geburtsdatum ist Pflicht"` / `"Geburtsdatum ist ungültig"`
  - `geburtsdatum` in the future → `"Geburtsdatum darf nicht in der Zukunft liegen"`
  - fully valid input → returns `Kind { id }` and **every one** of the 8 columns (vorname, nachname, geburtsdatum, strasse, hausnummer, plz, stadt, aktenzeichen) is persisted byte-for-byte.
- **Green**: Pothos input `KindInput` builds on shared `kindSchema` (= `addressSchema` + `vornameSchema` + `nachnameSchema` + `geburtsdatumSchema` + optional `aktenzeichenSchema`). Resolver inserts row. Errors thrown as `GraphQLError` with a stable `code`.
- **Refactor**: extract `validateOrThrow(schema, input)` helper.

### 2.2 Server: `kinder` query + `updateKind`

- **Red (unit, server)**: same file — list returns inserted Kinder ordered by nachname; updateKind applies partial updates.
- **Green**: implement.

### 2.3 Web: `KindStore` MobX model

- **Red (unit, web)**: `apps/web/src/__tests__/stores/KindStore.spec.ts` — given a mocked fetcher returning two Kinder, `store.load()` populates `store.items`; `store.create({...})` optimistically appends; error surfaces on `store.error`.
- **Green**: `apps/web/src/models/KindStore.ts` — follows `HelloModel` pattern (constructor takes `GraphQLFetcher`, `makeAutoObservable`, `runInAction` in async gutters).

### 2.4 Web: `KindListPage`, `KindFormPage`, routing

- Pick a router: `react-router-dom` v6 (minimal, client-side only). Install in `apps/web`. Wire in `main.tsx`.
- **Red (unit, web)**: `apps/web/src/__tests__/components/KindList.spec.tsx` — renders rows with `data-testselector="kind-row"` per Kind.
- **Red (unit, web)**: `apps/web/src/__tests__/components/KindForm.spec.tsx` — parameterised validation table mirroring §2.1:
  - empty PLZ → inline error "PLZ ist Pflicht"
  - empty Vorname / Nachname → inline errors
  - empty / future Geburtsdatum → inline errors
  - valid submit of **all 8 fields** calls `store.create` with exactly the typed values (assert via mock fetcher spy).
  - The form renders an input for **every** DB column (vorname, nachname, geburtsdatum, strasse, hausnummer, plz, stadt, aktenzeichen) — assert each via `data-testselector="kind-form-<field>"`.
- **Green**: `apps/web/src/components/KindList.tsx`, `KindForm.tsx`, `pages/KindListPage.tsx`, `pages/KindFormPage.tsx`. Mobile-first CSS (single column, ≥44px tap targets, sticky primary action bottom). Validation errors driven by the **same shared zod schema** the server uses — single source of truth.

### 2.5 E2E: create + edit Kind <!-- implements AC-KIND-01, AC-KIND-03, UC-3.5 -->

- **Red (e2e)**: `apps/web/e2e/uc-3.5-kind.e2e.ts` using new `apps/web/e2e/pages/KindListPage.ts` and `KindFormPage.ts`. Three scenarios:
  - **Happy path (AC-KIND-01 / UC-3.5 Szenario 1)**: empty list → open form → fill **all 8 fields** (vorname="Anna", nachname="Musterfrau", geburtsdatum="2018-03-14", strasse="Hauptstr.", hausnummer="12", plz="50667", stadt="Köln", aktenzeichen="K-2026-001") → submit → success toast; list row "Musterfrau, Anna" visible. **Field readback**: `afterEach` queries `kinder { id vorname nachname geburtsdatum strasse hausnummer plz stadt aktenzeichen }` via GraphQL and asserts **every** column equals the typed value byte-for-byte.
  - **Edit (AC-KIND-03)**: open existing row → change nachname → save → updated text visible via `data-testselector="kind-row-nachname-<id>"`.
  - **Edge (UC-3.5 Szenario 2)**: fill all fields except PLZ → submit → error "PLZ ist Pflicht" visible, list remains empty, `kinder` query returns `[]`.
- Playwright bootstrap uses a **per-run isolated data dir**: the `webServer.command` picks up `DB_PATH=./e2e-data/<uuid>/app.db`, `BEHANDLUNG_HOME=./e2e-data/<uuid>` env vars. See Phase 11 + Risks section.
- **Green**: markup tweaks to satisfy the page objects (add `data-testselector` attributes for every field + row).

### 2.6 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(kind): crud for Kind stammdaten`.

---

## Phase 3: Auftraggeber

### 3.1 Server: validation <!-- implements AC-AG-02, AC-AG-03, PRD §2.2 -->

- **Red (unit, server)**: `apps/server/src/__tests__/schema/auftraggeber.spec.ts` — validation table covering **every** field in §2.2:
  - `typ ∉ {firma, person}` → error
  - `typ=firma` without `firmenname` → error "Firmenname Pflicht"
  - `typ=person` without `vorname` / `nachname` → error "Vor- und Nachname Pflicht" (AC-AG-02)
  - any input without PLZ → error "PLZ ist Pflicht" (AC-AG-03)
  - `stundensatzCents` missing or `≤ 0` → error "Stundensatz muss > 0 sein"
  - valid firma: all columns (`typ`, `firmenname`, `strasse`, `hausnummer`, `plz`, `stadt`, `stundensatzCents`) persisted; `vorname`/`nachname` null
  - valid person: all columns persisted; `firmenname` null.
- **Green**: `apps/server/src/schema/types/auftraggeber.ts` with `AuftraggeberInput`. Shared `auftraggeberSchema` in `packages/shared/src/validation/auftraggeber.ts` — discriminated union on `typ` with `stundensatzCents: z.number().int().positive()`.
- **Refactor**: the discriminated-union schema also produces the TS type via `z.infer`.

### 3.2 Web: store + form

- **Red (unit, web)**: `apps/web/src/__tests__/stores/AuftraggeberStore.spec.ts`; `apps/web/src/__tests__/components/AuftraggeberForm.spec.tsx`:
  - switching typ radio shows/hides firmenname vs vorname+nachname (AC-AG-01 visual split).
  - every Pflicht-field per §2.2 surfaces its error from the shared zod schema when empty.
  - stundensatz parser: `"45,00"` → 4500; `"45"` → 4500; `"45,5"` → rejected (two decimals required); negative → rejected.
  - the form renders an input for **every** DB column used by the chosen typ.
- **Green**: `apps/web/src/models/AuftraggeberStore.ts`, `components/AuftraggeberForm.tsx`, list/form pages. Stundensatz input wired through a shared `parseEuroToCents` util.

### 3.3 E2E: create Firma + Person-edge <!-- implements AC-AG-01, AC-AG-02, UC-3.6 -->

- **Red (e2e)**: `apps/web/e2e/uc-3.6-auftraggeber.e2e.ts` with `AuftraggeberListPage` / `AuftraggeberFormPage` page objects. Two scenarios:
  - **Firma happy (AC-AG-01 / UC-3.6 Szenario 1)**: typ=Firma, firmenname="Jugendamt Köln", strasse="Kalker Hauptstr.", hausnummer="247-273", plz="51103", stadt="Köln", stundensatz="45,00" → submit. Row shows firmenname (`data-testselector="auftraggeber-row-firmenname"`); detail view renders no vorname/nachname inputs. **Field readback**: GraphQL `auftraggeber { id typ firmenname vorname nachname strasse hausnummer plz stadt stundensatzCents }` asserts `typ=firma`, `firmenname="Jugendamt Köln"`, `vorname=null`, `nachname=null`, `stundensatzCents=4500`, all other columns as typed.
  - **Person edge (UC-3.6 Szenario 2)**: typ=Person, leave vorname/nachname empty, fill plz + stundensatz → submit → error "Vor- und Nachname Pflicht"; list remains empty.
- **Green**: markup adjustments, `data-testselector` on every field and row.

### 3.4 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(auftraggeber): crud with firma/person discriminator`.

---

## Phase 4: Therapie

### 4.1 Server: validation <!-- implements AC-TH-01, PRD §2.3 -->

- **Red (unit, server)**: `apps/server/src/__tests__/schema/therapie.spec.ts` — validation table covering **every** field in §2.3:
  - `form = sonstiges` without `kommentar` → error "Kommentar ist Pflicht bei Sonstiges" (AC-TH-01); with kommentar → ok.
  - other forms ignore kommentar.
  - `form ∉ {dyskalkulie, lerntherapie, heilpaedagogik, elternberatung, sonstiges}` → error.
  - missing `kindId` / `auftraggeberId` → Pflicht-error; FK pointing at non-existent row → DB error.
  - `bewilligteBe` missing or `≤ 0` → error "Bewilligte Behandlungseinheiten müssen > 0 sein".
  - `arbeitsthema` optional: null persists as null; non-null persists as given; whitespace-only trimmed to null.
  - valid input: every column (`kindId`, `auftraggeberId`, `form`, `kommentar`, `bewilligteBe`, `arbeitsthema`) persisted as given.
- **Green**: `packages/shared/src/validation/therapie.ts` Zod `.superRefine` for the kommentar-conditional; `bewilligteBe: z.number().int().positive()`; `arbeitsthema: z.string().trim().min(1).optional().nullable()`.

### 4.2 Server: list by Kind + by Auftraggeber

- **Red (unit, server)**: same file — `therapienByKind(kindId)` returns only matching rows; analogous for Auftraggeber.
- **Green**: queries with where-clauses.

### 4.3 Web: store + form + nested listings

- **Red (unit, web)**: `TherapieStore.spec.ts` (CRUD); `TherapieForm.spec.tsx`:
  - conditional kommentar field (shown + required only for form=sonstiges — AC-TH-01 UI echo)
  - `arbeitsthema` text input always visible (optional)
  - `bewilligteBe` number input required and > 0
  - `kindId` / `auftraggeberId` dropdowns required
  - the form renders an input for **every** DB column (kindId, auftraggeberId, form, kommentar, bewilligteBe, arbeitsthema).
    `KindDetail.spec.tsx` (renders list of Therapien from injected store); `AuftraggeberDetail.spec.tsx` (same).
- **Green**: implement.

### 4.4 E2E: Therapie CRUD with dual-parent visibility <!-- implements AC-TH-02, AC-TH-01, UC-3.7 -->

- **Red (e2e)**: `apps/web/e2e/uc-3.7-therapie.e2e.ts`. Two scenarios:
  - **Happy (UC-3.7 Szenario 1)**: seed Kind "Anna Musterfrau" + Auftraggeber "Jugendamt Köln"; open Therapieliste → Neu → pick both, form=Lerntherapie, bewilligteBe=60, arbeitsthema="Mathe-Grundlagen" → submit. Assert therapie row appears on **both** `KindDetailPage` and `AuftraggeberDetailPage`. **Field readback**: GraphQL `therapien { id kindId auftraggeberId form kommentar bewilligteBe arbeitsthema }` asserts every column (form=lerntherapie, kommentar=null, bewilligteBe=60, arbeitsthema="Mathe-Grundlagen", both FKs correct) matches input.
  - **Edge (UC-3.7 Szenario 2 / AC-TH-01 e2e echo)**: form=Sonstiges with empty kommentar → error "Kommentar ist Pflicht bei Sonstiges"; Therapieliste remains empty.
- **Green**: wire the nested routes; `data-testselector` on therapie rows and fields.

### 4.5 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(therapie): link kind and auftraggeber with therapieform validation`.

---

## Phase 5: Behandlung — mobile-first Schnellerfassung

### 5.1 Server: validation + create/list <!-- implements AC-BEH-02, PRD §2.4 -->

- **Red (unit, server)**: `apps/server/src/__tests__/schema/behandlung.spec.ts` — validation table covering **every** field in §2.4:
  - `be = 0` / `-1` → error "BE muss ≥ 1 sein" (AC-BEH-02); `be = 1` ok.
  - missing `therapieId` → Pflicht-error; FK pointing at non-existent Therapie → DB error.
  - missing `datum` → Pflicht-error; malformed date → error.
  - `arbeitsthema` absent → resolver substitutes `Therapie.arbeitsthema` (or null if Therapie has none); override given → stored as given; whitespace-only override → treated as "use Therapie default".
  - valid input: every column (`therapieId`, `datum`, `be`, `arbeitsthema`) persisted as given.
- `behandlungenByTherapie(therapieId)` returns in date-desc order.
- **Green**: shared `behandlungSchema` with `z.number().int().min(1)`; resolver resolves effective `arbeitsthema`.

### 5.2 Server: Arbeitsthema with Therapie-Vorbelegung <!-- implements AC-BEH-03 (updated) -->

- **Red (unit, server)**: extend `behandlung.spec.ts`:
  - given a Therapie with `arbeitsthema="Mathe-Grundlagen"`, creating a Behandlung without an explicit `arbeitsthema` → persisted row has `arbeitsthema="Mathe-Grundlagen"` (Vorbelegung).
  - override `arbeitsthema="Bruchrechnung"` on the input → persisted row has `arbeitsthema="Bruchrechnung"`.
  - given a Therapie with `arbeitsthema=null` and no override, persisted row has `arbeitsthema=null`.
- **Green**: resolver computes effective `arbeitsthema` at create time (eager snapshot, no lazy fallback at read time).

### 5.3 Web: `SchnellerfassungPage` mobile form <!-- implements AC-BEH-03 (updated), UC-3.1 -->

- **Red (unit, web)**: `Schnellerfassung.spec.tsx` — renders Kind picker, Therapie picker filtered to that Kind, BE stepper (+/− buttons, value ≥ 1, default 1), Datum defaulting to today (`new Date().toISOString().slice(0, 10)`), and an **Arbeitsthema text input pre-filled with the selected Therapie's `arbeitsthema`** (reactively updated when the Therapie picker changes, **only while the user has not manually edited the field**). Assert:
  - leaving Arbeitsthema unchanged submits the Therapie default (`store.create` called with `arbeitsthema` equal to the Therapie value).
  - overriding Arbeitsthema submits the override.
  - switching Therapie after manual edit does NOT overwrite the user's text.
  - the form renders an input for every DB column (therapieId, datum, be, arbeitsthema).
- **Green**: component + store.
- **Refactor**: stepper as a reusable `BeStepper` component; pre-fill logic isolated in a MobX-driven helper (no React `useState` for app state).

### 5.4 Web: `BehandlungStore`

- **Red (unit, web)**: `BehandlungStore.spec.ts` — `create()` delegates to fetcher; `listByTherapie(therapieId)` caches per therapie.
- **Green**: implement.

### 5.5 E2E: Schnellerfassung flow (all fields verified) <!-- implements AC-BEH-01, UC-3.1 -->

- **Red (e2e)**: `apps/web/e2e/uc-3.1-schnellerfassung.e2e.ts` — seed Kind "Anna Musterfrau" + Auftraggeber + Therapie with `arbeitsthema="Mathe-Grundlagen"` via GraphQL. Viewport 390×844. Two scenarios:
  - **Vorbelegung (UC-3.1 Szenario 1)**: open Schnellerfassung, pick Kind + Therapie; assert Arbeitsthema-Input is pre-filled with "Mathe-Grundlagen"; tap `+` twice → BE shows 2; leave datum = today, arbeitsthema unchanged; submit. Assertions: success toast; row in `TherapieDetailPage.behandlungen` shows today + "2 BE". **Field readback**: GraphQL `behandlungen(therapieId) { id therapieId datum be arbeitsthema }` asserts `datum=today`, `be=2`, `arbeitsthema="Mathe-Grundlagen"`, `therapieId` correct.
  - **Override**: repeat, overwrite Arbeitsthema with "Bruchrechnung" before submit → DB row stores `arbeitsthema="Bruchrechnung"`.

### 5.6 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(behandlung): mobile-first schnellerfassung and listing`.

---

## Phase 6: Rechnungsnummer-Generator (pure, heavily tested)

This phase is the tip of the spear for AC-RECH-03 and AC-RECH-04; all logic lives in `packages/shared/src/domain/rechnungsnummer.ts` as a **pure function** — zero DB coupling — which the server then calls inside a transaction.

### 6.1 Shared: pure function <!-- implements AC-RECH-03, AC-RECH-04 -->

- **Red (unit, shared)**: `packages/shared/src/__tests__/rechnungsnummer.spec.ts` — parameterised table:
  - No existing numbers in 2026, month=4 → `"2026-04-0001"` (AC-RECH-03)
  - Existing `["2026-04-0001","2026-04-0002"]`, month=5 → `"2026-05-0003"` (AC-RECH-04)
  - Existing `["2025-12-0099"]`, year=2026, month=1 → `"2026-01-0001"` (yearly reset)
  - Existing `["2026-03-0005","2026-03-0007"]`, month=4 → `"2026-04-0008"` (max+1, never fills gaps)
  - Existing includes a different year `["2025-11-0050"]` and same year `["2026-02-0001"]`, month=3 → `"2026-03-0002"` (only same year counts)
  - Malformed entry `["2026-04-ABCD"]` → throws with stable message (defensive).
  - Leading-zero padding for month 1–9.
- **Green**: implementation parses each existing string with a regex `/^(\d{4})-(\d{2})-(\d{4})$/`, filters by `year`, reduces `max(NNNN)`, increments, formats.
- **Refactor**: introduce helpers `parseRechnungsnummer` / `formatRechnungsnummer` — keeps call-sites readable.

### 6.2 Server: wire the function + transactional allocation <!-- implements AC-RECH-03, AC-RECH-04 -->

- **Red (unit, server)**: `apps/server/src/__tests__/services/nummerService.spec.ts` — given pre-seeded rows in `rechnungen`, `allocateNummer(db, year, month)` reads all `nummer`s in `year`, calls the shared function, and returns the next. Race-safety is delegated to the surrounding SQLite transaction Drizzle provides.
- **Green**: `apps/server/src/services/nummer.ts`.

### 6.3 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(rechnung): jaehrlicher rechnungsnummer-generator`.

---

## Phase 7: PDF template management

Decision locked in Risks: **`pdf-lib`** for both reading the user's uploaded template and overlaying text onto a fixed region (`pdfkit` cannot overlay on existing PDFs; we need that). `@pdf-lib/fontkit` for embedding a unicode font (German umlauts).

### 7.1 File-system layout abstraction

- **Red (unit, server)**: `apps/server/src/__tests__/paths/paths.spec.ts` — `paths(homeOverride)` returns `.templatesDir`, `.billsDir`, **`.timesheetsDir`**, `.dbPath`, each resolving to `join(homeOverride, <subdir>)`. `ensureDataDirs(paths)` creates **all four** entries (three dirs plus db-parent) and is idempotent. Uses `BEHANDLUNG_HOME` env var, falling back to `os.homedir() + '/.behandlungsverwaltung'`.
- **Green**: `apps/server/src/paths/index.ts`; also update `db/client.ts` to consume the same path resolver.

### 7.2 Upload mutation <!-- implements AC-TPL-01 -->

- **Red (unit, server)**: `apps/server/src/__tests__/schema/templates.spec.ts` — `uploadTemplate({ kind, auftraggeberId, base64, filename })` writes the file under `templatesDir`, inserts into `templateFiles`, returns the stored row. Re-upload with same `(kind, auftraggeberId)` replaces file + row (unique index).
- **Green**: mutation uses `Buffer.from(base64, 'base64')` → `Bun.write(path, bytes)`. Reject non-PDF by magic bytes `%PDF-`.
- **Refactor**: small `isPdf(bytes)` helper.

### 7.3 Resolve-template function <!-- implements AC-RECH-06, AC-RECH-07, AC-STD-03, AC-TPL-02 -->

- **Red (unit, server)**: `apps/server/src/__tests__/services/templates.resolve.spec.ts`:
  - Auftraggeber has a rechnung-template row → returns that path.
  - Auftraggeber has none, global rechnung fallback exists → returns global path.
  - Neither exists → throws `TemplateNotFoundError`.
  - Row exists but file on disk missing → throws `TemplateFileMissingError` (guides user to re-upload).
  - When the file on disk is modified between resolve calls, the next call **reads the updated bytes** (we never cache file contents). Locks AC-TPL-02.
- **Green**: `apps/server/src/services/templateResolver.ts`.

### 7.4 Web: template upload screen

- **Red (unit, web)**: `TemplateUploadPage.spec.tsx` — two file inputs (Rechnung / Stundennachweis), Auftraggeber selector (empty = global), submit reads file as base64 and calls `store.upload(...)`.
- **Green**: `apps/web/src/models/TemplateStore.ts`, `apps/web/src/pages/TemplateUploadPage.tsx`.

### 7.5 E2E <!-- implements AC-TPL-01 -->

- **Red (e2e)**: `apps/web/e2e/templates.e2e.ts` — use Playwright's `setInputFiles()` with a fixture PDF in `apps/web/e2e/fixtures/template-rechnung.pdf` (checked into repo, ~a few KB blank PDF). After upload, assert the file exists in the isolated `BEHANDLUNG_HOME/templates/` (use `fs.statSync` in a `test.afterEach` sanity check).
- **Green**: wire `FormData`/base64 as needed.

### 7.6 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(templates): upload and resolve per-auftraggeber templates with global fallback`.

---

## Phase 8: Rechnung erzeugen (Monatsrechnung, PDF, file persistence, duplicates)

### 8.1 Aggregation

- **Red (unit, server)**: `apps/server/src/__tests__/services/rechnungAggregation.spec.ts` — given seeded Behandlungen across two months and two Kinder, `collectBehandlungen(db, { year, month, kindId, auftraggeberId })` returns only matching rows, ordered by datum ascending. Empty result → service throws `KeineBehandlungenError` (surfaced to UI).
- **Green**: Drizzle query with `and()`.

### 8.2 Line math <!-- implements AC-RECH-02 -->

- **Red (unit, shared)**: `packages/shared/src/__tests__/rechnungMath.spec.ts` — `computeRechnungsLines([{ be: 3 }], stundensatzCents: 4500)` → `[{ be: 3, zeilenbetragCents: 13500 }]`; total sum helper agrees.
- **Green**: pure function in `packages/shared/src/domain/rechnungMath.ts`.

### 8.3 PDF render

- **Red (unit, server)**: `apps/server/src/__tests__/pdf/rechnungPdf.spec.ts`:
  - Takes a fixture template PDF, renders a Rechnung with 2 Behandlungen (each with a distinct `arbeitsthema`), returns `Uint8Array`. Parse bytes with `pdf-lib` again, assert:
    - Page count equals template page count (we draw onto page 0).
    - Extracted text (via `pdf-parse` in test-only dep) contains the Rechnungsnummer, each Datum in `dd.MM.yyyy`, each **Arbeitsthema** between Datum and BE (PRD §3.2 line format: "Datum · Arbeitsthema · BE · Einzelpreis · Gesamt"), each `X BE`, each `X,XX €`, the Gesamtsumme, and the USt-Befreiungstext `"Gemäß § 4 Nr. 14 UStG umsatzsteuerfrei"`. Locks AC-RECH-08.
    - No occurrence of "USt", "MwSt", "19%" except the § 4 exemption sentence. Locks AC-RECH-08 negative side.
- **Green**: `apps/server/src/pdf/rechnungPdf.ts`:
  - Load template, pick page 0, draw text at fixed coordinates under the Briefkopf (decide once, e.g. `{ x: 50, y: page.getHeight() - 180 }` for the Anschrift block; table below). Centralise layout constants in `apps/server/src/pdf/layout.ts`.
  - Embed a unicode TrueType font shipped inside the binary (`apps/server/src/pdf/fonts/DejaVuSans.ttf`). Loaded via `Bun.file()` + fontkit.
- **Refactor**: separate "draw header", "draw address block", "draw line table", "draw totals", "draw USt hint" to keep the render function readable.

### 8.4 Filename + persistence <!-- implements AC-RECH-09 (updated) -->

- **Red (unit, server)**: `apps/server/src/__tests__/services/rechnungService.spec.ts` — full flow for Kind "Anna Musterfrau", Auftraggeber "Jugendamt Köln": creates rechnung row, writes PDF to `paths.billsDir/2026-04-0001-Anna_Musterfrau.pdf` (filename = `YYYY-MM-NNNN-<sanitizeKindesname(vorname, nachname)>.pdf`, per updated AC-RECH-09), updates row with `dateiname`, inserts one `rechnungBehandlungen` snapshot per Behandlung including **`snapshotArbeitsthema`**, `snapshotDate`, `snapshotBe`, `snapshotZeilenbetragCents`. Re-running with same `(year, month, kindId, auftraggeberId)` → throws `RechnungExistiertError` (unique index) — the handler translates this to a GraphQL error with code `DUPLICATE_RECHNUNG`. Locks AC-RECH-05 backend side.
- **Green**: `apps/server/src/services/rechnungService.ts`.

### 8.5 GraphQL mutation

- **Red (unit, server)**: schema spec — `createMonatsrechnung(input)` returns Rechnung + dateiname; dup returns `DUPLICATE_RECHNUNG`.
- **Green**: resolver delegates to service.

### 8.6 Web: Monatsrechnung screen

- **Red (unit, web)**: `RechnungCreatePage.spec.tsx` — month/year picker (default current month), Kind picker, Auftraggeber picker filtered to those linked via Therapie to that Kind, submit button. On duplicate error, a confirm dialog appears with message "Für diesen Monat wurde bereits eine Rechnung erzeugt. Nochmal?" and `data-testselector="duplicate-confirm"`; in v1 we just **warn** and stop — user can delete the file manually. Locks AC-RECH-05 UX side.
- **Green**: component + `RechnungStore`.

### 8.7 E2E happy path <!-- implements AC-RECH-01, AC-RECH-09, UC-3.2 -->

- **Red (e2e)**: `apps/web/e2e/uc-3.2-rechnung.e2e.ts` — seed Kind "Anna Musterfrau", Auftraggeber "Jugendamt Köln" with stundensatz=45€, Therapie with `arbeitsthema="Mathe-Grundlagen"`, 3 Behandlungen in April 2026 with BE=2 each, upload a template fixture. Open Rechnung-create, choose April 2026, submit. Assertions:
  - success toast `Rechnung erstellt: 2026-04-0001`
  - `fs.existsSync(paths.billsDir + '/2026-04-0001-Anna_Musterfrau.pdf')` in `afterEach` (via helper `readIsolatedBillsDir()`)
  - generated PDF parsed with `pdf-parse` contains total `270,00 €` (3 × 2 × 45) and "Mathe-Grundlagen" on every line (§3.2 line format)
  - Rechnungsübersicht row shows nummer `2026-04-0001` and Gesamtsumme `270,00 €`
  - **Field readback** via GraphQL: `rechnungen { nummer jahr monat kindId auftraggeberId stundensatzCentsSnapshot gesamtCents dateiname rechnungBehandlungen { snapshotDate snapshotBe snapshotArbeitsthema snapshotZeilenbetragCents } }` — assert `stundensatzCentsSnapshot=4500`, `gesamtCents=27000`, `dateiname="2026-04-0001-Anna_Musterfrau.pdf"`, three `rechnungBehandlungen` rows each with `snapshotBe=2`, `snapshotArbeitsthema="Mathe-Grundlagen"`, `snapshotZeilenbetragCents=9000`.

### 8.8 E2E duplicate warning <!-- implements AC-RECH-05 -->

- **Red (e2e)**: after the first Rechnung is created, try to create it again → duplicate dialog appears.

### 8.9 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(rechnung): generate monthly invoice pdf with duplicate detection`.

---

## Phase 9: Stundennachweis

### 9.1 Layout spec <!-- implements AC-STD-02 -->

- **Red (unit, server)**: `apps/server/src/__tests__/pdf/stundennachweisPdf.spec.ts` — render, parse with `pdf-parse`, assert the header row text appears in the order `Datum`, `BE`, `Leistung`, `Unterschrift` (substring index check). Assert N empty body rows (N = 20, say). Assert a prefilled header line contains Kind, Auftraggeber, Monat.
- **Green**: `apps/server/src/pdf/stundennachweisPdf.ts` — draw 20 table rows of empty cells, fixed width per column.

### 9.2 Template resolution + service <!-- implements AC-STD-03 -->

- **Red (unit, server)**: extend `services/stundennachweisService.spec.ts` — uses the same `templateResolver` with `kind='stundennachweis'`; per-Auftraggeber wins, else global.
- **Green**: implement.

### 9.3 Shared Rechnungsnummer + filename <!-- implements AC-STD-04 -->

- **Red (unit, server)**: `services/stundennachweisService.spec.ts` — given a rechnung with `nummer='2026-04-0001'` and Kind "Anna Musterfrau", file is written under **`paths.timesheetsDir`** (not `billsDir`, per PRD §3.3) as `2026-04-0001-Anna_Musterfrau.pdf`; with "Björn Über-Meier" becomes `..._Bjoern_Ueber_Meier.pdf`.
- **Green**: reuses `sanitizeKindesname` from shared; `stundennachweisService` writes via `Bun.write(paths.timesheetsDir + '/' + filename, bytes)`.

### 9.4 Web

- **Red (unit, web)**: `StundennachweisPage.spec.tsx` — same selectors as Rechnung (Kind, Auftraggeber, Monat), "Stundennachweis drucken" button, calls store; success → toast with filename.
- **Green**: implement.

### 9.5 E2E <!-- implements AC-STD-01, UC-3.3 -->

- **Red (e2e)**: `apps/web/e2e/uc-3.3-stundennachweis.e2e.ts` — seed an existing Rechnung for April 2026 (Kind "Anna Musterfrau") + upload a stundennachweis template fixture. Open Stundennachweis page, submit with Kind + Auftraggeber + Monat. Assertions:
  - success toast `Stundennachweis erstellt`
  - file `2026-04-0001-Anna_Musterfrau.pdf` exists in isolated **`paths.timesheetsDir`** (not `billsDir`)
  - parsed PDF contains prefilled Kopf with Kind + Auftraggeber + Monat
  - table header row reads "Datum · BE · Leistung · Unterschrift" in that order (AC-STD-02)
  - body rows are empty.

### 9.6 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(stundennachweis): blank timesheet pdf sharing rechnungsnummer`.

---

## Phase 10: Rechnungsübersicht

### 10.1 Server: list + filter query

- **Red (unit, server)**: `apps/server/src/__tests__/schema/rechnungen.query.spec.ts` — `rechnungen(filter: { year, month, kindId, auftraggeberId })` returns matching ordered by `nummer` desc; unfiltered returns all; also exposes `dateiname` and related Kind/Auftraggeber.
- **Green**: implement.

### 10.2 Server: download endpoint

- GraphQL can't stream large binaries well; expose a small non-GraphQL route inside yoga's server: `GET /bills/:filename` → `Bun.file(paths.billsDir + '/' + basename(filename))`, 404 if not found, sanitise to prevent path traversal. Add unit test `apps/server/src/__tests__/http/billsRoute.spec.ts`.

### 10.3 Web: `RechnungListPage`

- **Red (unit, web)**: `RechnungListPage.spec.tsx` — filter inputs (Kind, Monat, Auftraggeber) drive the query; rows with download links.
- **Green**: implement; download link = `/bills/<dateiname>` → browser download.

### 10.4 E2E <!-- implements UC-3.4 -->

- **Red (e2e)**: `apps/web/e2e/uc-3.4-rechnungsuebersicht.e2e.ts` — seed three Rechnungen (2026-04-0001 Kind "Anna Musterfrau", 2026-04-0002 Kind "Ben Beispiel", 2026-05-0003 Kind "Anna Musterfrau"). Open Übersicht, filter `Kind = "Anna Musterfrau"` → assert exactly two rows with nummern `2026-04-0001` and `2026-05-0003`. Click "PDF" on `2026-04-0001`; Playwright `page.waitForEvent('download')` → assert filename is `2026-04-0001-Anna_Musterfrau.pdf` and byte length > 0.

### 10.5 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(rechnung): uebersicht mit filter und download`.

---

## Phase 11: App-Bootstrap / directory creation <!-- implements AC-SYS-01 -->

Much of this landed in Phase 7.1; this phase makes it a user-visible guarantee.

### 11.1 Server bootstrap

- **Red (unit, server)**: `apps/server/src/__tests__/bootstrap.spec.ts` — given `BEHANDLUNG_HOME` pointing at a non-existent temp dir, calling `bootstrap()` creates `app.db`, `templates/`, `bills/`, **`timesheets/`**. Re-running is idempotent.
- **Green**: implement `apps/server/src/bootstrap.ts` using the Phase 7.1 `paths` + `ensureDataDirs` + `createAndMigrateDb`. Have `src/index.ts` and `src/standalone.ts` call it.

### 11.2 Standalone binary behaviour

- **Red (unit, server)**: bootstrap test covers this; add an explicit assertion that `paths()` with no overrides resolves to `os.homedir() + '/.behandlungsverwaltung'` on non-Windows.
- **Green**: implement.

### 11.3 E2E <!-- implements AC-SYS-01 -->

- **Red (e2e)**: `apps/web/e2e/bootstrap.e2e.ts` — dedicated project-level test that points `BEHANDLUNG_HOME` at a freshly-empty dir (`e2e-data/<uuid>/`), the webServer starts, the home page loads, and the **four** filesystem entries exist (`app.db`, `templates/`, `bills/`, `timesheets/`). Note: this test must run with its own `webServer` restart because it deliberately starts from an empty dir — use Playwright `test.describe.configure({ mode: 'serial' })` and a shared `globalSetup` that prepares the dir.

### 11.4 Commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(bootstrap): auto-create home data directory on first run`.

---

## Phase 12: PWA polish, offline, standalone binary integration

### 12.1 PWA already partially present (Phase 0). Verify + extend

- **Red (unit, web)**: `apps/web/src/__tests__/pwa/manifest.spec.ts` — `public/manifest.webmanifest` parses, has `display: standalone`, icons 192 / 512, `theme_color`, `background_color`. Verify service worker registration in `main.tsx`.
- **Green**: adjust manifest if needed.

### 12.2 Offline read-only

- The server is local; there is no "offline" vs "online" split at the binary level. For the PWA scenario (device without the binary), the service worker caches the shell so navigation still works; GraphQL mutations fail loudly. Document in `README.md` that offline v1 is read-only shell, full offline is out of scope.
- **Red (unit, web)**: a tiny test that the service worker precaches `/`, `/manifest.webmanifest`, and the built `assets/*` glob.
- **Green**: extend the existing `sw.js`.

### 12.3 Standalone binary integration check

- Manual (documented) post-CI step: run `bun run build:standalone:ci`, execute the binary with `BEHANDLUNG_HOME=$(mktemp -d)`, `curl http://localhost:4000/graphql -d '{"query":"{ kinder { id } }"}'` — should return `[]`. Capture as a bash script `scripts/smoke-standalone.sh` (read-only — no writes outside the temp dir).
- **Red (unit, script)**: none (shell script). Instead add a CI workflow job that runs `scripts/smoke-standalone.sh` on the built artifact.
- **Green**: wire it up.

### 12.4 Final commit gate

- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`; commit `feat(pwa): manifest/service-worker polish and standalone smoke test`.

---

## AC coverage matrix (every PRD §9 AC appears exactly once)

- AC-KIND-01: Phase 2.5 e2e
- AC-KIND-02: Phase 2.1 server + Phase 2.4 web form test
- AC-KIND-03: Phase 2.5 e2e (edit scenario)
- AC-AG-01: Phase 3.3 e2e
- AC-AG-02: Phase 3.1 server
- AC-AG-03: Phase 3.1 server (PLZ branch)
- AC-TH-01: Phase 4.1 server + Phase 4.3 web form test (UI echo)
- AC-TH-02: Phase 4.4 e2e
- AC-BEH-01: Phase 5.5 e2e
- AC-BEH-02: Phase 5.1 server
- AC-BEH-03: Phase 5.2 server + Phase 5.3 web (Arbeitsthema Vorbelegung from Therapie)
- AC-RECH-01: Phase 8.7 e2e
- AC-RECH-02: Phase 8.2 shared math
- AC-RECH-03: Phase 6.1 shared + Phase 6.2 server
- AC-RECH-04: Phase 6.1 shared + Phase 6.2 server
- AC-RECH-05: Phase 8.4 (server dup) + Phase 8.6/8.8 (UI + e2e)
- AC-RECH-06: Phase 7.3 resolver
- AC-RECH-07: Phase 7.3 resolver
- AC-RECH-08: Phase 8.3 PDF render (USt-text present, no USt-Ausweis)
- AC-RECH-09: Phase 8.4 filename `YYYY-MM-NNNN-<Vorname_Nachname>.pdf` + Phase 8.7 e2e
- AC-STD-01: Phase 9.5 e2e (file in `timesheets/`)
- AC-STD-02: Phase 9.1 PDF test (table columns in order)
- AC-STD-03: Phase 9.2 template resolver test
- AC-STD-04: Phase 9.3 filename test
- AC-TPL-01: Phase 7.2 server + Phase 7.5 e2e
- AC-TPL-02: Phase 7.3 resolver test (file re-read without DB copy)
- AC-SYS-01: Phase 7.1 paths (4 dirs incl. `timesheets/`) + Phase 11.1/11.3 bootstrap test + e2e

---

## UC coverage matrix (PRD §10 Gherkin → Playwright e2e)

Every Gherkin scenario in PRD §10 maps 1:1 to a Playwright spec. Each UC file contains **all** scenarios from its Gherkin feature (happy + edge).

| UC     | Spec file                                        | Phase     | Scenarios covered                                          |
| ------ | ------------------------------------------------ | --------- | ---------------------------------------------------------- |
| UC-3.1 | `apps/web/e2e/uc-3.1-schnellerfassung.e2e.ts`    | 5.5       | Vorbelegung + Override                                     |
| UC-3.2 | `apps/web/e2e/uc-3.2-rechnung.e2e.ts`            | 8.7 + 8.8 | Happy April 2026 + Duplicate-Warnhinweis                   |
| UC-3.3 | `apps/web/e2e/uc-3.3-stundennachweis.e2e.ts`     | 9.5       | Happy (file in `timesheets/`)                              |
| UC-3.4 | `apps/web/e2e/uc-3.4-rechnungsuebersicht.e2e.ts` | 10.4      | Filter + Download                                          |
| UC-3.5 | `apps/web/e2e/uc-3.5-kind.e2e.ts`                | 2.5       | Happy (all 8 fields) + Edit + PLZ-Pflicht-Edge             |
| UC-3.6 | `apps/web/e2e/uc-3.6-auftraggeber.e2e.ts`        | 3.3       | Firma-Happy + Person-ohne-Namen-Edge                       |
| UC-3.7 | `apps/web/e2e/uc-3.7-therapie.e2e.ts`            | 4.4       | Happy (incl. arbeitsthema) + Sonstiges-ohne-Kommentar-Edge |

## Database-field e2e coverage rule

**No persisted database column may be without e2e coverage.** Every happy-path UC e2e ends with a GraphQL query in `afterEach` that fetches the persisted entity and asserts **every column** equals the typed input byte-for-byte. This is the binding reading of the user's rule "no single data in the database is without e2e coverage" and is enforced spec-by-spec in the Phase-level descriptions above (2.5, 3.3, 4.4, 5.5, 8.7).

---

## Risks & decisions

### R1 — PDF library: `pdf-lib` + `@pdf-lib/fontkit`

We must **overlay** text onto the user's existing template PDF. `pdfkit` creates new PDFs but cannot mutate an existing one; `pdf-lib` explicitly supports `PDFDocument.load(bytes)` and `page.drawText(...)`, plus font embedding. Add:

- runtime deps: `pdf-lib`, `@pdf-lib/fontkit`
- test-only dep: `pdf-parse` to extract text in assertions
- ship a unicode TTF (DejaVu Sans) under `apps/server/src/pdf/fonts/` and embed via `@pdf-lib/fontkit`. Size acceptable for the standalone binary (<1 MB).

### R2 — Rendering a Vite-built PWA inside the Bun standalone binary

Already solved in Phase 0 via `scripts/generate-static-manifest.ts` + `apps/server/src/generated/staticFiles.ts` + `standalone.ts` SPA fallback. No action. **Write permission** to the home dir is the only new requirement added by the PDF/template work; `standalone.ts` already calls `mkdirSync(dataDir, { recursive: true })`. Phase 7.1's `ensureDataDirs` replaces that in-situ logic with the shared `paths` helper so tests and production share one code path.

### R3 — Playwright test isolation: per-run `app.db` / `templates/` / `bills/`

Strategy (implement during Phase 2.5, refine in Phase 7/8):

- Add `apps/web/e2e/globalSetup.ts` — creates `apps/web/e2e-data/<runId>/` (runId from `crypto.randomUUID()`), exports as `BEHANDLUNG_HOME` via `process.env` **and** writes it to `apps/web/e2e/.e2e-env.json` so the page-object helpers + `playwright.config.ts.webServer.env` can read it.
- Extend `playwright.config.ts`: add `globalSetup: require.resolve('./e2e/globalSetup')`, set `webServer.env = { BEHANDLUNG_HOME, DB_PATH: join(BEHANDLUNG_HOME, 'app.db') }`.
- Add `globalTeardown.ts` — `fs.rmSync(BEHANDLUNG_HOME, { recursive: true, force: true })` unless `PWDEBUG=1`.
- Seed helper `apps/web/e2e/helpers/seed.ts` exposes `seedKind`, `seedAuftraggeber`, `seedTherapie`, `seedBehandlung`, `uploadTemplate` — each posts to `http://localhost:4000/graphql` directly. Specs call these in `test.beforeEach`; this keeps UI tests focused on UI behaviour.
- Per-test isolation inside one run: before each test, delete all rows from the five tables via a dedicated `__test_reset` mutation that only exists when `BEHANDLUNG_TEST_MODE=1` is set (the globalSetup sets this). Locked behind an env check so it cannot leak into production binaries.

### R4 — Race on Rechnungsnummer allocation

Two concurrent `createMonatsrechnung` calls could both read the same max and produce duplicates. Mitigation: allocate + insert inside a single Drizzle sqlite transaction; the unique constraint on `nummer` is the backstop. Since the app is single-user, this is belt-and-braces. Unit test in Phase 6.2 asserts correctness of single-threaded path; concurrency test deferred.

### R5 — PDF layout coordinates vs. arbitrary user templates

Users pick their own Briefkopf height. v1: layout constants assume standard German DIN briefkopf ending at ~120 mm from top. Expose a per-Auftraggeber `templateOffsetTopMm` field later if required. Not in AC list → out of scope for v1; noted in the README and in `layout.ts` comments.

### R6 — Euro rounding

Storage in integer cents. Line compute = `be * stundensatzCents` → exact. Sum = integer addition → exact. Formatting via `Intl.NumberFormat` — no `toFixed` games.

### R7 — Filename sanitization

Shared `sanitizeKindesname` plus a property-test-style unit suite that throws random Unicode at it and asserts output matches `/^[A-Za-z0-9_]+$/`. Otherwise a name like `O'Brien` could break the filesystem on Windows.

### R8 — Duplicate Rechnung: warn vs. hard-block

PRD AC-RECH-05 says "warn before a duplicate". UX: first call fails with `DUPLICATE_RECHNUNG`, UI opens a confirm dialog; v1 still **does not regenerate** (to avoid overwriting archived PDFs). We simply offer an "Open existing" link. Documented in the UI copy; unit-tested in Phase 8.6.

---

## Definition of Done for the whole project

- All 26 ACs from PRD §9 have at least one corresponding test (unit or e2e per their tag) and the tests are passing in `bun run test:ci` / `bun run e2e`.
- `bun run ci` (lint → typecheck → test:ci → standalone build) passes.
- The standalone binary creates `~/.behandlungsverwaltung/{app.db,templates/,bills/}` on a fresh machine and serves the PWA at `http://localhost:4000`.
- `implementationplan.md` has every phase checkmarked.
