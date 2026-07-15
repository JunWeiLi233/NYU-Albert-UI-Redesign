# Sanitized Albert Shell Evidence

Inspection date: July 16, 2026

This document records only non-sensitive browser structure needed to constrain
the extension lifecycle. No names, identifiers, schedules, grades, holds,
financial values, page text, cookies, credentials, or screenshots were retained.

## Observed boundary

- `https://albert.nyu.edu/albert_index.html` is a public launcher titled
  “Albert Login.” It links to authentication and must not receive extension UI.
- The launcher’s Albert target is under
  `https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/`.
- After following the target in the existing browser session, the top-level
  application host was `sis.portal.nyu.edu` and the window title was “Albert.”
- The browser accessibility tree exposed one top-level HTML document and no
  iframe role on the inspected landing shell.

## Detection contract for this slice

The extension may mount only when all of these signals agree:

1. HTTPS is in use.
2. The exact hostname is `sis.portal.nyu.edu`.
3. The document is the top-level browsing context.
4. The normalized document title is exactly “Albert.” Titles such as “Albert
   Login” are excluded so expired or redirected authentication surfaces remain
   untouched.
5. A document body exists.

The public `albert.nyu.edu` launcher, SSO pages, NYU marketing pages, child
frames, and documents with unrelated titles fail closed from the extension’s
perspective, leaving the native page untouched.

## Limitations

- Accessibility-tree inspection is evidence for the top-level shell, not proof
  of every internal PeopleSoft route or DOM selector.
- No page-specific selector is approved yet.
- Additional hosts, frames, or URL patterns require a new sanitized observation
  and tests before manifest permissions or detection are expanded.

## Packaged-browser verification

The production `dist/` extension is loaded into an isolated Chrome-for-Testing
profile during Playwright tests. Host URLs are fulfilled locally with the
sanitized fixture, so the suite does not contact Albert or reuse session state.
It verifies Shadow DOM mounting under a strict `default-src 'none'` page CSP,
keyboard focus, 200% page scaling, 400px layout without horizontal overflow,
preference persistence and remounting, native usability after host removal, and
exclusion of both public and portal-hosted authentication surfaces.
