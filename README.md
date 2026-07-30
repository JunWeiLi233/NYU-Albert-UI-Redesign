# Better Albert

Better Albert is a local-first Manifest V3 extension that gives the authenticated
NYU Albert interface a full-page, NYU-aligned application workspace without
replacing Albert authentication, data, controls, or transaction behavior.

## Implemented experience

Version 0.5.192 includes:

- the default task finder now puts a visible “New to NYU?” starting point
  beside common tasks, opening the verified Key Links, Student Guides, Browse
  by student need, and Get Support resource view in one action;

Version 0.5.191 includes:

- broad newcomer searches now keep the native Other Resources destination
  explicit while presenting a clearer “Open New student help” action and
  explaining that verified key links, student guides, and support appear after
  the handoff;

Version 0.5.190 includes:

- the exact newcomer query “registration” now takes the same verified one-step
  Course Search handoff as other class-registration wording, while specific
  “when can I register?” and registration-hold requests keep their status-card
  destinations;

- Find classes now advances through Albert's verified enrollment-cart launcher
  to the native Course Search form in one shell action, including the live
  cross-origin PeopleSoft JavaScript control;

- unmatched class-like searches such as “biology” now offer an explicit,
  keyboard-accessible Course Search recovery instead of ending at a dead-end
  zero-results message; the native Albert form remains authoritative;

- one-step class search retries the verified Home handoff once when Albert
  reports an intermediate workspace, so students do not need to press Find
  classes twice during a slow portal transition;

- direct newcomer searches such as “new student” and “first semester” now
  offer a verified New student help guide from the NYU resource finder; Enter
  activates the same one-step handoff without inventing a destination;

- NYU’s “tech checklist for new students” and “new student registration guide”
  wording now follows that same verified newcomer guide instead of dropping a
  first-week student into an unlabeled resource directory;

- “Incoming students” now follows the same newcomer handoff while preserving
  the international variant’s more specific OGS destination;

- newcomer resource-mode Find classes now uses the native handoff lifecycle,
  closing Albert's Other Resources directory before opening Course Search so
  the single combined class-search field is the only next step;

- cross-area Find classes cues now describe the verified Home-first Course
  Search handoff outside Home, while retaining the explicit Academics fallback
  when Home has no native Course Search control;

- native modal open/close transitions now return the Better Albert rail to its
  top-level wayfinding context, keeping Find classes and Find a task visible;

- current Degree Progress reports now use a centered, scroll-bounded lightbox
  with NYU-violet title bands, a fixed readable mask, and 44px native actions;
  the report remains Albert-owned and read-only;

- the newcomer Course Search handoff now closes Albert's native Other
  Resources overlay, waits for the Home workspace to render, and falls back to
  Academics only when Home has no verified Course Search link, so a first-time
  student reaches the native class-search form without a second shell action;

- the live NYU Students hub’s exact “View the Calendar” and “Go to
  Brightspace” wording now resolves to the verified Academic Calendar and NYU
  Brightspace controls in one step;

- live NYU Academic Services wording such as “Find Your Advisor,” “What Can
  My Advisor Help With?,” “Visit the Academic Resource Center,” “Improve
  Skills with Professional Edge,” “Explore Academic Opportunities,” and
  “Degree Progress Report” now resolves to the shortest verified Academics,
  Academic Support, or native degree-progress destination;

- Academic Services subpages now keep their exact tutoring, complaint, SARA,
  and Kaplan labels searchable while preserving the honest Other Resources
  directory fallback for public-only procedures and external services;

- the live NYU Students hub’s “Learn more about academic resources,” “Learn
  more about housing and dining,” and “Learn more about bills, payments, and
  refunds” links now follow the same one-step Academics/resources, Housing,
  and Finances routing as their visible tab destinations;

- live NYU Student Records and Transcripts wording such as “Learn about your
  FERPA rights,” “How to request your official transcript,” “Update your
  student records,” “Tech Checklist for New Students,” “Certify your
  eligibility for NY State TAP,” and “Resources for Military-Connected
  Students” now resolves to the shortest verified FERPA, Registrar, Grades,
  Personal Info, or Other Resources destination without submitting a record,
  transcript, eligibility, or benefits action;

- exact Student Records sidebar wording such as “Updating Your Student
  Records,” “Managing Guest Users,” “FERPA privacy rights and how to grant
  consent to disclose information,” and “New York State Tuition Assistance
  Program (TAP)” now uses the same safe one-step destinations;

- the live NYU Students hub’s exact “A Student Success Specialist,” “Learn
  more about academic advisors,” “Learn more about campus resources,” “Learn
  more about getting involved,” “Learn more about StudentLink,” and Student
  Activities Board labels now resolve to the corresponding verified resource
  or area without making a newcomer interpret NYU’s public-site hierarchy;

- live NYU registration checklist wording such as “Check your registration
  date and time,” registration-hold guidance, advisor planning, contact
  information, and Bursar/aid accounts now resolves to the shortest verified
  Albert destination;

- live NYU registration wording such as “Browse available courses for the
  upcoming term,” “Track Your Degree Progress,” and “Check Your Grades” now
  uses the shortest verified Albert destination;

- live NYU Student Information and Resources wording such as “Meet with an
  expert to guide you through NYU student services” now routes to the
  verified Student Services anchor, while broad virtual-programming wording
  stays on the verified Other Resources directory;

- live NYU Communities and Getting Involved wording such as “Students in
  the Military and Veterans,” “Find clubs and other student organizations on
  campus,” and “Explore hundreds of ways to get involved” now routes to the
  verified Student Life anchor in one step;

- live NYU Wellbeing wording such as “Schedule appointments with doctors,
  counselors, nurses, and other experts,” urgent mental-health and medical
  support language, everyday healthy-living guidance, “Student Wellbeing
  Team,” and “Free flu shots” now routes to the verified Wellness Center
  anchor in one step without scheduling care or transmitting a text;

- live NYU Student Success wording such as “Personalized Support,”
  “Navigating College and NYU,” “Time Management Tips,” “Coaching and
  Mentoring,” and “Success Toolbox” now routes to the verified NYU Connect
  anchor in one step; leave-of-absence, glossary, Year 2, midterm-feedback,
  and text-message labels remain honest Other Resources directory cues;

- the live StudentLink Get Support wording “For answers about your bill,
  financial aid, registration, international student services, and more” now
  resolves to the same verified StudentLink resource or honest Other
  Resources fallback as the shorter card copy;

- newcomer resource search now mirrors the live NYU Students Key Links Albert
  card with a verified “Find classes — Open Albert Course Search” action, so a
  new student can reach one-step course search from the resource directory;

- Home now exposes the same one-action class-search handoff when Albert's
  native Course Search appears only after entering Academics; the extension
  activates native Academics and opens its verified Course Search control;


- newcomer resource search now adds NYU-style “Browse by student need” cues
  for Academic Services, Getting Around Campus, Housing and Dining, Financial,
  Health and Wellness, Career Development, and Communities and Groups whenever
  their mapped Albert anchors are verified;
- newcomer resource search now foregrounds verified NYU-style Key links for
  academic dates, course materials, and student support before the remaining
  “Start here” suggestions;
- newcomer resource search now adds a verified “Get support” group for
  academic support, student success, and getting involved when those native
  Albert anchors are present;

- public NYU Get Support wording such as “Your Academic Advisor” now routes to
  the verified Academics area without requiring Albert terminology;

- newcomer resource search now mirrors NYU's Student Guides with visible
  search-language buttons for first-semester, transfer-student,
  time-management, and student-tech-guide wording; selecting a guide fills the
  verified finder without creating a public-site destination;

- newcomer resource search now leads with NYU-style Key Links examples and
  explicitly teaches first-semester, transfer, time-management, and student
  tech-guide wording, while keeping every result inside Albert’s verified
  directory boundary;

- Home’s verified Start here group now adds a concise “New to NYU?” cue for
  classes, holds, and registration dates, clarifying the first-week order
  without changing any native Albert control or destination;

- current registration, records, career, international, Law-residence, and
  billing/refund wording now routes to the most specific verified Albert area;
  precise student labels such as “Student Records and Transcripts” no longer
  compete with the broad Other Resources fallback;

- “Registering for Classes” and “Navigate the Registration Process” now reach
  the verified one-step Course Search control, preserving the existing
  subject/course/title/instructor handoff;

- current Online Programming, Services, and Opportunities labels such as
  “Global Services,” “Health, Wellness & Accessibility Services,” “Residential
  Life Opportunities,” and “Student Communities & Organizations” now resolve
  to verified Albert anchors when the intent is unambiguous; broad public-only
  categories remain on the honest Other Resources fallback;

- course search now understands slash-separated combined wording such as
  “class/course lookup,” “find available classes/courses,” “show available
  classes/courses,” “what classes/courses can I take,” and “take a
  class/classes/courses” as one-step requests for the verified Course Search
  control;

- current How We Engage wording such as “Listening Labs,” “Interfaith Supper
  Club,” “Multifaith Advisory Council,” and “Violet Voices” now reaches the
  verified Wellness Center or Student Life resource; toolkit and program-news
  labels stay on the honest Other Resources fallback;

- current NYU community and career labels such as “Undergraduate Students”
  and “Connect with other students” now reach verified Wasserman or Student
  Life resources; the shared “Graduate Students” label stays visibly
  ambiguous when both destinations are present instead of guessing;

- concise newcomer phrases such as “available courses,” “find courses,”
  “find me a course,” “course list,” “course listings,” “course offerings,”
  “class list,” “class listings,” “browse courses,” “look up classes,”
  “what courses are offered,” “when are classes offered,” and “search courses” now
  resolve to the uniquely verified native Course Search control in one step;

- “StudentLink Center” is recognized as the same conservative Other Resources
  directory cue as “studentlink” and “student link,” without inventing a public
  StudentLink destination;

- public StudentLink descriptions such as “Help with your bill, financial aid,
  registration, and more” remain one-step searchable without copying the public
  StudentLink URL;

- current Student Success wording such as “Find tips for remote learning” and
  “Centralized online platform” now reaches NYU Connect when its exact native
  anchor is verified; the combined “Class Registration, Transcripts,
  Graduation” label stays an honest directory fallback;

- generic “accessibility” searches no longer leak into Housing through a
  shared keyword; they use the exact Campus Resources anchor when verified or
  stay on the honest Other Resources fallback;

- conversational requests such as “I need health insurance help” now retain
  the specific service phrase and reach the verified Wellness Center without
  allowing broad “NYU” wording to match unrelated resources;

- verified task actions now expose their outcome description in the accessible
  action name, and the single-result handoff uses a pale-violet treatment so
  course search and advising guidance remain readable without competing with
  the primary Start here action;

- every unique area, task, and resource search now surfaces one compact
  “Open …” action beside the verified-destination cue, so pointer users get
  the same one-step handoff as keyboard users without scrolling the inventory;

- broad “support” and “I need support” searches now prefer the verified
  Student Services anchor when it exists, keeping a newcomer’s first help
  request one step and falling back to Albert’s directory when it does not;

- “Where are my classes?” now opens the verified Weekly Schedule instead of
  offering Class Search and Brightspace together, and “international office”
  now reaches OGS without requiring a student to know the acronym;

- NYU Students labels such as “Accessibility and Accommodations,” “Athletics
  and Fitness,” “Student Government,” “Service Opportunities and Civic
  Engagement,” “Sustainability,” and “International Student Employment” now
  remain discoverable: they use the exact verified anchor when Albert exposes
  it, otherwise they fall back to the official Other Resources or OGS
  destination instead of returning zero results; bare “time management” is
  kept on the newcomer resource path instead of producing two area choices;

- “degree audit” and “audit my degree” now fall back to the verified Academics
  workspace when Albert does not expose the direct Degree Progress control;
  ordinary “transportation” searches stay on the verified Other Resources
  directory instead of being mistaken for Campus Safety;

- first-semester wording such as “report card,” “verify enrollment,” “how
  much is tuition,” and “health insurance waiver” now reaches the verified
  Grades, Finances, or Wellness destination instead of returning no results;

- the general task finder now explains the one-step Class Search handoff and
  tells students exactly which native fields they can use: subject, course
  number, title, or instructor;

- specific advisor-meeting searches now fall back to the verified Academics
  workspace when the exact appointment control is not in the current view;
  when Albert exposes that control, the direct native action still wins;

- generic newcomer prompts such as “how do I get started” now preserve the
  verified starter recovery instead of relaxing into an unrelated calendar
  result;

- broad resource-only help searches now stay honest: they open verified
  Student Services when present, otherwise they point to Albert’s unchanged
  resource directory instead of surfacing unrelated support links;

- cross-area searches for classroom location, current classes, and enrollment
  verification now hand off to the verified Home or Grades workspace instead
  of returning an avoidable no-results state;

- Grades & Transcripts and Finances now lead their workspace context with
  student outcomes—view grades, prove enrollment, check balances, and pay
  tuition—before system terminology;

- “how do I register” now follows the same one-step Find Classes handoff as
  “where can I register,” removing the competing Registrar result;

- single-result searches now keep one emphasized “Open …” handoff instead of
  repeating the same verified destination in the inventory below;

- generic campus-service searches such as “parking,” “campus map,” and
  “shuttle” no longer typo-match unrelated international-student wording;
  unmatched needs stay honestly on the verified Other Resources directory;

- the exact “advisor” search now prefers the verified Academics destination
  over broad resource vocabulary such as spiritual-life advising;

- generic newcomer prompts such as “what do I do first,” “what should I do
  first,” “where do I start,” and “how do I get started” now resolve to one
  verified Other Resources destination instead of being mistaken for dates or
  the already-open Home area;

- Personal Info now understands “home address,” “mobile phone,” and
  “nationality” as direct native destinations, while broad “personal
  information” and “edit profile” searches open the verified Personal Info
  workspace;

- everyday records and finance wording such as “report card,” “verify
  enrollment,” “credit transfer,” “current balance,” “print statement,” and
  “accept financial aid” now reaches the closest verified task or workspace;
  “order transcript” opens the verified Registrar guidance resource;

- student-language academic searches such as “degree audit,” “audit my
  degree,” and “apply to graduate” now reach the verified Degree Progress or
  Academics workspace without changing the native graduation action;

- plain-language searches such as “plan my courses,” “when do I graduate,”
  and “choose a major” now reach the verified Academic Planner, graduation
  status, or Academics workspace in one step;

- “where can I register” now stays on the verified one-step Course Search
  handoff instead of competing with University Registrar;
- finance searches now keep “pay my bill” on the verified eSuite billing
  control and route a bare “bursar” query to Finances instead of Academic
  Calendar; exact “email” and “gender” searches now prefer their native
  Personal Info tasks over unrelated resource aliases;
- enrollment and records wording such as “proof of enrollment,” “unofficial
  transcript,” “official transcript,” and “MyHub enrollment” now reaches the
  verified Grades & Transcripts workspace from other Albert areas;
- accessibility and newcomer support phrases such as “disability support,”
  “testing accommodations,” “campus accessibility,” “academic support,”
  “student life,” and “I need help with NYU” now reach the verified Other
  Resources directory when Albert does not expose a more specific native link;
- generic “schedule appointment” and “book appointment” searches now fall
  back honestly instead of guessing Wasserman or NYU Connect, while
  counseling and financial-aid appointment phrases reach their verified
  services directly;
- “pronouns” and “name pronunciation” now reach the verified Personal Info
  workspace when the native control is on that page;
- “major planning” and “student clubs” now reach their verified Academics or
  Other Resources workspace instead of returning no destination;
- a generic “scholarship” query prefers the verified Financial Aid resource
  over a broader career-scholarship match;
- major-change wording now opens the verified Academics workspace as an
  honest planning handoff, without implying that Better Albert changes a
  student's academic program;
- plain-language campus Wi‑Fi and disability-accommodation queries now reach
  the verified Other Resources directory when no direct anchor is present;
- student-employment wording now opens the verified Wasserman resource when
  Albert exposes that official link;
- generic “events” no longer falls through to OGS’s longer immigration-events
  alias, preserving a safe Other Resources destination;
- native PeopleSoft lightboxes suppress the fixed extension shell while open,
  keeping What-If and other modal content unobscured at high zoom;
- plain-language “class search,” “find classes,” and “search for a course”
  queries use the same one-step verified Course Search handoff;
- high-intent resource phrases stay tied to their intended service and fall
  back to the official Other Resources directory when that exact native link is
  unavailable;
- a Vite, CRXJS, React, and TypeScript MV3 build;
- an accessible one-step “Open …” action that announces the verified destination and keyboard handoff hint to assistive technology;
- a visible one-step “Open …” action beside every unique verified search result, so pointer users can activate the same safe handoff without scrolling to the result card;
- an inline verified-destination cue for single search matches, so Enter
  handoffs remain understandable at 200% zoom even before the result card is
  scrolled into view;
- a compact horizontal common-task strip with a visible “Scroll for more”
  cue, keeping one-step Find classes and newcomer shortcuts fully readable at
  200% zoom;
- a single-row resource starter strip at compact widths, so popular NYU
  services remain discoverable with a visible scroll cue instead of wrapping
  into a clipped third row at high zoom;
- a high-zoom Class Search handoff that scrolls the original combined search
  field fully into view while keeping it focused and ready for typing;
- a full-width primary Class Search action even when PeopleSoft wraps the
  verified native button in an intrinsically sized control wrapper;
- a cross-area course-search intent that carries a verified “find a course”
  query from Academics, Grades, Finances, or Personal Info through Home and
  into the original Class Search control;
- a full-viewport compact finder modal that keeps Albert's native resource
  directory mounted but behind the search surface at high zoom and short
  heights;
- verified popular NYU resource starters that remain available after a
  no-result search, so a newcomer can recover without leaving the search
  surface or guessing Albert's native directory labels;
- a newcomer-aware resource handoff that keeps the “New student help” intent
  visible when Albert's verified directory opens, with a clear “Start here”
  cue for first-week services;
- a first-week starter order that puts academic dates, course materials,
  financial aid, ID cards, international-student help, health, housing, and
  student success before broader resource categories in newcomer search;
- a cross-area course-search result cue that names the actual one-step action
  (“Find classes — Open Course Search”) before the student presses Enter;
- conversational course requests such as “look for a course” that stay on the
  verified Find Classes destination instead of mixing in unrelated course
  feedback, learning-platform, or summer-program links;
- concise student wording such as “browse classes,” “find course offerings,”
  “look for a course,” “look for classes,” “search for classes,” “where can I
  find a course,” “what classes are available,” and “which courses are offered”
  now uses the same verified one-step Course Search handoff;
- a precise conversational support query that opens Student Services only when
  its exact native anchor is verified, avoiding unrelated links when it is not;
- a resource-search empty state that points students to Albert’s official
  directory instead of asking them to broaden an unsupported need blindly;
- a clearly labelled “Try a verified starter” recovery group when a typed
  resource need has no exact native link, so fallback chips are not mistaken
  for search matches;
- newcomer resource search switches from “Start here” to the same recovery
  label after a typed no-result query, keeping the state honest while retaining
  first-week verified links;
- the enabled-state “Original Albert” escape hatch now explains the immediate
  switch and how to turn Better Albert back on, instead of describing a future
  disabled state;
- the general “Student support” starter appears only when Albert exposes its
  exact verified Student Services resource, preserving the official-directory
  fallback when that anchor is absent;
- the general “Find classes” starter and course-search wording disappear when
  Home has no verified Course Search control, so a newcomer never lands on the
  already-open Home area believing a class search has started;
- Home status starters appear only when their native status card is verified,
  or when another workspace can hand the student to Home, so missing holds,
  registration, schedule, and to-do controls never become no-op shortcuts;
- unmatched task searches now name the visible “Show all” recovery action,
  making the complete verified-destination list an obvious next step without
  broadening the search beyond the current Albert view;
- conservative orientation disambiguation that sends generic orientation
  requests to Albert's resource directory while preserving international and
  pre-arrival orientation matches for OGS;
- one isolated Shadow DOM application frame: a fixed violet rail on desktop and
  a compact responsive workspace header below 900px;
- task-first discovery cards at every supported width that explain what
  students can do before identifying Albert's original area name;
- an NYU-style full-workspace desktop task panel that groups every uniquely
  verified task already present in the current Albert view by its native area,
  alongside verified NYU resources and without inventing links;
- compact-height containment for Albert's native skip link, which stays
  keyboard-accessible without covering task or NYU resource cards;
- Home, Academics, Grades & Transcripts, Finances, Personal Info, and Other
  Resources context and navigation delegated to existing native Albert links;
- universal Academic Calendar, University Registrar, Wellness Center, and
  Housing shortcuts that appear only when Albert's exact native Other Resources
  submenu contains one matching link;
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
- safe page-world activation for the exact non-transactional Academic Planner,
  Degree Progress, What If Report, and Graduation Status shortcuts;
- cross-area “financial aid status” routing that takes a newcomer to Finances
  when the exact native status control is not in the current Albert view;
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
version `0.5.192` and the toolbar badge shows `ON`. On desktop the native portal is
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
