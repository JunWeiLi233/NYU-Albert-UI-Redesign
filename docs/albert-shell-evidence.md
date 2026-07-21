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

The primary portal pages shared one `.isSSS_Wrp`, one `.isSSS_Menu`, and one
`.isSSS_Main.selected`. Home exposed one `.is_bb_LinkContainer`; Academics
exposed two; Grades and Finances exposed three each; Personal Info exposed
four. Corresponding directory-column counts were 1, 4, 6, 6, and 8. Grades,
Finances, and Personal Info also exposed 6, 8, and 10 native tables. These are
structure counts only. Other Resources appeared as a native overlay directory
rather than a sixth selected `.isSSS_Main` tab, so resource links remain
delegated to the original overlay controls.

The July 20, 2026 walkthrough also confirmed that Albert exposes two
same-label “Other Resources” controls with different behavior. The overlay
trigger is the parent list item
`#MENU_ID_NYU_OTHER_RESOURCES_FLDR`, whose native handler calls
`toggleMegaMenu` with `#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR`. Its child anchor
uses a nonstandard inline parent call and is not a safe delegation target.
Better Albert therefore activates only the verified parent trigger and treats
missing or ambiguous matches as unavailable. The matching native directory is
the direct child `#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR`; when Albert marks it
`.open`, Better Albert positions only that stable outer boundary above the
workspace while leaving its native links, destinations, handlers, and internal
structure unchanged.

The July 21, 2026 follow-up confirmed that the open directory has one direct
`ul`, with each native destination represented by a direct `li > a`. Better
Albert may arrange those exact descendants as a responsive grid, but it does
not insert, remove, reorder, or replace any directory item or control.

The same walkthrough confirmed a newer Home variant where `Weekly Schedule`
and `Course Search` are no longer inside `.is_bb_LinkContainer`. Both controls
remain inside the selected `.isSSS_Main`, the rendered `#IS_AC_RESPONSE`, and
the selected `.isSSS_FullW.isSSS_ShopCart` workspace. Better Albert treats
that exact active structure as a verified tool container; matching labels in
inactive or unrelated page content remain unavailable.

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
from selected native navigation labels or allowlisted heading labels. A
separate adapter registry then chooses the exact Class Search layout, one of
five observed selected-workspace layouts, a verified deep PeopleSoft layout, or a conservative
generic workspace in that order. Adapters add only extension-prefixed
attributes to original nodes; no arbitrary page text or student values are
copied into extension UI.

## Packaged-browser verification

The production `dist/` extension is loaded into an isolated
Chrome-for-Testing profile while Albert-host URLs are fulfilled locally with
the sanitized fixture. Tests verify:

- Shadow DOM mounting and keyboard focus under strict `default-src 'none'` CSP;
- computed full-page structural styles from extension-packaged CSS;
- distinct adapter IDs and layout regions for all five observed selected
  workspaces, plus native delegation for the Other Resources overlay;
- primary page context and native navigation/tool delegation;
- 1440, 1200, 900, 768, and 400px layouts without document-level horizontal
  overflow, plus 200% page scaling;
- preference persistence and full presentation rollback;
- shell and workspace remount after PeopleSoft replacement with stale markers
  removed;
- native form action, method, hidden state, control ownership, and click
  listeners preserved;
- cross-origin Class Search/cart desktop and mobile layout with Add to Cart and
  Enroll controls preserved;
- only the boolean interface preference present in extension storage and no
  unexpected HTTP request from the fixture run; and
- exclusion of public and portal-hosted authentication surfaces.

## Remaining evidence risks

- The live walkthrough establishes shared structure for the primary families,
  not every PeopleSoft route or version-specific deep selector.
- Unknown deep transactional pages receive bounded workspace framing only;
  field- or action-specific restructuring stays disabled until stable,
  sanitized selector evidence exists.
- Popups, cross-origin frames, and PeopleSoft version changes remain browser
  compatibility risks and must fail open.
