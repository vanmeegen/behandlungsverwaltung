# Plan: Rewrite Web UI with MUI + Harden E2E Against the Swap

## Context

`AGENTS.md` declares Material-UI as the intended component library ("React 18 + MobX … and mui (material-ui)"), but the Phase 0–12 implementation shipped with plain semantic HTML and zero styling. The app now needs to be restyled to MUI to fulfill the architectural spec and the PRD's mobile-first requirement (bedienbar auf dem Handy, 44 px tap targets).

Scope: 19 .tsx files (~1 700 LoC) across `apps/web/src/pages` + `apps/web/src/components`, plus 12 page-object classes and 8 spec files in `apps/web/e2e`. State, routing, GraphQL and PDF generation all stay untouched — this is a presentation-layer rewrite only.

E2E tests are already in good shape: 100 % `data-testselector` selectors, full page-object coverage. The MUI swap still breaks a handful of Playwright interactions (`selectOption`, native date/month `.fill()`, file input nested in a label), so we take the opportunity to push MUI-specific details _down into the page objects_ so spec files stay identical.

## Decisions (confirmed with user)

- **Date inputs**: `@mui/x-date-pickers` with `dayjs` adapter. Tests interact via page-object helpers that know the formatted display value.
- **App shell**: MUI `AppBar` + responsive `Drawer` (temporary on xs/sm, permanent on ≥md).
- **Rollout**: single PR, all pages at once.
- **Baseline**: `CssBaseline` + `@fontsource/roboto` (local, offline-friendly).
- **Constraints carried over from `AGENTS.md`**: no new React state hooks (MobX only), preserve every `data-testselector`, keep ARIA roles, presentation-model separation stays intact.

## Dependencies to add (`apps/web/package.json`)

```
@mui/material                 ^5
@mui/icons-material           ^5
@mui/x-date-pickers           ^7
@emotion/react                ^11
@emotion/styled               ^11
@fontsource/roboto            ^5
dayjs                         ^1
```

No server-side changes. Dev deps unchanged.

## Testid plumbing rule (one-line primer)

MUI components that wrap an input need the selector on the _inner_ input, not the root, so `.fill()` / `.click()` in Playwright still hit the interactive node:

| Component                                        | Where the testid goes                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `Button`, `IconButton`                           | root `data-testselector="…"`                                               |
| `TextField`                                      | `slotProps={{ htmlInput: { 'data-testselector': '…' } }}`                  |
| `Select` (non-native)                            | `slotProps={{ input: { 'data-testselector': '…' } }}` + one per `MenuItem` |
| `Radio`                                          | `inputProps={{ 'data-testselector': '…' }}` on each `<Radio>`              |
| `Checkbox`                                       | same as `Radio`                                                            |
| `DatePicker`                                     | `slotProps={{ textField: { inputProps: { 'data-testselector': '…' } } }}`  |
| file `<input>` inside `Button component="label"` | keep native `<input type="file" hidden data-testselector="…">`             |

Root `data-testselector` values on sections, forms, tables, rows, alerts, empty states all stay unchanged.

## Files to modify

### New files

- `apps/web/src/theme.ts` — `createTheme({ palette: { primary: { main: '#0f766e' } }, shape, components: { MuiButton: { defaultProps: { variant: 'contained' } }, … } })`. Sets 44 px minimum button height (`MuiButtonBase: { styleOverrides: { root: { minHeight: 44 } } }`) and touch-friendly input sizing. Exports `theme`.
- `apps/web/src/components/AppShell.tsx` — `observer` wrapper around `AppBar` + responsive `Drawer` (temporary below `md`, permanent above). Toggle state lives in a small MobX `UiStore` (new) — _not_ `useState`, per the no-hooks rule. Renders `<Outlet />` inside `<Container maxWidth="md">`.
- `apps/web/src/models/UiStore.ts` — observable `drawerOpen: boolean` with `toggle()`/`close()` actions. Instantiated once in `App.tsx`.

### Wired at the root

- `apps/web/src/main.tsx` — wrap `<App />` with `<ThemeProvider theme={theme}>`, `<CssBaseline />`, `<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">`. Import `@fontsource/roboto/{300,400,500,700}.css`.
- `apps/web/src/App.tsx` — switch to nested routing so `<AppShell>` is a layout route wrapping every child route.

### Pages (presentation-only rewrite, keep every `data-testselector`)

1. `pages/Hello.tsx` → `Typography` + `Box`.
2. `pages/KindListPage.tsx` / `components/KindList.tsx` → MUI `List`/`ListItemButton` using `Link` as component (tap-target friendly).
3. `pages/KindFormPage.tsx` / `components/KindForm.tsx` → `Stack` of `TextField`s, `FormHelperText` for errors, `Button` submit.
4. `pages/KindDetailPage.tsx` → `Card` + `CardContent` + list sections.
5. `pages/AuftraggeberListPage.tsx` / `components/AuftraggeberList.tsx` → same list pattern as Kind.
6. `pages/AuftraggeberFormPage.tsx` / `components/AuftraggeberForm.tsx` → `RadioGroup` for typ, conditional `TextField` blocks, plain `TextField` with `inputMode="decimal"` for `stundensatz`.
7. `pages/AuftraggeberDetailPage.tsx` → `Card`.
8. `pages/TherapieListPage.tsx` / `components/TherapieList.tsx` → list pattern.
9. `pages/TherapieFormPage.tsx` / `components/TherapieForm.tsx` → three MUI `Select`s (kind / auftraggeber / form) + `TextField`s, conditional `arbeitsthema` visibility preserved.
10. `pages/SchnellerfassungPage.tsx` → kind+therapie `Select`s (portal menus), `BeStepper`, `DatePicker` for `datum`, `TextField` for `arbeitsthema`.
11. `components/BeStepper.tsx` → swap the two native buttons for `IconButton` + `Remove`/`Add` icons, wrap in a `Paper` or `Stack`. The span stays `aria-live="polite"`.
12. `pages/TemplateUploadPage.tsx` → MUI `Select`s + "Upload" `Button component="label"` with a hidden native `<input type="file" hidden data-testselector="…">`.
13. `pages/RechnungCreatePage.tsx` → `DatePicker` with `views={['month','year']}` for Monat, `Select`s for Kind/Auftraggeber, `Button` submit, success `Alert` replaces `<p role="status">`.
14. `pages/RechnungListPage.tsx` → `DatePicker` month filter + two `Select`s; the data table becomes MUI `Table` (`TableContainer`/`Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`). PDF cell uses `Button` with `component="a"` and `href`/`download`.
15. `pages/StundennachweisPage.tsx` → month `DatePicker` + two `Select`s + `Button`.

Every `<p role="alert">` / `<p role="status">` becomes `<Alert severity="error|success" role="alert|status" data-testselector="…">`, preserving both the role and the testid.

### Utility

- `apps/web/src/utils/monthFormat.ts` (new) — `toYearMonth(dayjs) -> {year, month}` and `fromYearMonth(year, month) -> dayjs`, to keep stores free of dayjs. Invoice/timesheet stores already store `year`/`month` as integers — this helper converts at the component boundary only.

## E2E test changes

Specs (`apps/web/e2e/*.e2e.ts`) are not expected to change — the page-object API is preserved. All MUI-specific interactions are encapsulated inside page objects.

### Page-object updates

- **New helper**: `apps/web/e2e/pages/support/muiHelpers.ts`
  - `selectMui(page, rootLocator, optionTestId)` — clicks the Select, waits for the listbox, clicks the `MenuItem` with the matching testid. Replaces every `selectOption(id)` call.
  - `fillMuiDate(locator, iso)` — focuses the DatePicker input, clears, types in `DD.MM.YYYY` format (German locale) derived from the ISO value.
  - `fillMuiMonth(locator, {year, month})` — same idea for month-only pickers (`MM/YYYY`).
- **Affected page objects (update only the interaction methods, not the API)**:
  - `pages/SchnellerfassungPage.ts` — `selectKind`, `selectTherapie` → `selectMui`; add `fillDatum(iso)`.
  - `pages/TherapieFormPage.ts` — `fill()` swaps three `selectOption`s for `selectMui`.
  - `pages/RechnungCreatePage.ts` — `fillMonat` uses `fillMuiMonth`; `selectKind`/`selectAuftraggeber` use `selectMui`.
  - `pages/RechnungListPage.ts` — `filterByKind` uses `selectMui`; add `filterByMonat` that uses `fillMuiMonth`.
  - `pages/StundennachweisPage.ts` — mirror of RechnungCreate.
  - `pages/TemplateUploadPage.ts` — `selectMui` for both selects; `setInputFiles` still works because the testid stays on the hidden native input.
  - `pages/AuftraggeberFormPage.ts` — `setTypFirma()` / `setTypPerson()` now click an `<input type="radio">` owned by `Radio`; `.click()` still works. No wrapper helper needed.
- **Spec-level hardening** (per user's "make tests more stable" ask):
  - Add a single `expect(page.getByRole('heading', { name: /.../i })).toBeVisible()` assertion at the top of each spec's first test to smoke-check the route rendered, alongside the existing testid assertions. Keeps tests MUI-theme-agnostic but catches whole-route regressions.
  - Replace any assertion that checks structural counts on table rows with `getByTestId('rechnung-row-…')` counts (already the pattern — audit for any stragglers).
- **What we deliberately do NOT do**: switch specs to `getByRole`/`getByLabel` wholesale. That would duplicate the coverage we already have via testids without adding signal, and the AGENTS.md conventions explicitly prescribe testid-only specs.

### Vitest (`apps/web/**/__tests__/*.spec.tsx`)

Component tests currently render components directly; wrap each render helper with `ThemeProvider` + `LocalizationProvider` (single shared `renderWithProviders` utility in `src/__tests__/setup.tsx`). Assertions by testid keep working.

## Key files to reference during implementation

- `apps/web/src/App.tsx:1` — current flat routing, needs a layout route.
- `apps/web/src/pages/RechnungListPage.tsx:107` — only real table, biggest MUI structural change.
- `apps/web/src/pages/SchnellerfassungPage.tsx:62` — most interaction-heavy page (two Selects + DatePicker + Stepper).
- `apps/web/src/components/AuftraggeberForm.tsx:49` — radio group + conditional subtrees pattern.
- `apps/web/e2e/pages/TherapieFormPage.ts:49` — three `selectOption` calls that must move to `selectMui`.
- `apps/web/playwright.config.ts` — no change; `testIdAttribute: 'data-testselector'` stays.
- `apps/web/vite.config.ts` — no change (MUI Just Works with Vite).

## Verification

1. `bun install` — confirms new deps resolve.
2. `bun run typecheck` — picks up any missed `slotProps` / `inputProps` typing.
3. `bun run lint` — ESLint react/a11y rules.
4. `bun run test` — Vitest component tests green under new providers.
5. `bun run dev` + manual smoke on a phone-sized viewport:
   - Drawer toggles; all 12 routes reachable.
   - A `Kind`, an `Auftraggeber`, a `Therapie` can be created from empty state.
   - Schnellerfassung can log a Behandlung; BeStepper ±.
   - Rechnung creation downloads a PDF; Rechnungsübersicht filters by month and Kind.
   - Stundennachweis generates a PDF.
6. `bun run e2e` — full Playwright suite (8 spec files) green end-to-end.
7. `bun run build && bun run preview` — verifies production build size/tree-shaking.
8. `bun run build:standalone:ci` — the single-file binary still links (critical: embedded assets list must pick up emotion/MUI chunks).
9. `bun run ci` — the final gate before commit, same script CI runs.

## Out of scope

- No changes to GraphQL schema, Drizzle tables, PDF rendering, service worker, or the standalone build script.
- No new features — this is a pure presentation rewrite.
- No test framework migration; Playwright + Vitest stay as-is.
