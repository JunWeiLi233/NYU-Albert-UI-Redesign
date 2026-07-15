# Better Albert

Better Albert is a local-first Manifest V3 extension that gives the authenticated
NYU Albert interface a clearer, NYU-aligned application shell without replacing
Albert authentication, data, controls, or transaction behavior.

## Implemented experience

Version 0.2.0 includes:

- a Vite, CRXJS, React, and TypeScript MV3 build;
- one isolated, page-aware Shadow DOM shell for the top-level Albert document;
- Home, Academics, Grades & Transcripts, Finances, Personal Info, and Other
  Resources context and navigation delegated to existing native Albert links;
- a reversible native theme for recognized `/psp/` and `/psc/` documents,
  including PeopleSoft child frames and the proven Class Search/cart component;
- lifecycle recovery for partial navigation and host replacement;
- a boolean enablement preference in `chrome.storage.local`;
- visible toolbar `ON`/`OFF` state and in-shell disablement;
- authentication exclusions and fail-open rollback; and
- a synthetic, sanitized Albert fixture with unit, integration, and packaged
  browser tests.

The universal theme covers recognized pages even when a deep screen has no
specific adapter. Better Albert never reconstructs official values or replaces
native buttons, forms, tables, or submission flows.

No student data is stored, logged, or transmitted. There are no analytics,
external services, remote assets, cookie permissions, authentication changes,
or undocumented API calls.

## Build and verify

```sh
npm test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

Install Playwright's isolated Chromium build once before the first browser run:

```sh
npx playwright install chromium
```

The end-to-end suite loads the unpacked `dist/` extension into a temporary
Chrome-for-Testing profile and fulfills Albert-host URLs with the sanitized
fixture. It does not contact Albert or reuse the user's browser profile.

Run `npm run build`, then load `dist/` as an unpacked extension. After updating
an already installed unpacked copy, use the extension manager's Reload action
and refresh the Albert tab. The toolbar badge reports whether the preference is
`ON` or `OFF`.

## Fixture policy

Files under `tests/fixtures/` must be synthetic or thoroughly sanitized. Never
commit names, NetIDs, grades, schedules, holds, tasks, balances, financial-aid
details, or session/authentication material.

## Safety boundary

Better Albert runs only on two observed, exact SIS hosts. The authenticated
application shell uses `sis.portal.nyu.edu`; its cross-origin Class Search/cart
frame uses `sis.nyu.edu`. The second host is accepted in code only for the
observed `NYU_SR_FL.NYU_SSENRL_CART_FL.GBL` component, and the content-script
match is restricted to that component path. The extension recognizes
only HTTPS `/psp/` and `/psc/` PeopleSoft paths. Portal-hosted documents also
need positive Albert title/navigation evidence, a verified same-origin Albert
parent/opener, or an allowlisted self-service route. Authentication evidence
wins and removes all extension presentation. The public `albert.nyu.edu`
launcher remains outside manifest permissions.

The exact portal host permission and `storage` are the only requested
privileges. Class Search/cart uses only the narrow declarative content-script
match above; it does not add a second explicit host permission. `all_frames`
lets the inert, root-scoped theme reach PeopleSoft content frames; only the
top-level portal document receives the application shell.
