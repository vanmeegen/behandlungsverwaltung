# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Behandlungsverwaltung is a single-file distributable desktop/web application for managing treatments. It is shipped as a self-contained Bun executable that embeds both the GraphQL API server and the React frontend, with data persisted in a local SQLite file next to the binary.

## Tech Stack

- **Runtime / Package manager**: [Bun](https://bun.sh) (workspaces, native test runner, single-file compilation)
- **Language**: TypeScript 5.6 in strict mode
- **Frontend**: React 18 + [MobX](https://mobx.js.org) / `mobx-react-lite`, built with [Vite 5](https://vitejs.dev)
- **Backend**: [`graphql-yoga`](https://the-guild.dev/graphql/yoga-server) + [Pothos](https://pothos-graphql.dev) schema builder, served by Bun
- **Database**: SQLite via `bun:sqlite`, schema managed with [Drizzle ORM](https://orm.drizzle.team) + `drizzle-kit`
- **Testing**: [Vitest](https://vitest.dev) (web, jsdom) and `bun test` (server)
- **Linting / Formatting**: ESLint 9 (flat config) + `typescript-eslint`, Prettier 3
- **Git hooks**: Husky + lint-staged
- **CI**: GitHub Actions — see `.github/workflows/ci.yml`

## Repository Layout

```
.
├── apps/
│   ├── web/       # React + MobX frontend (Vite)
│   └── server/    # graphql-yoga + Pothos GraphQL API (Bun)
├── packages/
│   └── shared/    # shared TypeScript types / utilities
├── scripts/
│   ├── build-standalone.ts        # cross-compile single-file binaries
│   ├── ensure-reports-dir.ts      # prepare reports/ dir for JUnit output
│   └── generate-static-manifest.ts
└── .github/workflows/ci.yml       # CI pipeline
```

The workspace is a Bun monorepo declared in the root `package.json` (`workspaces: ["apps/*", "packages/*"]`). Cross-workspace scripts use `bun run --filter='*' <script>`.

## Architecture

- **Monorepo**: three workspaces share a single `bun.lock` and a common `tsconfig.base.json`.
- **Single-file distribution**: `scripts/build-standalone.ts` first runs the Vite web build, generates a static-asset manifest, then uses `bun build --compile` to bundle the Bun runtime + server + embedded frontend + SQLite driver into one executable per target (Windows/macOS/Linux, x64/arm64). The resulting binary creates its own SQLite DB next to itself on first run.
- **State Management**: MobX with mobx-react-lite for React integration.
- **Presentation Model Pattern**: Keep UI components free from logic — all logic resides in MobX models/stores.
- **Avoid React Hooks**: React state hooks spoil this architecture. Use MobX observables and `observer` wrappers for UI state synchronization. Use other hooks only if absolutely needed.
- **Strict Types**: Use TypeScript strict mode; never use untyped arguments or return values.
- **Explicit Types**: Avoid inline type declarations. If a shape appears in more than one place, extract a named type.
- **API**: GraphQL only — no REST. Keep the server lightweight; prefer Pothos builder patterns.

## Development Commands

All commands are exposed as root-level scripts in `package.json` so both humans and CI invoke the same entry points.

### Day-to-day

```bash
bun install                # install dependencies (respects bun.lock)
bun run dev                # run web + server in parallel (all workspaces)
bun run dev:web            # Vite dev server only (apps/web)
bun run dev:server         # Bun --hot GraphQL server only (apps/server)
bun run preview            # preview the production Vite build
```

### Quality gates (these back the CI pipeline)

```bash
bun run lint               # ESLint across all workspaces
bun run typecheck          # tsc across all workspaces (no emit)
bun run test               # run all tests once (vitest + bun test)
bun run test:ci            # same, but also writes JUnit XML to reports/
bun run build              # production build across all workspaces
bun run build:standalone   # cross-compile default single-file binaries
bun run build:standalone:ci  # standalone build for linux-x64 only (used in CI)
bun run ci                 # full local CI: lint → typecheck → test:ci → standalone
```

### Test helpers (web workspace)

```bash
bun run test:watch         # vitest in watch mode
bun run test:ui            # vitest UI
bun run test:coverage      # vitest with coverage report
```

### Database (server workspace)

```bash
bun run db:generate        # drizzle-kit generate
bun run db:migrate         # drizzle-kit migrate
```

### Formatting

```bash
bun run format             # prettier --write .
bun run format:check       # prettier --check .
```

## CI Pipeline

`.github/workflows/ci.yml` runs on every branch push and pull request. It only invokes root `package.json` scripts, so anything that passes locally via `bun run ci` will pass in CI:

1. `bun install --frozen-lockfile`
2. `bun run lint`
3. `bun run typecheck`
4. `bun run test:ci` — writes `reports/web-junit.xml` and `reports/server-junit.xml`
5. `dorny/test-reporter@v2` — renders an HTML "Test Results" check with pass/fail breakdown on the commit/PR
6. `bun run build:standalone:ci` — cross-compiles the linux-x64 executable
7. Uploads `junit-reports/` and `standalone-executables/` as workflow artifacts

To reproduce a CI failure locally, run `bun run ci`.

## Process

- **TDD Methodology**: use strict red/green TDD.
- **Step by Step**: Work step by step. For complex tasks make a precise plan using deep thinking and write it into a `plan.md` file. When a step is finished, ensure all tests are running and the system builds. Then ask for verification and after confirmation update the plan and commit the step.
- **Plan Management**: Update `plan.md` with beautiful green checkmarks (✅) for completed tasks.
- **Commit Process**:
  - Always run `bun run ci` before committing.
  - Update `plan.md` with progress before committing.
  - Use descriptive commit messages.
  - Amend commits when requested to update plan status.

## Test Configuration

- **Web**: Vitest configured in `apps/web/vite.config.ts`
  - Test files: `**/__tests__/**/*.spec.ts` and `**/__tests__/**/*.spec.tsx`
  - Setup file: `./src/__tests__/setup.ts` (imports jest-dom)
  - Environment: jsdom with global test utilities
- **Server**: Bun's native test runner
  - Test files: `apps/server/src/__tests__/**/*.spec.ts`
- **JUnit output**: `test:ci` writes to `reports/web-junit.xml` and `reports/server-junit.xml`; GitHub Actions renders these as an HTML check via `dorny/test-reporter`.

## End-to-End Tests (Playwright)

E2E tests live in `apps/web/e2e/` and run against the real dev stack: Vite on
`:5173` proxying `/graphql` to the Bun GraphQL server on `:4000`. Playwright's
`webServer` config starts `bun run dev` automatically, so a single command runs
the full system.

Config: `apps/web/playwright.config.ts` — Chromium only, `testIdAttribute` set
to `data-testselector` so `page.getByTestId('...')` resolves
`data-testselector="..."` in the DOM. Test files match `**/*.e2e.ts`.

### Commands

```bash
bun run e2e:install        # one-time: download Chromium + OS deps
bun run e2e                # headless run (from repo root)
bun run e2e:ui             # interactive UI mode (debug, time-travel)
cd apps/web && bun run e2e:ci   # CI mode, writes reports/web-e2e-junit.xml
```

### Conventions for writing new e2e tests

1. **Page Objects live in `apps/web/e2e/pages/`** — one class per page/view.
   The class exposes `Locator`s for elements and async methods for user
   interactions (`login()`, `submitForm()`, `openPatient()`, …). Specs MUST NOT
   use raw selectors — always go through the page object.
2. **Specs live in `apps/web/e2e/` as `*.e2e.ts`.** Keep them short and
   declarative: arrange (instantiate page object + `goto()`), act, assert.
3. **Select elements with `data-testselector`, never with text or CSS classes.**
   Use `page.getByTestId('my-thing')` in page objects (Playwright is configured
   to resolve this to `data-testselector`). This keeps tests robust against:
   - i18n / translation changes (the app has German strings today)
   - visual redesigns (className churn)
   - DOM restructuring that preserves semantics
4. **Add `data-testselector` to components while writing the test.** Use
   kebab-case, scoped names: `hello-greeting`, `patient-list-row`,
   `save-button`. Prefer one id per interactive or assertable element. Do NOT
   remove the semantic ARIA roles — `role` and `data-testselector` coexist.
5. **Never assert on translated strings.** Assert on presence
   (`toBeVisible()`), count (`toHaveCount(n)`), value, or structural state. If
   you must check visible text, pull it from a shared constant the component
   also uses.
6. **Prefer auto-waiting assertions** (`await expect(locator).toBeVisible()`)
   over manual `waitFor*`. Never use `page.waitForTimeout()`.
7. **No state sharing between specs.** Each test re-navigates via the page
   object's `goto()`.
8. **Debugging a failure.** Run with `bun run e2e:ui` locally, or open the
   HTML report at `apps/web/playwright-report/index.html` after a failed run.
   Traces are recorded on first retry (see `use.trace` in the config).

### Example: new page object

```ts
// apps/web/e2e/pages/PatientListPage.ts
import type { Locator, Page } from '@playwright/test';

export class PatientListPage {
  readonly rows: Locator;
  constructor(readonly page: Page) {
    this.rows = page.getByTestId('patient-row');
  }
  async goto(): Promise<void> {
    await this.page.goto('/patients');
  }
}
```

In the component, mark each row with `data-testselector="patient-row"`.

## Lint-staged Configuration

Automatically runs on commit:

- TypeScript files: ESLint fix + Prettier
- Other files (json, md, css, html, yml, yaml): Prettier only
