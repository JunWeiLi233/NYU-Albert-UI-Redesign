# Better Albert Design

## Source of truth

- Status: Active — full-page redesign contract
- Last refreshed: July 21, 2026
- Primary product surfaces: the authenticated Albert shell; its selected Home, Academics, Grades & Transcripts, Finances, and Personal Info workspaces; recognized deep pages; exact Class Search; and the native Other Resources navigation overlay.
- Evidence reviewed: this file's NYU website evidence appendix, `nyu-albert-extension-plan.md`, the extension source and sanitized fixtures, and a privacy-preserving authenticated walkthrough of Albert's primary and deep hub navigation on July 16, 2026.

## Brand

- Personality: institutional, clear, calm, editorial, trustworthy, and functional.
- Trust signals: label the extension as an unofficial local enhancement, keep native Albert visible, make disablement obvious, and never imply that extension-rendered content is authoritative.
- Avoid: generic SaaS chrome, marketing-page layouts, gradients, glass effects, excessive rounding or shadows, decorative motion, and unofficial recreations of NYU marks.

## Product goals

- Goals: make the full authenticated Albert experience feel coherent and NYU-aligned, improve visual hierarchy across every recognized page family, survive PeopleSoft partial navigation and frame rendering, and preserve immediate access to the native interface.
- Non-goals: changing authentication; automating login, MFA, enrollment, payment, drop, or swap actions; replacing official data or controls; calling undocumented APIs; reconstructing student records inside extension UI.
- Success signals: one isolated full-height application frame appears in the top portal document, every recognized Albert document receives exactly one reversible structural adapter, each selected portal workspace has a distinct content hierarchy, Class Search has a proven filter/results workspace, the non-document Other Resources overlay remains delegated to Albert, page context follows partial navigation, disablement removes every extension-owned marker and style, failures leave native Albert usable, and only interface preferences are stored.

## Binding definition of full-page redesign

“Full-page redesign” means every recognized Albert document receives an extension-owned application frame and a structure-aware content layout covering its page header, primary sections, navigation or tool areas, lists, tables, forms, alerts, empty/error states, and supported read-only dialogs. A font or color swap, a title border, a generic white container, or a header alone does not satisfy this requirement.

The redesign operates on original native DOM in place. Adapters may annotate stable structural containers and apply scoped layout, but they must not clone or reconstruct student data, synthesize destinations, replace native controls, change transaction semantics, move controls between forms, or visually reorder focusable controls away from their DOM order.

## Personas and jobs

- Primary personas: NYU students using Albert in a Chromium browser, with first-time students as the primary wayfinding and terminology stress case.
- User jobs: understand where they are, discover common tasks without already knowing PeopleSoft terminology, move among Albert's primary areas, scan dense native pages more comfortably, keep using official Albert controls, and disable the enhancement instantly when desired.
- Key contexts of use: authenticated, data-sensitive academic workflows where clarity and native-system trust matter more than decoration.

## Information architecture

- Primary navigation: Home, Academics, Grades & Transcripts, Finances, Personal Info, and Other Resources. Each destination pairs the native area name with a concise task-oriented hint for students who do not yet know Albert's organization. Extension navigation delegates to matching native Albert links and never synthesizes destinations.
- Secondary tools: present allowlisted, currently present native destinations as descriptive Quick access links rather than unexplained system labels. Home may expose Course Search and Weekly Schedule; Academics may expose Academic Planner, Degree Progress Report, What If Report, and graduation status; Records may expose Enrollment Verification, Test Scores, unofficial transcripts, and transfer credit; Finances may expose balance, statement, and financial-aid status; Personal Info may expose read-only section entry points; Resources may expose calendars and NYU offices.
- Core routes/screens: recognized authenticated `/psp/` and `/psc/` documents on `https://sis.portal.nyu.edu/*`, plus the proven cross-origin Class Search/cart component at `https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL`; launcher, authentication, and unrelated SIS components are excluded.
- Content hierarchy: identity and primary-navigation frame, page-family title and context, family-specific primary workspace, secondary native tools, supporting sections, then the original native transaction controls and messages.

## Design principles

- Progressive enhancement: extension UI must be additive, isolated, removable, and non-blocking.
- Institutional restraint: use violet for identity, focus, and selected actions rather than as a universal surface color.
- Trust native Albert: restructure only verified containers around native content without copying sensitive values or replacing official transaction controls.
- Tradeoffs: prefer page-family layout adapters operating on the original DOM over cloning or reconstructing Albert data. Keep unofficial assets, remote fonts, public-site imitation, and any data-reconstructed dashboard out of scope.

## Visual language

- Color: identity violet `#57068C`, black, white, pale violet, and quiet neutrals; semantic colors retain their conventional meanings.
- Typography: prefer NYU Perstare only when an authorized local font is available, followed by the documented system sans-serif stack.
- Spacing/layout rhythm: use the documented 4px-based scale and compact application density.
- Shape/radius/elevation: flat surfaces, 1px rules, 3px interactive-control radius, and no decorative shadow.
- Motion: 100–180ms functional feedback only, removed under reduced motion.
- Imagery/iconography: text-first interface with small geometric CSS indicators only; do not redraw the torch or substitute emoji.

## Components

- Existing components to reuse: native Albert links, tables, forms, buttons, alerts, and transaction flows remain the source of truth.
- New/changed components: `AppShell` becomes a fixed desktop application rail and compact mobile workspace header with extension identity, primary navigation, current-area context, allowlisted native-tool shortcuts, a skip-to-native-content action, native-view trust notice, and disable action. An `AdapterManager` selects exactly one primary structural adapter and owns atomic rollback. A `DomPatchJournal` is the sole native-DOM mutation surface and records only extension-owned attributes. Five observed selected-workspace adapters present `.isSSS_Wrp`, `.isSSS_Main.selected`, `.is_bb_LinkContainer`, `.is_bb_LinkColumn`, and `.is_bb_LinkItem` as distinct responsive workspaces. A generic PeopleSoft adapter frames verified page titles, direct groups, forms, tables, and grids without moving controls. The exact Class Search adapter creates a filter/results workspace. Other Resources stays a delegated native overlay, not a reconstructed page. A read-only modal enhancer handles only allowlisted titles, while any open native dialog temporarily suppresses the rail.
- Variants and states: Home, Academics, Grades & Transcripts, Finances, Personal Info, native Other Resources overlay delegation, generic Albert, tool-present/tool-unavailable, loading/reconciling, disabled, and failure rollback.
- Token/component ownership: `src/design-system/tokens.css` owns Shadow-DOM tokens; `src/design-system/native-theme.css` duplicates only the required prefixed values under the extension-owned root attribute because Shadow DOM custom properties do not cross into native documents.

## Accessibility

- Target standard: WCAG 2.1 AA.
- Keyboard/focus behavior: shell navigation and disablement are native buttons with visible focus rings and 44px minimum targets; native document order and controls are not intercepted.
- Contrast/readability: violet, ink, white, and neutral combinations must meet AA for their text role.
- Screen-reader semantics: use a labelled banner, labelled navigation, `aria-current` for the current area, explicit status text, and explicit button text.
- Reduced motion and sensory considerations: remove nonessential transitions under `prefers-reduced-motion`; never rely on color alone.

## Responsive behavior

- Supported breakpoints/devices: single-column mobile below 600px, compact tablet workspace from 600–899px, desktop application rail from 900–1199px, and a bounded wide canvas at 1200px and above.
- Layout adaptations: at 900px and above use a fixed 264px application rail and offset the verified top-level native workspace without moving it; below 900px use a compact sticky top header and horizontally scrollable navigation. Family and deep-page layouts reduce columns without document-level horizontal overflow. Below 900px all content follows source order in one column. Wide tables may scroll inside their marked region, but the document itself must not overflow horizontally.
- Zoom: at 200% zoom no shell control, native action, validation message, or page region may be clipped or overlapped.
- Touch/hover differences: keep the disable target at least 44px high and never make hover the only feedback state.

## Interaction states

- Loading: do not show a blocking loader; start a lightweight lifecycle at `document_idle` and reconcile when PeopleSoft markers arrive.
- Empty/unknown: retain the generic “Albert” context and native page; do not invent an empty-state interpretation.
- Error: remove partial extension UI, root attributes, and injected styles; leave native Albert unchanged.
- Success: show the page-aware application frame and one scoped structural adapter without hiding, cloning, or replacing native content.
- Disabled: roll back the adapter journal first, then remove the shell, native theme, and every extension-owned attribute immediately while retaining only lifecycle listeners needed for re-enablement.
- Offline/slow network: no extension network requests or remote assets are allowed.

## Content voice

- Tone: direct, calm, transparent, and concise.
- Terminology: use “Better Albert,” “unofficial local enhancement,” and explicit native-system language.
- Microcopy rules: describe actual state; do not imply official NYU endorsement or transaction success.

## Implementation constraints

- Framework/styling system: React and TypeScript built by Vite/CRXJS; Shadow DOM for extension UI; one extension-owned, root-prefixed stylesheet for native Albert presentation.
- Design-token constraints: tokens are prefixed `--ba-`; native-page values exist only inside selectors beginning with `html[data-better-albert-enabled]`.
- Performance constraints: one debounced document observer plus a related-context observer only for same-origin child/popup documents; no polling, remote assets, bulk text extraction, or background network activity.
- Compatibility constraints: Manifest V3 Chromium baseline; one explicit `sis.portal.nyu.edu` host permission plus a declarative `sis.nyu.edu` content-script match constrained to the proven Class Search/cart component path; `all_frames` is required for PeopleSoft child-document rendering, while top-level shell ownership remains unique.
- Safety constraints: authentication exclusions win; each adapter declares required selectors and applies only when all anchors match uniquely; optional sections may disappear without breaking the page; missing, ambiguous, detached, or throwing anchors roll back exactly to native presentation. No document-wide text extraction or guessed selectors is allowed. Original nodes, IDs, names, values, event handlers, form ownership, DOM order, messages, pointer input, and keyboard input remain unchanged. Transaction-changing labels are excluded from extension navigation. Semantic warning, error, success, financial, and transaction-control colors are not overwritten.
- Test/screenshot expectations: sanitized fixtures cover all five observed selected workspaces plus native Other Resources delegation, realistic deep forms, read-only and unknown transaction modals, Class Search success/empty/error states, authentication, unknown surfaces, and partial failure. Browser tests prove layout regions at 400, 768, 900, 1200, and 1440px; document overflow; 200% zoom; keyboard focus; disabled rollback; DOM replacement; missing selectors; native control identity/form ownership/click behavior; storage/network privacy; and exact Class Search host containment.

## Page layout contracts

| Surface | Required full-page layout | Safety boundary |
| --- | --- | --- |
| Home | Full-width page context; attention/deadline, schedule/today, enrollment-date/action, and native tool-directory regions; desktop primary workspace plus supporting column; mobile source order. | Do not clone appointments, holds, schedule entries, counts, or enrollment values. Missing overview anchors fail open to the common hub layout. |
| Academics | Page context; distinct planning, enrollment, degree-progress, and graduation boards; deep pages use the common title/group/form/table frame. | Applications, submissions, add/drop/swap, and enrollment actions remain native and are never promoted into synthetic controls. |
| Grades & Transcripts | Page context; term navigation; native academic-record table workspace; separate records/report directory. | Preserve official grade strings and table semantics exactly. Do not calculate GPA, copy grades into cards, or store values. |
| Finances | Page context; separate account, statements, and financial-aid regions; clear native boundary for external payment systems. | Never copy or persist balances or awards. Payment and award actions retain native semantic styling and behavior. |
| Personal Info | Page context; section index; distinct profile/contact summary and native edit-form workspaces; aligned labels, controls, and errors. | Never clone, cache, log, or expose identity/contact values. Preserve autocomplete, validation, and save/cancel behavior. |
| Other Resources | This observed surface is a native overlay, not a selected page document. The shell delegates to Albert's original trigger and does not reconstruct or restyle the overlay without stable DOM anchors. Any distinct resource document still receives the generic/deep adapter. | Use only existing native destinations; add no tracking parameters, remote metadata, or synthetic links. |
| Deep PeopleSoft pages | Bounded workspace with page title, native breadcrumbs/back control, direct grouped sections, readable labels, aligned fields, inline validation, native tables, and native action area. | Unknown transactional forms receive framing only. Do not change control order, form ancestry, validation, or status colors. |
| Read-only modals | Violet title band, bounded content, visible native close/return, responsive sizing, and mask. | Only allowlisted read-only titles are enhanced; native focus behavior and unknown/transaction dialogs fail open. |
| Class Search | Desktop 280–320px filter column plus flexible native results workspace; mobile filters then results in source order. | Search, Add to Cart, Enroll, and details remain original controls with original listeners and form ownership. No API bridge or automation. |

## Adapter readiness and fail-open

- Each adapter has a documented required-selector set and fixture contract.
- Preparation gathers DOM references and non-sensitive layout enums only; it never copies page values.
- Application writes extension-owned `data-better-albert-*` attributes and, only when absent, a journaled `tabindex="-1"` skip target through one rollback journal. It never uses `innerHTML`, clones native nodes, or moves native controls.
- Every major visible native section is assigned a documented layout region or explicitly left untouched as a safety exception.
- A primary adapter exception rolls back that adapter without poisoning future lifecycle reconciliation; shell failure removes all extension presentation.
- Reconciliation is idempotent and treats detached anchors after PeopleSoft partial replacement as stale.

## Open questions

- [x] Confirm the public launcher and authenticated application host boundary from sanitized browser evidence: `albert.nyu.edu` launches authentication, while the Albert application loads at `sis.portal.nyu.edu`.
- [x] Confirm primary authenticated navigation labels: Home, Academics, Grades & Transcripts, Finances, Personal Info, and Other Resources.
- [x] Confirm that the v0.1.0 Shadow-DOM header mounts on the authenticated `/psp/` shell and that a header-only release is visually insufficient.
- [x] Confirm shared hub-board markers from the authenticated shell: `.is_bb_LinkContainer`, `.is_bb_LinkColumn`, and `.is_bb_LinkItem`.
- [x] Confirm allowlisted read-only tool labels for all six primary navigation contexts without retaining page values.
- [x] Confirm PeopleSoft lightbox markers on a read-only degree-progress route: `body.iLightboxOpen`, `.ps_modalmask_cover`, `#pt_modals.PSMODAL`, `.ptpopuptitlebar`, `.PTPOPUP_HEADER`, and `.PTPOPUP_INNER`.
- [x] Confirm that Class Search/cart renders in a cross-origin iframe at the exact `sis.nyu.edu` component `NYU_SR_FL.NYU_SSENRL_CART_FL.GBL` and requires a second narrow manifest match.
- [ ] Capture version-stable PeopleSoft selectors for each deep transactional form; until proven, transaction forms retain native layout and semantic colors.
- [ ] Confirm which live routes render in same-origin `/psc/` child documents across Albert versions.
- [ ] Confirm the supported Chromium/browser version matrix.
- [ ] Determine whether authorized NYU font and wordmark assets can be distributed; continue using text and local fallbacks until then.

# Evidence Appendix: NYU Website Design Language

## Scope and Fidelity

This guide records the current [NYU homepage](https://www.nyu.edu/) as inspected on July 15, 2026 at 400px, 880px, and 1435px viewport widths. It covers the public NYU website only and is a build specification, not a replacement for official brand standards.

A visually exact implementation requires the authorized NYU Perstare webfont files, official torch/wordmark and icon assets, the same photography and crops, identical copy, and screenshot comparison at every breakpoint. Without those inputs, use this guide for close structural fidelity but do not claim a pixel-identical result.

## Core Character

NYU’s public website feels bold, urban, editorial, and direct. It combines NYU Violet with black-and-white layouts, oversized typography, immersive photography, flat geometry, and generous whitespace. The design avoids ornamental cards, soft shadows, and excessive rounding. Hierarchy comes from scale, contrast, alignment, and image cropping.

## Color System

| Role | Observed token | Usage |
| --- | --- | --- |
| NYU identity | `#57068C` | Navigation, primary actions, links, labels, and brand accents |
| Primary ink | `#0B0B0B` | Display headlines, body text, and black feature sections |
| White | `#FFFFFF` | Primary canvas, reversed text, and breathing space |
| Campaign violet | `#8900E1` | Occasional full-width promotional surfaces |
| Pale violet | `#EEE6F3` | Quiet branded surfaces and selected states |
| Neutral surface | `#F7F7F7` | Tab areas and low-emphasis sections |
| Muted ink | `#5C5C5C` | Captions, legal text, and metadata |
| Rule | `#E4E4E4` | Section dividers and list separators |

Use campaign violet as a solid editorial interruption, not as the default action color. Semantic success, warning, and error colors must retain their meaning and should not be replaced by violet.

## Typography

Use `"NYU Perstare", NYUPerstare, "Helvetica Neue", Helvetica, Cantarell, Ubuntu, Roboto, Noto, Arial, sans-serif`. NYU Perstare is fidelity-critical; a fallback changes character widths, wrapping, and vertical rhythm.

| Role | Size / line-height | Weight | Tracking |
| --- | --- | --- | --- |
| Body | `16px / 24px` | `400` | normal |
| Section heading | `28px / 33.6px` | `700` | `-0.42px` |
| Hero, handset | `40px / 34px` | `900` | `-1.6px` |
| Hero, 769–1199px | `48px / 40.8px` | `900` | `-1.92px` |
| Hero, 1200px+ | `84px / 71.4px` | `900` | `-3.36px` |

Keep the hero all caps and extremely compact at `0.85` line-height with `-0.04em` tracking. Use sentence case for section headings, short violet eyebrow labels where shown, and approximately 45–75 characters per line for long copy.

## Layout and Spacing

Base spacing on `4, 8, 12, 16, 20, 24, 28, 32, 48, 64, 80, 96px`. Use 20px horizontal gutters on handsets, 24px on medium layouts, and 32px on desktop.

- At 900px and above, reserve a fixed 92px violet rail. Content begins 32px after the rail and ends 32px before the right edge.
- Let the hero image span the full content width. Use `object-fit: cover`; change the crop by breakpoint instead of stretching the image.
- Stack editorial modules in one column on handsets. Restore image/text pairs, news columns, vertical dividers, and alternating image placement as width allows.
- Use 64–120px between major sections and 1px rules between related news items.
- Keep panels flat: use no card shadow and only a 3px radius on interactive controls.
- Use black, identity violet, or campaign violet bands sparingly to reset long-page rhythm.

## Responsive Behavior

The live styles include meaningful tiers at 600px, 768/769px, 900px, 1200px, and 1585px. Treat 900px as the navigation switch and 1200px as the wide-display typography switch.

- **Below 900px:** show a roughly 58px full-width violet header with hamburger/close at left, compact NYU wordmark, and search at right. Opening navigation fills the viewport with violet, locks body scrolling, lists five primary destinations with right chevrons, and pins Give, All NYU, Info For, and Log In actions at the bottom.
- **900px and above:** replace the mobile header with the fixed 92px rail. Put the official torch mark at top, five icon/label destinations down the rail, and All NYU at bottom.
- **1200px and above:** enlarge the hero title to the 84px display token and retain 32px content gutters.
- **Content reflow:** preserve document order. Images, headlines, summaries, and linked lists become a single readable column rather than shrinking desktop grids.

## Navigation and Interaction

- The desktop rail pairs simple line icons with short labels. The NYU torch mark sits at the top and “All NYU” is isolated at the bottom.
- Utility actions sit over the hero in the upper-right. Controls are rectangular and tightly grouped.
- Audience navigation opens as a solid violet dropdown with white text and no decorative container chrome.
- Search becomes a near-full-screen black overlay with a violet search field, search icon, and explicit close control.
- Use obvious selected states. The homepage’s vertical tabs use violet labels and a flat light-gray active row.
- Use the official NYU SVG marks and the same thin-stroke icon family. Do not redraw the torch, substitute emoji, or mix filled and outlined icon styles.

## Motion and Animation

Motion is functional rather than ambient. During the desktop inspection, the hero and campaign imagery remained static, ordinary scrolling did not introduce parallax or scroll-jacking, and the fixed navigation rail provided visual continuity. Content remained understandable without waiting for a reveal or animation.

### Observed Interaction Patterns

- **Audience menu:** flip the trigger chevron and reveal the solid violet list directly beneath it. Use a compact fade or slight vertical reveal; do not bounce or float the menu.
- **Search:** present the violet field, fade a black veil over the page, and move focus into the input. Closing should reverse the state clearly and return the page without a layout jump.
- **Story tabs:** update the active gray row immediately and replace the related image and copy in place. Avoid horizontal carousel travel, height animation, or movement that displaces the user’s focus.
- **Scrolling and media:** keep native scrolling and static editorial compositions. Do not autoplay the hero, campaign media, or decorative loops.
- **Links and buttons:** limit feedback to color, underline, border, opacity, or a small chevron shift. Avoid hover lift, elastic easing, and decorative bounce.

### Recommended Motion Tokens

These timings are implementation targets, not measurements of NYU’s source CSS.

| Pattern | Target duration | Treatment |
| --- | --- | --- |
| Hover or focus feedback | `100–180ms` | Color, border, underline, or opacity |
| Menu disclosure | `150–250ms` | Fade plus no more than `4px` vertical movement |
| Tab content change | `120–200ms` | Direct swap or subtle opacity crossfade |
| Search veil | `200–400ms` | Opacity with restrained ease-out |

Use standard `ease-out` for entrances and `ease-in-out` for reversible color or opacity changes. Under `prefers-reduced-motion: reduce`, remove transforms, parallax, auto-advance, and nonessential fades; preserve immediate state changes, focus movement, and visibility. Any necessary video must expose play/pause controls and must not start with sound.

## Components

### Buttons and Links

- Primary button: identity-violet fill, white `14px / 21px` text, `12px 16px` padding, 3px corners, and no shadow. The inspected button was 47px high.
- Secondary button: white fill, one-pixel violet border, violet text.
- Editorial links: bold black or violet text with a simple right arrow/chevron.
- Group related primary and secondary calls to action side by side.
- Provide visible keyboard focus and at least a 44-by-44-pixel interactive target where layout permits.

### Editorial Modules

- Use borderless image-and-copy compositions rather than floating cards.
- Crop images decisively and preserve rectangular edges.
- News lists use thin separators, bold titles, and chevrons.
- Feature sections pair one dominant image with a large headline, concise paragraph, and single action.
- Avoid gradients, badges, and pills unless they communicate a specific state or campaign identity.

### Footer

- Separate the footer with a thin gray rule.
- Use multiple aligned columns: muted legal copy, violet utility links, campus links, and social icons.
- A very pale oversized NYU wordmark may be used as background texture without reducing readability.

## Imagery

Choose candid, place-specific photography that communicates campus life, people at work, and NYU’s cities. Favor natural light, documentary framing, and strong environmental context. Preserve the source aspect ratio and focal point at each breakpoint; a different crop is visibly a different design. Use meaningful alternative text; decorative images should be hidden from assistive technology.

## Fidelity Verification

Capture and compare full-page screenshots at 400, 768, 899, 900, 1199, 1200, 1435, and 1585px. Check the closed and open mobile menu, audience dropdown, search overlay, every tab state, hover, keyboard focus, and reduced-motion mode. Confirm that NYU Perstare has loaded before comparing, that headings wrap on the same words, that image focal points match, and that no horizontal overflow exists. Pixel comparison should exclude changing editorial content only when the source page has been updated.

## Quick Review Checklist

- Is violet used deliberately rather than everywhere?
- Are headlines bold, short, and clearly separated from body copy?
- Are surfaces flat, square, and free of unnecessary shadows?
- Does imagery carry the visual emphasis?
- Do the 900px navigation and 1200px display-type switches match the live behavior?
- Are buttons 3px-radius controls, either filled violet or cleanly outlined?
- Are focus, contrast, alt text, reduced motion, and semantic structure preserved?
