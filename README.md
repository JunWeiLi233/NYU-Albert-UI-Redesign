# Better Albert

Better Albert is a local-first Manifest V3 extension that progressively
enhances NYU Albert without replacing Albert's authentication, data, or native
transaction behavior.

## Implemented slice

This first vertical slice contains only:

- a Vite, CRXJS, React, and TypeScript extension build;
- one top-frame content script on `https://sis.portal.nyu.edu/*`;
- NYU-aligned design tokens and a Shadow DOM application header;
- a boolean enablement preference in `chrome.storage.local`;
- extension-action and in-header disable controls;
- fail-open cleanup; and
- a synthetic, sanitized Albert shell fixture with lifecycle tests.

No page data is read, stored, logged, or transmitted. There are no analytics,
external services, remote assets, cookie permissions, authentication changes,
or transaction bridges.

## Commands

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

The unpacked Chromium extension is emitted to `dist/`. The toolbar action
toggles the global enhancement preference. When enabled, the header's
"Disable Better Albert" button removes the enhancement immediately.

## Fixture policy

Files under `tests/fixtures/` must be synthetic or thoroughly sanitized. Never
commit names, NetIDs, grades, schedules, holds, tasks, balances, financial-aid
details, or session/authentication material.

## Known scope boundary

Browser inspection confirmed that `albert.nyu.edu` is the public login launcher,
not the authenticated application host. Better Albert deliberately does not run
there. The extension runs only on the observed `sis.portal.nyu.edu` application
host, only in the top frame, and only when the normalized document title is
exactly “Albert.”
No DOM selector is guessed. Internal navigation and any additional frame or host
support must be proven with further sanitized evidence before permissions grow.
