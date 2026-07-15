# Better Albert Design

## Source of truth

- Status: Active
- Last refreshed: July 16, 2026
- Primary product surfaces: the first-slice extension header and native Albert content; dashboard and class-search surfaces remain future work.
- Evidence reviewed: this file's NYU website evidence appendix, `nyu-albert-extension-plan.md`, and the implemented first-slice source and sanitized fixture.

## Brand

- Personality: institutional, clear, calm, editorial, trustworthy, and functional.
- Trust signals: label the extension as an unofficial local enhancement, keep native Albert visible, make disablement obvious, and never imply that extension-rendered content is authoritative.
- Avoid: generic SaaS chrome, marketing-page layouts, gradients, glass effects, excessive rounding or shadows, decorative motion, and unofficial recreations of NYU marks.

## Product goals

- Goals: give Albert an NYU-aligned presentation, establish safe extension lifecycle behavior, and preserve immediate access to the native interface.
- Non-goals: redesigning dashboard or class search in this slice; changing authentication; automating login or transactions; replacing Albert data or controls.
- Success signals: the isolated header mounts only on the supported host, can be disabled, fails open, passes automated checks, and stores no student data.

## Personas and jobs

- Primary personas: NYU students using Albert in a Chromium browser.
- User jobs: recognize the enhancement, keep using native Albert, and disable the enhancement instantly when desired.
- Key contexts of use: authenticated, data-sensitive academic workflows where clarity and native-system trust matter more than decoration.

## Information architecture

- Primary navigation: none added in the first slice.
- Core routes/screens: the observed `https://sis.portal.nyu.edu/*` top-frame Albert surface only; the `albert.nyu.edu` login launcher is excluded.
- Content hierarchy: a compact extension identity/disable header precedes untouched native Albert navigation and page content.

## Design principles

- Progressive enhancement: extension UI must be additive, isolated, removable, and non-blocking.
- Institutional restraint: use violet for identity, focus, and selected actions rather than as a universal surface color.
- Trust native Albert: do not hide or replace native content before a future adapter has reliable extraction evidence.
- Tradeoffs: choose a small, flat header and system-font fallback over unofficial assets, remote fonts, or public-site layout imitation.

## Visual language

- Color: identity violet `#57068C`, black, white, pale violet, and quiet neutrals; semantic colors retain their conventional meanings.
- Typography: prefer NYU Perstare only when an authorized local font is available, followed by the documented system sans-serif stack.
- Spacing/layout rhythm: use the documented 4px-based scale and compact application density.
- Shape/radius/elevation: flat surfaces, 1px rules, 3px interactive-control radius, and no decorative shadow.
- Motion: 100–180ms functional feedback only, removed under reduced motion.
- Imagery/iconography: none in the first slice; do not redraw the torch or substitute emoji.

## Components

- Existing components to reuse: native Albert content and controls remain untouched.
- New/changed components: one `AppHeader` with extension identity, unofficial status, and disable action.
- Variants and states: default, hover, focus, active, and disabling.
- Token/component ownership: `src/design-system/tokens.css` owns extension tokens; `AppHeader` consumes them inside its Shadow DOM.

## Accessibility

- Target standard: WCAG 2.1 AA.
- Keyboard/focus behavior: the disable action is a native button with a visible focus ring and a 44px minimum target.
- Contrast/readability: violet, ink, white, and neutral combinations must meet AA for their text role.
- Screen-reader semantics: use a labelled semantic header and explicit button text.
- Reduced motion and sensory considerations: remove nonessential transitions under `prefers-reduced-motion`; never rely on color alone.

## Responsive behavior

- Supported breakpoints/devices: the first slice adapts at 599px and 420px; broader navigation tiers remain future work.
- Layout adaptations: reduce gutters and secondary status copy on narrow screens while retaining the product name and disable action.
- Touch/hover differences: keep the disable target at least 44px high and never make hover the only feedback state.

## Interaction states

- Loading: do not show a blocking loader; mount at `document_idle`.
- Empty: not applicable to the first-slice header.
- Error: remove partial extension UI and leave native Albert unchanged.
- Success: show the compact header without hiding native content.
- Disabled: remove the header immediately and retain only the storage-change listener needed for re-enablement.
- Offline/slow network: no extension network requests or remote assets are allowed.

## Content voice

- Tone: direct, calm, transparent, and concise.
- Terminology: use “Better Albert,” “unofficial local enhancement,” and explicit native-system language.
- Microcopy rules: describe actual state; do not imply official NYU endorsement or transaction success.

## Implementation constraints

- Framework/styling system: React and TypeScript built by Vite/CRXJS; Shadow DOM with inline-bundled, component-scoped CSS.
- Design-token constraints: tokens are prefixed `--ba-` and never written to the page root.
- Performance constraints: no polling, observers, remote assets, or page-data extraction in the first slice.
- Compatibility constraints: Manifest V3 Chromium baseline; exact host and top frame only until real navigation evidence exists.
- Test/screenshot expectations: fixture integration tests must prove mounting, idempotency, disablement, and fail-open cleanup; live screenshot fidelity waits for an approved sanitized browser surface.

## Open questions

- [x] Confirm the public launcher and authenticated application host boundary from sanitized browser evidence: `albert.nyu.edu` launches authentication, while the Albert application loads at `sis.portal.nyu.edu`.
- [ ] Confirm durable DOM markers and internal navigation/frame behavior before adding adapters or expanding detection.
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
