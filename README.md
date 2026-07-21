# Better Albert

Better Albert is a local-first Manifest V3 extension that gives the authenticated
NYU Albert interface a full-page, NYU-aligned application workspace without
replacing Albert authentication, data, controls, or transaction behavior.

## Implemented experience

Version 0.4.8 includes:

- a Vite, CRXJS, React, and TypeScript MV3 build;
- one isolated Shadow DOM application frame: a fixed violet rail on desktop and
  a compact responsive workspace header below 900px;
- Home, Academics, Grades & Transcripts, Finances, Personal Info, and Other
  Resources context and navigation delegated to existing native Albert links;
- reversible structure-aware layouts for the five observed selected Albert
  workspaces, with Other Resources delegated to Albert's native overlay;
- live PeopleSoft response-wrapper adaptation that selects the one rendered
  response when Albert retains duplicate hidden roots, then expands legacy
  397–514px content into the full workspace without moving controls;
- a compact 60px native utility strip that removes the duplicate Albert logo
  and menu while the extension is enabled and restores them on disablement;
- distinct page-specific Home, Academics, Grades, Finances, and Personal Info
  regions that annotate original Albert nodes without copying their values;
- live Finances support for the verified account and financial-aid roots even
  when Albert omits the shared link-directory container;
- effective 200% zoom containment for family hubs, deep pages, read-only
  dialogs, and both Class Search variants without replacing native controls;
- a common full-page PeopleSoft layout for recognized deep `/psp/` and `/psc/`
  documents, including child frames;
- exact fluid and legacy Class Search adapters with responsive filter/results
  stacking for the proven cross-origin cart component;
- safe delegation for Albert's native `javascript:` navigation controls that
  preserves their handlers while preventing extension-world CSP errors;
- lifecycle recovery for partial navigation and host replacement;
- a boolean enablement preference in `chrome.storage.local`;
- visible toolbar `ON`/`OFF` state and in-shell disablement;
- authentication exclusions and fail-open rollback; and
- sanitized fixtures for every family, a realistic deep form, Class Search
  results/empty/error states, and read-only versus transaction dialogs, with
  unit, integration, and packaged-browser tests.

The adapter registry uses the most specific verified structure available and
falls back to a conservative native workspace when a page does not match a
family or deep-page contract. Better Albert never reconstructs official values,
moves controls between forms, or replaces native buttons, tables, validation,
and submission flows. Disabling or any rendering failure removes every adapter
marker and returns the original native DOM immediately.

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
Chrome-for-Testing profile and fulfills Albert-host URLs with sanitized
fixtures. It verifies desktop/mobile composition, 200% zoom, no document-level
overflow, exact rollback, PeopleSoft replacement recovery, native transaction
click behavior, and storage/network privacy. It does not contact Albert or
reuse the user's browser profile.

Run `npm run build`, then load the generated `dist/` directory as an unpacked
extension. For a release ZIP, extract it first and select the extracted folder
that contains `manifest.json` directly. Keep only one Better Albert copy
enabled. After updating an installed unpacked copy, use the extension manager's
Reload action and refresh every Albert tab. Confirm the extension card shows
version `0.4.8` and the toolbar badge shows `ON`. On desktop the native portal is
offset beside the fixed Better Albert rail; Class Search opened directly never
receives a phantom rail offset.

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
