# Sanitized Albert Shell Evidence

Inspection date: July 16, 2026

This document records only non-sensitive browser structure needed to constrain
the extension lifecycle and information architecture. No names, identifiers,
schedules, grades, holds, financial values, page values, cookies, credentials,
or screenshots were retained.

## Observed host and lifecycle boundary

- `https://albert.nyu.edu/albert_index.html` is a public launcher titled
  “Albert Login.” It links to authentication and must not receive extension UI.
- The authenticated application loads under
  `https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/`.
- The authenticated top-level window title was “Albert.”
- The installed v0.1.0 shell was present in the accessibility tree, proving that
  packaging and exact-host injection worked. Native pages looked unchanged
  because that release implemented only a compact header.
- PeopleSoft commonly uses `/psp/` shell and `/psc/` content documents. The
  extension therefore injects into exact-host frames, while enforcing a single
  top-frame shell in code.
- Class Search/cart was observed in a cross-origin child frame on the exact
  `sis.nyu.edu` host at component `NYU_SR_FL.NYU_SSENRL_CART_FL.GBL`. No other
  component on that host is accepted by the detector or content-script match,
  and this host is not granted as an explicit host permission.

## Observed primary information architecture

The authenticated top navigation exposed these stable, non-sensitive labels:

1. Home
2. Academics
3. Grades & Transcripts
4. Finances
5. Personal Info
6. Other Resources

Generic sub-area labels observed during the privacy-preserving walkthrough
included classes, enrollment, schedule, grades, transcript, degree progress,
graduation, planner, transfer credit, test scores, registrar, financial aid,
housing, and academic calendar. No associated values were retained.

## Current detection contract

The extension requires all of the following:

1. HTTPS.
2. Exact hostname `sis.portal.nyu.edu`, or exact hostname `sis.nyu.edu` with the
   allowlisted Class Search/cart component path.
3. A `/psp/` or `/psc/` path.
4. No authentication evidence in the title, password controls, login-form
   actions, or explicit sanitized-test marker.
5. Positive Albert evidence: the exact application title, at least two known
   primary-navigation labels, an allowlisted self-service route with related
   portal context, or the exact Class Search/cart component.

Bare SIS PeopleSoft paths remain untouched. The page family is inferred only
from selected native navigation labels or
allowlisted heading labels. Unknown deep screens receive the generic Albert
context and universal theme. No arbitrary page text or student values are
copied into extension UI.

## Packaged-browser verification

The production `dist/` extension is loaded into an isolated
Chrome-for-Testing profile while Albert-host URLs are fulfilled locally with
the sanitized fixture. Tests verify:

- Shadow DOM mounting and keyboard focus under strict `default-src 'none'` CSP;
- computed native-theme styles from extension-packaged CSS;
- primary page context and native navigation delegation;
- 200% page scaling and a 400px layout without horizontal overflow;
- preference persistence and full presentation rollback;
- shell remount after host removal with native controls still usable;
- cross-origin Class Search/cart theming with Add to Cart and Enroll controls
  preserved; and
- exclusion of public and portal-hosted authentication surfaces.

## Remaining evidence risks

- The live walkthrough establishes the six primary families, not every
  PeopleSoft route or version-specific selector.
- Deep transactional pages intentionally use the reversible universal theme
  until stable, sanitized selector evidence exists.
- Popups, cross-origin frames, and PeopleSoft version changes remain browser
  compatibility risks and must fail open.
