# Behandlungsverwaltung — Plan

Living plan per `AGENTS.md`. Mark completed items with ✅.

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

## Phase 1: Domain (next)

- ⏳ Define the `Behandlung` entity (fields + Drizzle table + migration)
- ⏳ GraphQL queries/mutations for `Behandlung` CRUD
- ⏳ MobX presentation model and list/detail views
- ⏳ TDD: failing tests first for each slice

## Phase 2+: Abrechnung (billing)

- ⏳ Billing domain model
- ⏳ PDF / export pipeline (tbd)

## Working rules (from AGENTS.md)

- Red/green TDD, step by step.
- No React state hooks for app state — MobX observables + `observer`.
- Strict TypeScript, no inline types shared across files.
- Run lint + tests + build before each commit.
