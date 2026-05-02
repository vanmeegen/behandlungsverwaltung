# Design Plan — Match `behandlungsverwaltung` to `birgit-friedrich.de`

Goal: restyle the in-house treatment-management app so it visually feels like a
back-office continuation of the public practice site `bewegtes Lernen`
(<https://www.birgit-friedrich.de/>). The look must read as the same brand —
calm, humanist, professional, child-friendly — without losing the dense data
ergonomics the app needs.

---

## 1. Design audit — `bewegtes Lernen`

| Aspect            | Observation                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Brand             | Therapeutic practice for children — learning therapy, attention, resilience, family coaching.          |
| Mood              | Warm + professional, airy, calming, hopeful.                                                           |
| Color anchor      | Soft, muted/dusty blue (logo + photo accents).                                                         |
| Backgrounds       | White / off-white throughout. Very little chrome.                                                      |
| Text              | Dark gray / charcoal — never pure black.                                                               |
| Typography        | Humanist sans-serif. Regular to medium weight. Headlines are not heavy.                                |
| Imagery           | Full-color natural-light photography of practitioner with children.                                    |
| Layout rhythm     | Generous white space, clear section breaks, breathing room.                                            |
| Interactive cues  | Plain text links, expand/collapse `+ mehr / − weniger` toggles, mailto CTAs.                           |
| Navigation        | `bewegtes Lernen` (logo) · Mein Angebot · Über mich · Preise · Kontakt — top bar, hamburger on mobile. |
| Decoration        | Minimal — no heavy borders, no neon, no gradients. Soft shadows at most.                               |
| Personality words | _bewegt_, _stärkt_, _leichter_ — movement, strength, ease.                                             |

The brand is **not** clinical-cold. It's **soft-professional**: a doctor's
office that feels like a sunlit living room.

## 2. Current app state

- MUI 5 with `theme.ts`: `primary #0f766e` (saturated teal), `secondary #0369a1`
  (sky blue), `borderRadius: 8`, Roboto.
- Layout: `AppBar` (top, primary-filled) + permanent `Drawer` 260 px on
  desktop / temporary on mobile + `Container maxWidth="md"`.
- 9 navigation entries — Behandlungen, Kinder, Auftraggeber, Therapien,
  Vorlagen, Rechnung erstellen, Rechnungsübersicht, Rechnungen herunterladen,
  Stundennachweis.
- All forms/lists already MUI-based (per `muiupdateplan.md`).

Gap to close:

1. Saturated **teal** primary → **dusty blue** to match the logo family.
2. **Roboto** (geometric/neutral) → **humanist sans** (Source Sans 3, Inter,
   or Nunito Sans) — friendlier, closer to the website's character.
3. The teal-filled `AppBar` reads as "enterprise admin tool" — the website's
   top is white. Switch to a **white app bar with a soft bottom border** and
   the brand name in dusty blue, so the chrome disappears the way it does on
   the site.
4. Larger headline sizes, lighter weight, more vertical rhythm.

## 3. Design tokens (proposed)

### 3.1 Color

| Token                        | Value     | Usage                                             |
| ---------------------------- | --------- | ------------------------------------------------- |
| `palette.primary.main`       | `#5B8FB8` | Dusty blue — buttons, links, active nav.          |
| `palette.primary.dark`       | `#3F6F95` | Hover/active states.                              |
| `palette.primary.light`      | `#A9C5DC` | Subtle surfaces (selected row, hover bg).         |
| `palette.secondary.main`     | `#7BA7BC` | Soft teal-blue accent — info, secondary buttons.  |
| `palette.background.default` | `#FAFBFC` | Page background — almost white, slight cool tint. |
| `palette.background.paper`   | `#FFFFFF` | Cards, app bar, drawer.                           |
| `palette.text.primary`       | `#2C3E50` | Body — charcoal, never pure black.                |
| `palette.text.secondary`     | `#5A6C7D` | Helper text.                                      |
| `palette.divider`            | `#E5EAF0` | Hairlines, drawer/app-bar borders.                |
| `palette.success.main`       | `#6B9E78` | Sage — keeps the warm-soft tone family.           |
| `palette.error.main`         | `#C46B6B` | Muted brick, not bright red.                      |
| `palette.warning.main`       | `#D4A574` | Warm sand.                                        |

These are tuned to (a) sit on the same hue as the practice logo, and (b) keep
WCAG AA contrast on white (verify primary on white ≥ 4.5:1; bump `primary.dark`
if needed).

### 3.2 Typography

- Add `@fontsource/source-sans-3` (already humanist, very close to the site's
  feel; alternative: `@fontsource/inter` or `@fontsource/nunito`). Roboto stays
  as fallback.
- `typography.fontFamily`: `'"Source Sans 3", "Inter", "Roboto", "Helvetica", "Arial", sans-serif'`.
- Headline weights drop from 700 default → **500** (medium) for `h1`–`h4`,
  matching the site's understated headlines.
- Sizes: `h1 32px / h2 26px / h3 22px / h4 18px / body1 16px / body2 14px`.
- `body1.lineHeight: 1.6` — matches the site's airy reading rhythm.
- `letterSpacing` slightly negative (`-0.005em`) on headlines for the modern
  look, neutral on body.

### 3.3 Shape & elevation

- `shape.borderRadius: 10` (was 8) — softer.
- Cards/papers: `borderRadius 12`, `border: 1px solid divider`,
  `boxShadow: 0 1px 2px rgba(20,40,80,.04)` — barely-there shadow so the layout
  reads as "paper on a clean desk" not "Material card".
- Buttons: `textTransform: 'none'` (the site never SHOUTS in caps), keep 44 px
  min-height for touch.

### 3.4 Spacing

- Keep MUI's 8-px base.
- `Container` widens from `md` (900 px) → `lg` (1200 px) so dense data tables
  (Rechnungsübersicht) breathe like the website's layout does.
- Default page padding: `py: 4` (was `py: 3`).
- Section gaps inside pages: `Stack spacing={3}` minimum.

## 4. App-shell rework

The single highest-impact change.

| Element      | Before                                          | After                                                                                                                                                                    |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppBar`     | Solid teal, white text                          | `color="default"`, white background, `borderBottom: 1px solid divider`, no shadow.                                                                                       |
| Brand mark   | `Behandlungsverwaltung` h6 in white             | Wordmark in dusty blue (`primary.main`), `Source Sans 3 500`, slightly larger. Optional small dot/glyph in front to echo the logo.                                       |
| Nav `Drawer` | Permanent, 260 px, plain `ListItemButton`       | Permanent on `lg+`, temporary below; same width; active route shown with a 3-px left accent in `primary.main` and `primary.light` background tint, not a heavy fill.     |
| Drawer top   | Empty `Toolbar` spacer                          | Same spacer + a thin practice-name caption ("bewegtes Lernen — Praxisverwaltung") in `text.secondary`, 12 px, all-caps tracked.                                          |
| Container    | `maxWidth="md"`                                 | `maxWidth="lg"` for list pages, stays `md` for forms (forms read better narrow).                                                                                         |
| Page heading | Implicit via `Typography variant="h4"` per page | New shared `<PageHeader title subtitle?>` component — `h4 500` + optional one-line subtitle in `text.secondary`. Matches the site's "section title + intro line" rhythm. |

A reasonable visual target: the chrome should look **closer to a Notion / Linear
sidebar** than to a default Material dashboard.

## 5. Component-level adjustments

These are theme overrides, no per-page rewrites needed.

- `MuiButton`:
  - `defaultProps.disableElevation: true`.
  - `variant="contained"` stays default; on hover, `backgroundColor: primary.dark`.
  - Add an `outlined` style with 1.5 px border for secondary actions.
- `MuiTextField`:
  - `variant="outlined"` (already default), but border color uses
    `divider` at rest, `primary.main` on focus (already MUI default — only
    re-state if we want a softer focus ring).
- `MuiPaper` / `MuiCard`:
  - Default elevation 0, with explicit border + tiny shadow as in §3.3.
- `MuiTableHead`:
  - `backgroundColor: #F4F7FA` (very light blue-gray), header text 600 weight.
- `MuiListItemButton` (drawer items):
  - `borderRadius: 8`, `mx: 1`, `my: 0.25` so each row is a pill, not full-width
    block. Active state: `backgroundColor: primary.light + 30% alpha`,
    left border 3 px `primary.main`.
- `MuiAlert`:
  - `variant="standard"` with reduced color saturation (sage success, brick
    error) per palette above.
- `MuiChip`:
  - Use for status badges (e.g. invoice paid/draft) with `primary.light`
    background and `primary.dark` text.

## 6. Page-level touches (no re-architecture)

These are small additions that take the brand further than just the theme:

1. **Empty states** (KindList, AuftraggeberList, RechnungList) — replace the
   bare "Keine Daten" line with a short friendly sentence and a primary
   `Button` for the next action. The website's voice is encouraging — match it.
2. **Loading** — swap any spinners for `Skeleton` rows in lists/tables;
   feels calmer than a circular progress for back-office work.
3. **Schnellerfassung** — promote the "Behandlung erfassen" action with a
   dusty-blue `Card` containing the form; matches the site's approach of one
   prominent thing per section.
4. **Footer** — add a small `<footer>` inside `AppShell` with practice name,
   small-print copyright, and a "Powered by" line if appropriate. Mirrors the
   site's bottom-of-page contact block.
5. **Favicon + theme-color** — current `theme-color #0f766e` and SVG icon need
   to be regenerated in dusty blue. New `index.html` `meta theme-color="#5B8FB8"`,
   replace `public/icon.svg`. (Both are 1-line changes; icon is the only file.)

## 7. Implementation steps

Follow the AGENTS.md TDD/step-by-step rule. Each step ends with green
`bun run ci`.

1. **Tokens** — extend `apps/web/src/theme.ts` with the palette, typography,
   shape, and component overrides above. Add `@fontsource/source-sans-3` to
   `apps/web/package.json`. Update `main.tsx` font imports.
   _Verify:_ `bun run dev`, eyeball any page, contrast checker on primary.
2. **AppShell rework** — restyle `AppBar`, `Drawer`, brand mark, container
   width per §4. Introduce `<PageHeader>` shared component.
   _Verify:_ all e2e specs still pass (none assert on color/layout — selectors
   are testids per AGENTS.md), screenshot side-by-side vs. site.
3. **Theme component overrides** — apply §5 in `theme.ts`. No JSX changes.
   _Verify:_ visual sweep of every page route.
4. **Page polish** — empty states, skeletons, hero card on Schnellerfassung,
   footer (§6).
   _Verify:_ manual walkthrough on mobile viewport (375 px) and desktop.
5. **Brand assets** — replace `public/icon.svg` with a dusty-blue mark; update
   `index.html` `theme-color`; update PWA manifest icon if it diverges.
   _Verify:_ install as PWA, confirm tile color.
6. **Docs** — update `AGENTS.md` "Architecture" section to mention the design
   token file and component-override conventions, so future Claude/contributor
   sessions don't drift back to defaults.

Each step is small enough to be one commit. Total LOC change estimate:
~150–250 lines, almost all in `theme.ts` and `AppShell.tsx`.

## 8. Risks & open questions

- **Exact color/font of the site is not in the public CSS** I could fetch. The
  values in §3 are educated matches based on the visual analysis; we should
  pull a screenshot of the live site and color-pick the logo/headline before
  finalizing tokens. If the practice has a brand asset PDF, even better — flag
  if available.
- **WCAG AA**: dusty blue `#5B8FB8` on white sits around 3.7:1 — fails AA for
  body text. We use `primary.dark #3F6F95` for any body-text colored use
  (links, helper text); reserve `primary.main` for buttons/headlines/icons
  ≥ 18 px where 3:1 is sufficient. Verify with a contrast tool before merging.
- **Roboto removal**: keep `@fontsource/roboto` in `package.json` until step 1
  ships and is verified — it's the existing fallback and offline-safe.
- **e2e**: per AGENTS.md, specs use `data-testselector`, never text/CSS, so a
  visual rewrite should not break any test. Confirm by running the full suite
  after step 2.
- **PRD alignment**: PRD requires "bedienbar auf dem Handy, 44 px tap targets".
  The current 44 px `MuiButtonBase` minimum stays — do not lower in the new
  theme.

## 9. Out of scope

- No changes to GraphQL schema, Drizzle tables, MobX stores, PDF generation,
  routing, or the standalone build script.
- No new features.
- No marketing copy / illustrations from the public site copied in — this is
  an internal tool, not the public site.
- No dark mode (yet — could be a follow-up; the dusty palette inverts cleanly).
