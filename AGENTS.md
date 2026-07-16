# Repository Guidelines

## Project Structure & Module Organization

This repository is a Manifest V3 Chromium extension built with React, TypeScript, Vite, and CRXJS.

- `src/background/`: service-worker lifecycle and toolbar preference toggling.
- `src/content/`: page detection, navigation delegation, theming, and mount lifecycle.
- `src/adapters/`: reversible structural adapters for Albert workspaces, deep PeopleSoft pages, and Class Search.
- `src/app/`: isolated Shadow DOM React shell.
- `src/design-system/`: NYU-aligned tokens and scoped CSS.
- `src/storage/`: the boolean enable/disable preference only.
- `tests/unit/`, `tests/integration/`, `tests/e2e/`: Vitest and Playwright coverage.
- `tests/fixtures/`: sanitized Albert HTML; never add real student data.
- `design.md`: binding frontend and safety contract. Read it before UI work.

## Build, Test, and Development Commands

- `npm install`: install locked dependencies.
- `npm run test:watch`: run Vitest during development.
- `npm test`: run all unit and integration tests once.
- `npm run lint`: check ESLint rules.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run build`: type-check and create the unpacked extension in `dist/`.
- `npm run test:e2e`: rebuild, load `dist/` in packaged Chromium, and run Playwright tests.

Before handing off a change, run test, lint, typecheck, build, and relevant E2E coverage.

## Coding Style & Naming Conventions

Use two-space indentation, ES modules, strict TypeScript, and small single-purpose functions. Follow existing naming patterns: React components use PascalCase (`AppShell.tsx`), helpers use kebab-case, adapters end in `.adapter.ts`, and tests end in `.test.ts` or `.test.tsx`. Prefer existing utilities and extension-owned `data-better-albert-*` attributes over new abstractions. Run ESLint instead of applying manual style exceptions.

## Testing Guidelines

Write regression tests alongside behavior changes. Unit-test detection and adapter rollback, integration-test lifecycle/fail-open behavior, and use Playwright for packaged-extension, responsive, accessibility, and native-control preservation checks. Fixtures must use synthetic placeholders and pass `fixture-sanitization.test.ts`.

## Commit & Pull Request Guidelines

Use short imperative commit subjects, for example `Redesign Albert pages with structural adapters`. Keep commits focused. PRs should explain scope, safety boundaries, selectors affected, tests run, and known browser risks. Include desktop/mobile screenshots for visible changes and keep the PR draft until packaged E2E checks pass.

## Security & Privacy

Do not modify authentication, automate enrollment or payment actions, call undocumented APIs, add telemetry, or broaden host permissions without evidence. Preserve native DOM identity, form ownership, events, validation, and fail-open behavior.
