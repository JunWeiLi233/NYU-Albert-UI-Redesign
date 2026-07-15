# Better Albert — NYU-Aligned Browser Extension Plan

## 1. Project Overview

**Better Albert** is a local-first browser extension that redesigns the NYU Albert frontend so that it visually aligns with the current NYU website design language while preserving Albert’s existing backend, authentication, validation, and transactional behavior.

The extension should improve:

- Visual hierarchy
- Navigation
- Class search
- Schedule presentation
- Enrollment workflows
- Holds and tasks
- Grades and academic progress
- Financial information presentation
- Mobile responsiveness
- Accessibility
- Overall usability

The extension must **not** replace Albert’s backend or bypass any NYU authentication, validation, enrollment, payment, or security mechanisms.

---

## 2. Core Product Principle

> Apply NYU’s visual identity to Albert’s task-oriented workflows without turning Albert into a marketing website.

NYU.edu is an editorial and public-facing website. Albert is a high-density student information system. The extension should borrow NYU’s:

- Violet, black, white, and neutral palette
- Strong typography hierarchy
- Clear spacing
- Editorial confidence
- Restrained use of decoration
- Accessibility standards

It should not copy NYU.edu page layouts literally.

The resulting product should feel like:

> **NYU.edu visual identity + modern student dashboard + Albert’s existing functionality**

---

## 3. Feasibility

A browser extension can implement most of the proposed frontend redesign.

### The extension can

- Inject a redesigned application shell
- Restyle Albert pages
- Read data already rendered in the DOM
- Convert tables into clearer cards or structured views
- Add a responsive sidebar
- Add a mobile navigation drawer
- Build a better dashboard
- Improve class-search filters and results
- Render a weekly schedule
- Improve holds, tasks, grades, and finances presentation
- Save local UI preferences
- Add accessibility improvements
- Bridge redesigned controls to Albert’s existing native controls

### The extension cannot safely or reliably

- Replace NYU authentication
- Bypass MFA
- Bypass CAPTCHA
- Replace Albert’s backend
- Invent data unavailable in the current page
- Directly replace enrollment transaction logic
- Directly replace payment processing
- Bypass registration restrictions
- Circumvent holds
- Reliably depend on undocumented private APIs
- Store or transmit student data without creating major privacy risk

---

## 4. Recommended Product Scope

Build the extension as a **progressive enhancement layer**.

### Level 1 — Visual Reskin

- NYU-aligned color system
- Typography
- Spacing
- Buttons
- Forms
- Tables
- Alerts
- Focus states

### Level 2 — Structural Enhancement

- New application header
- Sidebar navigation
- Redesigned alerts
- Course cards
- Better filters
- Responsive layouts
- Schedule visualization

### Level 3 — Replacement Views

- Hide selected legacy Albert sections
- Extract data from Albert’s DOM
- Render a replacement dashboard or class-search view
- Keep native Albert controls available as the transaction bridge

### Level 4 — Full Frontend Replacement

Not recommended for the first version.

A full replacement would require stable backend APIs, authentication integration, institutional permission, security review, and significant maintenance.

---

## 5. Product Goals

### Primary goals

1. Make Albert easier to understand.
2. Reduce the number of clicks required for common tasks.
3. Surface urgent and blocking information.
4. Present schedules and enrollment information clearly.
5. Preserve transaction safety.
6. Match NYU’s visual identity.
7. Avoid sending student data outside the browser.
8. Meet WCAG 2.1 AA expectations.

### Non-goals

- Replacing the Albert backend
- Automating enrollment
- Bypassing NYU security systems
- Scraping student information to an external server
- Rebuilding payment flows
- Creating unofficial academic calculations that could mislead users
- Claiming the extension is an official NYU product

---

## 6. Main User Workflows

The extension should prioritize these workflows:

1. View the current schedule
2. Find classes
3. Review course details
4. Add a class to the shopping cart
5. Review enrollment readiness
6. Enroll through Albert’s existing workflow
7. Swap or drop classes safely
8. Check registration appointments
9. Resolve holds and tasks
10. View grades
11. Review degree progress
12. Review account and financial-aid information
13. Update personal information through native Albert pages

---

## 7. Information Architecture

```text
Overview
├── Current semester
├── Upcoming deadlines
├── Registration appointment
├── Holds and tasks
├── Today’s schedule
└── Quick actions

Academics
├── Class search
├── Shopping cart
├── Enrollment
├── Schedule
├── Grades
└── Degree progress

Finances
├── Account balance
├── Financial aid
└── Payment activity

Profile
├── Personal information
├── Addresses
├── Emergency contacts
└── Guest users

Extension Settings
├── Theme
├── Density
├── Navigation behavior
├── Accessibility preferences
└── Reset extension
```

---

## 8. Application Shell

### Desktop

```text
┌──────────────────────────────────────────────────────┐
│ NYU | Better Albert      Search    Help    Account   │
├───────────────┬──────────────────────────────────────┤
│ Overview      │ Page content                         │
│ Academics     │                                      │
│ Enrollment    │                                      │
│ Schedule      │                                      │
│ Grades        │                                      │
│ Finances      │                                      │
│ Profile       │                                      │
│ Settings      │                                      │
└───────────────┴──────────────────────────────────────┘
```

### Mobile

Use:

- Compact NYU header
- Menu button
- Slide-out navigation drawer
- Sticky page title when useful
- Bottom action area for important transactional actions
- Native Albert controls retained for final submissions

---

## 9. Design Language

### Design character

The interface should feel:

- Institutional
- Clear
- Calm
- Editorial
- Trustworthy
- Functional
- Accessible
- Modern without looking like a generic SaaS dashboard

### Avoid

- Excessive rounded cards
- Glassmorphism
- Gradients used as decoration
- Oversized shadows
- Excessive purple backgrounds
- Pill-shaped controls everywhere
- Decorative charts without functional value
- Animations that slow down task completion
- Hiding critical details behind multiple modals

---

## 10. Design Tokens

```css
:root {
  --nyu-violet: #57068c;
  --nyu-violet-hover: #400066;
  --nyu-violet-active: #330052;
  --nyu-ultraviolet: #8900e1;

  --color-black: #111111;
  --color-white: #ffffff;

  --text-primary: #111111;
  --text-secondary: #5f5f5f;
  --text-muted: #767676;
  --text-inverse: #ffffff;

  --surface-page: #f7f7f7;
  --surface-primary: #ffffff;
  --surface-secondary: #f1f1f1;
  --surface-hover: #ececec;

  --border-subtle: #dedede;
  --border-strong: #a8a8a8;

  --success: #18794e;
  --success-bg: #edf8f2;

  --warning: #8a6100;
  --warning-bg: #fff7db;

  --danger: #b42318;
  --danger-bg: #fff1f0;

  --info: #175cd3;
  --info-bg: #eff6ff;

  --font-sans: Inter, Arial, Helvetica, sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;

  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.7;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  --shadow-card: 0 1px 3px rgb(0 0 0 / 8%);
  --shadow-overlay: 0 12px 30px rgb(0 0 0 / 16%);

  --sidebar-width: 16rem;
  --content-max-width: 90rem;
}
```

Use violet primarily for:

- Branding
- Active navigation
- Primary actions
- Focus indicators
- Selected states
- Important highlights

Do not use violet as the background of every component.

---

## 11. Technology Stack

Recommended stack:

- Manifest V3
- TypeScript
- React
- Vite
- CRXJS or another maintained extension build plugin
- CSS Modules or scoped plain CSS
- React Aria or accessible custom primitives
- Vitest
- Playwright
- axe-core
- ESLint
- Prettier

Avoid large dependencies unless they provide clear value.

---

## 12. Suggested Repository Structure

```text
better-albert/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   ├── bootstrap.ts
│   │   ├── page-detector.ts
│   │   ├── observer.ts
│   │   ├── history-listener.ts
│   │   └── frame-bridge.ts
│   ├── adapters/
│   │   ├── base/
│   │   │   ├── page-adapter.ts
│   │   │   └── adapter-registry.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.adapter.ts
│   │   │   ├── dashboard.selectors.ts
│   │   │   └── dashboard.types.ts
│   │   ├── class-search/
│   │   ├── course-details/
│   │   ├── shopping-cart/
│   │   ├── enrollment/
│   │   ├── schedule/
│   │   ├── grades/
│   │   ├── degree-progress/
│   │   ├── finances/
│   │   └── profile/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── AppShell.tsx
│   │   └── routes.ts
│   ├── components/
│   │   ├── navigation/
│   │   ├── alerts/
│   │   ├── courses/
│   │   ├── schedule/
│   │   ├── tables/
│   │   ├── forms/
│   │   ├── dialogs/
│   │   └── feedback/
│   ├── design-system/
│   │   ├── tokens.css
│   │   ├── reset.css
│   │   ├── typography.css
│   │   ├── utilities.css
│   │   └── themes.css
│   ├── native-bridge/
│   │   ├── activate-control.ts
│   │   ├── native-form.ts
│   │   └── transaction-guard.ts
│   ├── storage/
│   │   ├── preferences.ts
│   │   └── migrations.ts
│   ├── messaging/
│   │   ├── messages.ts
│   │   └── schema.ts
│   ├── shared/
│   │   ├── constants.ts
│   │   ├── logger.ts
│   │   ├── result.ts
│   │   └── sanitization.ts
│   └── options/
│       ├── OptionsApp.tsx
│       └── options.html
├── tests/
│   ├── fixtures/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── selectors.md
│   ├── privacy.md
│   └── accessibility.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 13. Manifest Strategy

Start with the narrowest possible permissions.

```json
{
  "manifest_version": 3,
  "name": "Better Albert",
  "version": "0.1.0",
  "description": "A local-first interface redesign for NYU Albert.",
  "permissions": ["storage"],
  "host_permissions": [
    "https://albert.nyu.edu/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://albert.nyu.edu/*"
      ],
      "js": ["src/content/bootstrap.ts"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "options_page": "src/options/options.html",
  "action": {
    "default_title": "Better Albert"
  }
}
```

The real host list should be determined from actual Albert navigation.

Do not ship broad permissions such as:

```text
https://*.nyu.edu/*
<all_urls>
```

unless they are demonstrably required.

---

## 14. Page Adapter Architecture

Each Albert page should have its own adapter.

```ts
export interface PageAdapter<TData> {
  id: string;

  matches(context: PageContext): boolean;

  extract(context: PageContext): TData;

  mount(context: PageContext, data: TData): void;

  update?(context: PageContext, data: TData): void;

  destroy(context: PageContext): void;
}
```

Example context:

```ts
export interface PageContext {
  window: Window;
  document: Document;
  location: Location;
  frameType: "top" | "child";
}
```

Adapter requirements:

- Page-specific selectors
- Clear extraction types
- Idempotent mounting
- Graceful failure
- No destructive DOM mutation unless necessary
- Native controls retained
- Logging disabled by default in production
- Tests built against sanitized HTML fixtures

---

## 15. Page Detection

Albert may use:

- Traditional page loads
- Partial page updates
- Iframes
- Popups
- Legacy PeopleSoft components
- Delayed content rendering
- URL changes without full reload

The extension should detect page state through:

1. URL and hostname
2. Stable page markers
3. Document title
4. Known root containers
5. Visible headings
6. Frame context

Do not identify pages using a single fragile CSS class when multiple signals are available.

---

## 16. Dynamic Navigation and Mutation Handling

Use a debounced `MutationObserver`.

```ts
let scheduled = false;

const observer = new MutationObserver(() => {
  if (scheduled) return;

  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;
    detectAndMountCurrentPage();
  });
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
```

Also monitor:

- `history.pushState`
- `history.replaceState`
- `popstate`
- iframe load events

Mount logic must be idempotent:

```ts
function detectAndMountCurrentPage(): void {
  const adapter = registry.findMatchingAdapter({
    window,
    document,
    location,
    frameType: window.top === window ? "top" : "child"
  });

  if (!adapter) {
    unmountCurrentAdapter();
    return;
  }

  if (activeAdapter?.id === adapter.id) {
    refreshCurrentAdapter();
    return;
  }

  unmountCurrentAdapter();

  const data = adapter.extract(createPageContext());
  adapter.mount(createPageContext(), data);
  activeAdapter = adapter;
}
```

---

## 17. Shadow DOM Strategy

Use Shadow DOM for isolated replacement interfaces.

Recommended:

- Shadow DOM for the extension app shell
- Shadow DOM for replacement dashboard panels
- Scoped CSS for inline enhancements
- Native Albert controls for transaction submission

Example:

```ts
const host = document.createElement("div");
host.id = "better-albert-host";

const shadowRoot = host.attachShadow({ mode: "open" });

const mountRoot = document.createElement("div");
mountRoot.id = "better-albert-root";

shadowRoot.append(mountRoot);
document.body.prepend(host);
```

Do not place all enhancements in Shadow DOM automatically. Inline labels, status indicators, and native control enhancements may need to remain in the main document.

---

## 18. Iframe Strategy

When Albert content appears inside a same-origin or cross-origin iframe:

1. Run a content script in every relevant frame.
2. Let each frame parse its own DOM.
3. Send normalized data through extension messaging.
4. Validate every message.
5. Render top-level navigation only in the top frame.
6. Avoid exposing student information through unsafe `window.postMessage` flows.

Example message:

```ts
export type BetterAlbertMessage =
  | {
      type: "PAGE_DATA";
      source: "schedule";
      payload: ScheduleData;
    }
  | {
      type: "NATIVE_ACTION_RESULT";
      actionId: string;
      success: boolean;
      error?: string;
    };
```

---

## 19. Native Transaction Bridge

The extension should redesign transaction preparation but defer final execution to Albert.

Example flow:

```text
Redesigned course result
        ↓
User chooses Add to Cart
        ↓
Extension finds matching native control
        ↓
Extension activates native Albert control
        ↓
Albert performs authentication and validation
        ↓
Extension observes the resulting page state
        ↓
Extension updates its interface
```

Example helper:

```ts
export function activateNativeControl(selector: string): void {
  const control = document.querySelector<HTMLElement>(selector);

  if (!control) {
    throw new Error(`Native Albert control not found: ${selector}`);
  }

  if (
    control instanceof HTMLButtonElement &&
    control.disabled
  ) {
    throw new Error("Native Albert control is disabled.");
  }

  control.click();
}
```

Never reconstruct enrollment or payment requests by reverse-engineering private endpoints in the initial product.

---

## 20. Dashboard Redesign

The dashboard should answer:

1. What needs my attention?
2. What is happening today?
3. What can I do next?

Recommended layout:

```text
Good evening
Fall 2026

Needs attention
- Registration appointment
- Blocking holds
- Required tasks
- Upcoming deadlines

Today
- Schedule timeline
- Class locations
- Relevant status changes

Enrollment
- Credits enrolled
- Shopping-cart count
- Waitlisted courses
- Search classes
- Review cart

Academic progress
- Credits completed
- Current term summary
- Degree progress link

Finances
- Current balance
- Financial-aid action items
- Payment link
```

Important statuses should be semantic:

- Informational
- Success
- Warning
- Blocking
- Destructive

Do not mark every registration-related item as urgent.

---

## 21. Class Search Redesign

### Desktop layout

```text
┌────────────────────┬────────────────────────────────┐
│ Filters            │ Search results                 │
│                    │                                │
│ Term               │ Course card                    │
│ Subject            │ Course card                    │
│ Level              │ Course card                    │
│ Days               │ Course card                    │
│ Time               │                                │
│ Campus             │                                │
│ Open only          │                                │
└────────────────────┴────────────────────────────────┘
```

Each result should expose:

- Subject and catalog number
- Course title
- Section
- Instructor
- Days and times
- Campus
- Building and room when available
- Credits
- Open, waitlist, or closed status
- Seat availability when available
- Prerequisites
- Corequisites
- Enrollment restrictions
- Schedule conflicts
- Add-to-cart action
- Course details action

Use an expandable panel or detail drawer rather than multiple nested modals.

---

## 22. Shopping Cart and Enrollment

The redesigned shopping cart should show:

- Course
- Section
- Schedule
- Instructor
- Credits
- Enrollment status
- Prerequisite issues
- Time conflicts
- Duplicate-course issues
- Total credits
- Native validation status

Recommended flow:

```text
Shopping cart
    ↓
Review validation results
    ↓
Review credit load
    ↓
Review conflicts and warnings
    ↓
Continue to Albert enrollment review
    ↓
Final native Albert submission
```

The extension should never imply that enrollment succeeded until Albert confirms it.

---

## 23. Drop and Swap Safety

Dropping and swapping classes are consequential actions.

A drop flow should clearly show:

- Course being dropped
- Current credit load
- Resulting credit load
- Potential full-time status impact
- Possible financial implications
- Whether the action is reversible
- Final native confirmation step

Example:

```text
Drop CSCI-UA 102?

Dropping this class will reduce your enrolled load
from 16 credits to 12 credits.

This may affect full-time status, tuition, financial aid,
housing, immigration status, or academic progress.

Cancel
Continue to Albert review
```

Do not calculate legal, financial-aid, immigration, or tuition consequences unless Albert provides authoritative information. Use cautious language and link back to official resources.

---

## 24. Schedule View

Offer:

- Day view
- Week view
- List view
- Accessible table view
- Course color labels
- Building and room information
- Time conflict indicators
- Compact mobile view

The accessible table view should remain available even when a visual calendar is shown.

Do not rely on color alone.

---

## 25. Grades and Degree Progress

The grades page should:

- Preserve official grades exactly
- Clearly label current and historical terms
- Avoid calculating unofficial GPA unless explicitly labeled
- Avoid implying unofficial calculations are authoritative
- Present credits attempted and earned clearly
- Provide accessible tables
- Link to native degree-progress tools

If an unofficial GPA calculator is added:

- Make it opt-in
- Keep it local
- Label it as an estimate
- Document the formula
- Never overwrite official values

---

## 26. Finances

Financial pages contain highly sensitive information.

Rules:

- Do not persist balances
- Do not transmit data
- Do not log page content
- Do not expose information in extension notifications
- Do not replace payment forms
- Do not inject code into payment provider pages unless strictly required
- Prefer visual improvements around existing native content
- Keep native payment links and confirmations

---

## 27. Privacy and Security

The safest product architecture has:

```text
No external backend
No analytics SDK
No advertising
No remote logging
No session-cookie access
No password access
No transmission of student data
No storage of grades
No storage of balances
No storage of holds
No storage of schedules by default
```

Allowed local storage:

- Theme
- Compact mode
- Sidebar state
- Saved filter preferences
- Onboarding completion
- Feature flags
- Extension version migrations

Use `chrome.storage.local` for extension preferences.

Do not use `localStorage` as the primary extension storage mechanism.

---

## 28. Accessibility Requirements

Target WCAG 2.1 AA.

Required:

- Full keyboard navigation
- Visible focus indicators
- Skip links
- Semantic headings
- Semantic tables
- Proper labels
- Clear validation errors
- Screen-reader announcements for dynamic updates
- Minimum touch target sizes
- Color contrast compliance
- Status text in addition to color
- Logical reading order
- Reduced-motion support
- Zoom support up to 200%
- High-contrast mode compatibility
- Accessible dialogs with focus trapping and restoration

Testing must include both automated and manual checks.

---

## 29. Performance Requirements

The extension should:

- Avoid constant polling
- Avoid observing the entire DOM when a narrower target is available
- Batch DOM reads and writes
- Debounce mutation responses
- Lazy-load page-specific React code
- Avoid rendering duplicate roots
- Avoid unnecessary network requests
- Keep the content-script bundle small
- Preserve Albert’s native responsiveness
- Fail open, leaving Albert usable if the extension crashes

Target behavior:

- Initial enhancement should not visibly block the page.
- Disabling the extension should immediately restore native Albert.
- A failed adapter should not break unrelated pages.

---

## 30. Failure and Recovery Behavior

Every adapter should handle missing selectors.

Example:

```ts
type ExtractionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: "unsupported-page" | "missing-selector" | "unexpected-markup";
      details?: string;
    };
```

On failure:

1. Do not hide native content.
2. Do not display partial transactional data as authoritative.
3. Show a small non-blocking extension error only when useful.
4. Allow the user to disable the enhancement for the current page.
5. Record only non-sensitive diagnostic metadata locally when debug mode is enabled.

---

## 31. Testing Strategy

### Unit tests

Test:

- Data parsers
- Status normalization
- Course extraction
- Time parsing
- Schedule conflict detection
- Preference migrations
- Message validation
- Selector fallbacks

### Fixture tests

Use sanitized HTML fixtures:

```text
tests/fixtures/
├── dashboard.html
├── dashboard-missing-holds.html
├── class-search.html
├── class-search-empty.html
├── course-details.html
├── shopping-cart.html
├── schedule.html
├── grades.html
└── finances.html
```

Never commit real student information.

### Integration tests

Test:

- Adapter matching
- Adapter mounting
- DOM replacement
- Shadow DOM rendering
- Native control activation
- Re-mounting after page navigation
- Iframe messaging
- Extension disable and recovery

### End-to-end tests

Use Playwright with mocked or saved pages.

Test:

- Keyboard navigation
- Mobile layout
- Course search
- Add-to-cart bridge
- Enrollment review bridge
- Drop warning flow
- Accessibility
- Mutation handling
- Missing-selector recovery

### Accessibility tests

Use:

- axe-core
- Keyboard-only testing
- VoiceOver on macOS
- NVDA on Windows when possible
- Browser zoom
- Reduced-motion preference
- High-contrast mode

---

## 32. Development Workflow

Use small vertical slices.

For every feature:

1. Inspect the relevant Albert page.
2. Save a sanitized fixture.
3. Identify stable selectors.
4. Write extraction tests.
5. Implement the adapter.
6. Render the replacement or enhancement.
7. Connect native actions.
8. Add accessibility checks.
9. Test failure behavior.
10. Commit the completed slice.

Do not build all pages before testing the first real workflow.

---

## 33. Recommended Implementation Phases

### Phase 0 — Repository and Discovery

Deliverables:

- Extension project scaffold
- Manifest V3
- TypeScript
- Vite
- React
- Linting and formatting
- Test setup
- Documentation
- Host-permission audit
- Sanitized fixture process

### Phase 1 — Design System and Shell

Deliverables:

- Design tokens
- Typography
- Buttons
- Forms
- Alerts
- Tables
- Application header
- Sidebar
- Mobile navigation
- Settings page
- Enable/disable toggle

### Phase 2 — Dashboard

Deliverables:

- Dashboard adapter
- Registration appointment
- Holds and tasks
- Today’s schedule
- Quick actions
- Enrollment summary
- Graceful fallback

### Phase 3 — Class Search

Deliverables:

- Search adapter
- Filter layout
- Course result cards
- Status badges
- Course detail drawer
- Native add-to-cart bridge
- Search preference storage

### Phase 4 — Shopping Cart and Enrollment Review

Deliverables:

- Cart adapter
- Validation summary
- Credit count
- Conflict warnings
- Native enrollment review bridge
- Confirmation-state observation

### Phase 5 — Schedule, Grades, and Degree Progress

Deliverables:

- Weekly schedule
- Accessible table view
- Grades redesign
- Academic progress summary
- Native tool links

### Phase 6 — Finances and Profile

Deliverables:

- Conservative visual enhancement
- No sensitive persistence
- Native payment and profile forms preserved
- Privacy review

### Phase 7 — Hardening

Deliverables:

- Cross-frame support
- Selector fallback strategy
- Performance audit
- Accessibility audit
- Privacy audit
- Browser compatibility testing
- Documentation
- Release packaging

---

## 34. Initial MVP

The first usable release should include only:

1. Extension shell
2. Design system
3. Dashboard enhancement
4. Class-search redesign
5. Course-details view
6. Add-to-cart native bridge
7. Local settings
8. Accessibility baseline
9. No external server

This is enough to validate the core idea without overcommitting to every Albert page.

---

## 35. Definition of Done

A feature is complete when:

- It works on a sanitized fixture.
- It works on the live page used for development.
- It handles missing selectors.
- It does not hide native content until extraction succeeds.
- It is keyboard accessible.
- It passes automated accessibility checks.
- It does not transmit student data.
- It preserves Albert’s native transaction behavior.
- It has tests.
- It has documentation.
- Disabling the feature restores the native interface.

---

## 36. Acceptance Criteria

### Application shell

- Matches NYU-inspired design tokens
- Does not resemble a generic SaaS template
- Responsive on desktop and mobile
- Keyboard navigable
- Can be disabled

### Dashboard

- Shows only data extracted from Albert
- Clearly distinguishes warnings from blocking issues
- Does not persist sensitive information
- Keeps native links available

### Class search

- Shows course details clearly
- Exposes status and restrictions
- Provides accessible filters
- Bridges to native add-to-cart behavior
- Does not send direct enrollment requests

### Transactions

- Uses Albert’s native controls
- Displays review steps
- Does not claim success before confirmation
- Preserves native errors and validation

### Privacy

- No analytics
- No remote backend
- No grade or financial-data storage
- Minimal host permissions
- No password or cookie handling

### Reliability

- Idempotent mounting
- Handles partial page updates
- Handles supported iframes
- Fails open
- Does not prevent native Albert use

---

# AI Coding Agent Prompt

Copy the following prompt into Codex, Claude Code, or another repository-aware coding agent.

```text
You are working on a browser extension called Better Albert.

MISSION

Build a local-first Manifest V3 browser extension that redesigns the NYU
Albert frontend so it visually aligns with the NYU website design language
while preserving Albert's existing backend, authentication, validation,
and transactional behavior.

The extension is an enhancement layer, not a backend replacement.

CORE PRODUCT PRINCIPLES

1. Use NYU Violet #57068C, black, white, and restrained neutral surfaces.
2. Use violet for branding, active navigation, focus states, selected
   states, and primary actions. Do not make every card purple.
3. Create a strong editorial and institutional visual hierarchy.
4. Avoid generic SaaS styling, excessive rounded cards, gradients,
   glassmorphism, oversized shadows, and decorative dashboards.
5. Keep Albert's backend and native transaction controls as the source of
   truth.
6. Do not automate login, bypass MFA, bypass CAPTCHA, bypass holds, or
   reimplement payment and enrollment APIs.
7. Do not transmit student data outside the browser.
8. Do not add analytics, telemetry, advertisements, or remote logging.
9. Do not persist grades, financial balances, holds, tasks, names, NetIDs,
   or schedules by default.
10. The extension must fail open: if an enhancement fails, native Albert
    must remain usable.

FIRST TASK: AUDIT BEFORE IMPLEMENTATION

Inspect the repository before changing code.

Report:

- Existing project structure
- Build system
- Manifest version
- Content-script entry points
- Existing host permissions
- Existing page detection
- Existing UI framework
- Existing tests
- Current privacy risks
- Current architectural weaknesses
- The smallest safe vertical slice to implement first

Do not rewrite the repository before understanding it.

TARGET STACK

Prefer:

- Manifest V3
- TypeScript
- React
- Vite
- CRXJS or the repository's existing maintained extension plugin
- CSS Modules or scoped plain CSS
- Vitest
- Playwright
- axe-core
- ESLint
- Prettier

Reuse the existing architecture where reasonable. Do not replace working
tooling without a concrete reason.

ARCHITECTURE

Use page-specific adapters rather than one large content script.

Define an adapter interface similar to:

interface PageAdapter<TData> {
  id: string;
  matches(context: PageContext): boolean;
  extract(context: PageContext): ExtractionResult<TData>;
  mount(context: PageContext, data: TData): void;
  update?(context: PageContext, data: TData): void;
  destroy(context: PageContext): void;
}

Each adapter must:

- Use multiple page signals where possible
- Keep selectors isolated
- Return typed normalized data
- Mount idempotently
- Handle missing selectors
- Avoid hiding native content before extraction succeeds
- Preserve native controls
- Include tests using sanitized HTML fixtures

PAGE LIFECYCLE

Albert may use full page loads, partial DOM updates, legacy PeopleSoft
components, iframes, popups, and URL changes without reloads.

Implement:

- URL-based detection
- Stable page-marker detection
- Debounced MutationObserver handling
- pushState and replaceState detection
- popstate detection
- iframe-aware behavior
- adapter cleanup before mounting a different adapter
- duplicate-root prevention

Do not use constant polling.

STYLE ISOLATION

Use Shadow DOM for replacement application shells and large custom views.
Use scoped CSS for inline enhancements that must remain next to native
controls.

Do not allow extension styles to globally break Albert.

NATIVE TRANSACTION BRIDGE

For add, enroll, drop, swap, payment, and profile-update actions:

- Do not reconstruct undocumented network requests.
- Do not directly call private Albert APIs.
- Locate and invoke the corresponding native Albert control.
- Preserve Albert's validation and confirmation steps.
- Observe the resulting native state.
- Never claim success until Albert confirms success.

SECURITY AND PRIVACY

The finished extension must have:

- No external backend
- No analytics SDK
- No advertising
- No remote logs
- No password access
- No session-cookie access
- No storage of grades
- No storage of financial balances
- No storage of holds
- No storage of student identity data
- Minimal host permissions
- Runtime message validation

Only store interface preferences such as:

- Theme
- Density
- Sidebar state
- Saved non-sensitive search filters
- Feature flags
- Onboarding completion

DESIGN SYSTEM

Create reusable tokens and components before page-specific styling.

Required tokens:

- NYU Violet #57068C
- Violet hover and active states
- Black and white
- Neutral page, surface, border, and text colors
- Success, warning, danger, and information statuses
- Restrained border radii
- Spacing scale
- Typography scale
- Focus-ring treatment

Required components:

- App shell
- Header
- Sidebar
- Mobile navigation
- Page header
- Alert
- Status badge
- Button
- Icon button
- Text input
- Select
- Checkbox
- Accessible dialog
- Drawer
- Table
- Empty state
- Error state
- Loading state
- Course card
- Schedule item

ACCESSIBILITY

Target WCAG 2.1 AA.

Require:

- Full keyboard navigation
- Visible focus states
- Semantic headings
- Semantic tables
- Proper labels
- Accessible validation errors
- Screen-reader announcements for dynamic updates
- Status text in addition to color
- Reduced-motion support
- 200% zoom support
- Accessible dialogs with focus trapping and restoration
- Minimum mobile target sizes

Use automated accessibility tests plus manual keyboard review.

IMPLEMENTATION ORDER

Work in small vertical slices.

Phase 0:
- Audit repository
- Establish extension build
- Establish tests
- Establish sanitized fixture workflow
- Audit host permissions

Phase 1:
- Implement design tokens
- Implement application shell
- Implement extension settings
- Implement enable/disable behavior
- Implement fail-open mounting

Phase 2:
- Implement dashboard adapter
- Extract registration appointment
- Extract holds and tasks
- Extract today's schedule
- Render dashboard
- Preserve native links

Phase 3:
- Implement class-search adapter
- Build accessible filters
- Build course result cards
- Build course detail drawer
- Implement native add-to-cart bridge

Phase 4:
- Implement shopping-cart adapter
- Show credits and conflicts
- Show validation summary
- Bridge to native enrollment review

Do not start finances, profile, or a full frontend replacement before the
dashboard and class-search vertical slices are stable.

TESTING

Create sanitized fixtures for each supported page.

Add tests for:

- Adapter matching
- Data extraction
- Missing-selector behavior
- Idempotent mounting
- DOM replacement
- URL changes
- Native control activation
- Iframe messaging
- Extension disable and recovery
- Keyboard navigation
- Accessibility
- Mobile layout

Never commit real student data.

WORK STYLE

For each vertical slice:

1. Inspect existing code.
2. State the intended minimal change.
3. Add or update a sanitized fixture.
4. Write failing tests.
5. Implement the feature.
6. Run tests.
7. Run lint and type checking.
8. Review accessibility.
9. Summarize changed files and remaining risks.
10. Commit only when the slice is working.

Do not make unrelated changes.
Do not perform a full rewrite.
Do not remove native Albert behavior.
Do not silently guess selectors.
Document uncertain selectors clearly.

FIRST DELIVERABLE

Begin with the repository audit and then implement the smallest safe slice:

- Design tokens
- Extension mount root
- Basic NYU-aligned application header
- Enable/disable preference
- Fail-open behavior
- One sanitized fixture test
- No redesign of transactional pages yet

SUCCESS CRITERIA

The first slice is complete when:

- The extension builds successfully.
- The extension mounts only on supported Albert pages.
- The header is visually isolated from Albert styles.
- The user can disable the enhancement.
- Native Albert remains usable when disabled or when mounting fails.
- No student data is stored or transmitted.
- Tests, lint, and type checking pass.
- The implementation is documented.
```

---

## 37. Suggested First Agent Command

For an existing repository:

```text
Read the Better Albert specification in
nyu-albert-extension-plan.md. Audit the repository first. Then implement
only the first deliverable from the AI Coding Agent Prompt. Do not begin a
full redesign, do not change authentication, and do not touch native
transaction logic. Use tests first, keep the extension fail-open, and
summarize all changed files and unresolved risks.
```

For a new repository:

```text
Read nyu-albert-extension-plan.md and scaffold the Better Albert project.
Implement Phase 0 and the first Phase 1 vertical slice only: Manifest V3,
TypeScript, React, Vite, tests, design tokens, an isolated header, an
enable/disable preference, and fail-open mounting. Use mocked sanitized
HTML only. Do not add broad host permissions, external services,
analytics, or transactional features.
```

---

## 38. Final Recommendation

Do not begin by redesigning every Albert page.

Build this sequence:

1. Reliable extension lifecycle
2. NYU-aligned design system
3. Dashboard
4. Class search
5. Native add-to-cart bridge
6. Shopping cart
7. Enrollment review
8. Schedule and grades
9. Conservative finances and profile enhancements

The extension’s long-term value depends more on reliable adapters,
privacy, graceful failure, and safe native-action bridging than on visual
polish alone.
