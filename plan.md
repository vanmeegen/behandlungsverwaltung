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
