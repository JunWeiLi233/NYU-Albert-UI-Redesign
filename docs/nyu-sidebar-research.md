# NYU section-navigation research

**Scope:** current, public NYU-owned sources only. Retrieved 2026-07-31. This is a design reference, not evidence that every NYU unit uses one shared component or breakpoint.

## Finding

The clearest current NYU pattern is a small, contextual **“More in this section”** navigation rather than a second full product navigation. A live NYU School of Law page shows the pattern directly: its page title is followed by the local-navigation label, the section root (`Exams`), its peer pages, and a nested list only below the current branch (`How to Find Your Exams`). [Live example: How to Find Your Exams](https://www.law.nyu.edu/academics/exams/how-to-find-your-exams)

The public [NYU Students page](https://www.nyu.edu/students.html) reinforces the separation: global destinations (Academics, Admissions, Research, University Life, and About) are distinct from the student-section links (such as Academic Services and Student Success), while utility actions and key links such as Albert remain separate. Better Albert therefore uses the rail for wayfinding and keeps page-specific detail in the content area.

### Hierarchy

```text
Page title (current page)
└─ More in this section (local-navigation label)
   └─ Section root / parent link
      ├─ Sibling link
      ├─ Current page
      │  └─ Current page's direct children
      └─ Sibling link
```

The live example establishes these useful constraints:

- Local navigation is explicitly scoped to one section, separate from the global header/menu.
- The section root provides orientation; peer links offer lateral movement.
- Deeper links are disclosed as a subordinate level beneath the active branch, not as an expanded tree of the whole site.
- The current item remains in the local list, making its position in the section visible.

## Layout pattern

For a left-side presentation, preserve the above information hierarchy as a visually quiet, single-column local rail: a short section label, a linked parent, then a vertical list with one indented child level. Do not turn it into another all-purpose launcher or expose every Albert destination at once.

The official example confirms the information structure, but NYU does **not** publish, in the sources reviewed, a universal sidebar width, exact spacing, icon rule, or breakpoint. Those visual values should therefore come from the extension’s existing design system and be validated in the target Albert pages rather than asserted as an NYU standard.

## Accessibility and responsive requirements

NYU’s published accessibility standards make the following requirements directly applicable to a local rail:

- **Consistent placement and order:** repeated navigation mechanisms—including left-hand navigation bars—must remain in the same relative order across a page set. NYU explicitly allows sub-navigation; consistency does not prohibit it. [NYU: 3.2.3 Consistent Navigation](https://digitalaccessibility.nyu.edu/testing/sc323.html)
- **Keyboard access:** every navigation link and any expand/collapse control must be usable with the keyboard, without timing-dependent keystrokes. [NYU: 2.1.1 Keyboard](https://digitalaccessibility.nyu.edu/testing/sc211.html)
- **Bypass route:** because a persistent rail is repeated content, provide a working skip-to-main-content route when the repeated block has many focusable controls; moving the viewport alone is insufficient—the keyboard focus must move. Semantic `nav`/`main` structure and headings also matter. [NYU: 2.4.1 Bypass Blocks](https://digitalaccessibility.nyu.edu/testing/sc241.html)
- **Responsive/reflow behavior:** at 320 CSS px (also the effective width at 400% zoom from 1280 px), content and controls must remain available without two-dimensional scrolling. Fixed or anchored sidebars must not overlap, clip, or hide content. [NYU: 1.4.10 Reflow](https://digitalaccessibility.nyu.edu/testing/sc1410.html)

## Implications for Better Albert

- Simplify the sidebar to the **current Albert workflow/section**, its nearest peers, and at most the active item’s direct children.
- Keep the local rail distinct from the global header; avoid duplicating every destination in both places.
- Use clear current-state styling and a parent/child indentation relationship; retain the native controls and links underneath rather than replacing them.
- On narrow layouts or high zoom, let the rail reflow into a compact, keyboard-operable local-navigation control or a stacked section above the main content—never a permanently fixed column that forces horizontal scrolling.
- Preserve a logical DOM/focus order (global header, local navigation, main content) and provide a skip route whenever the rail becomes link-dense.

## Evidence and limits

- **Official live implementation evidence:** [NYU School of Law — How to Find Your Exams](https://www.law.nyu.edu/academics/exams/how-to-find-your-exams) (retrieved 2026-07-31). It exposes the local-section hierarchy and nested active branch in the current page content.
- **Official NYU policy/guidance evidence:** [Consistent Navigation](https://digitalaccessibility.nyu.edu/testing/sc323.html), [Keyboard](https://digitalaccessibility.nyu.edu/testing/sc211.html), [Bypass Blocks](https://digitalaccessibility.nyu.edu/testing/sc241.html), and [Reflow](https://digitalaccessibility.nyu.edu/testing/sc1410.html).
- **Caveat:** NYU’s accessibility testing pages cite WCAG 2.0 as the university-adopted standard, while its Reflow page covers WCAG 2.1. Treat them as NYU’s published testing guidance, not as a claim that this extension has a separate NYU certification requirement.
