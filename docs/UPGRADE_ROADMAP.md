# PROTTUSH OS Upgrade Roadmap

This roadmap is intentionally incremental: protect the working production build, ship small changes through pull requests, and verify every deployment before starting the next batch.

## Principles

- Keep the portfolio shell and each app's content clearly separated.
- Preserve the existing desktop layout and theme preferences.
- Never persist vault passwords, session tokens, private file contents, or other app data in desktop layout storage.
- Keep the project on its existing free-tier infrastructure unless a nonzero cost is presented and explicitly approved first.
- Make changes on feature branches; review and validate before merging to `main`.

## Phase 1 — Desktop reliability

- [x] Prevent global keyboard shortcuts from hijacking input and editable fields.
- [x] Keep Escape able to dismiss Start even while its search field is focused.
- [ ] Test open, focus, minimize, restore, close, snap, and maximize across multiple windows.
- [x] Add desktop window resize handles with minimum dimensions and viewport bounds.
- [x] Hand focus to the highest remaining visible window when the active window is minimized or closed.
- [x] Add keyboard activation for desktop icons, explicit labels for taskbar/window controls, visible focus states, and reduced-motion handling (manual assistive-technology testing still pending).

## Phase 2 — Personal workspace

- [x] Make File Explorer navigation real within the portfolio's curated public content.
- [x] Add clear folders for public CV, school records, achievements, and completed work (empty/private records remain unpublished).
- [ ] Verify all project speed-dial destinations and open external sites safely.
- [x] Add useful empty states, breadcrumbs, and search.

## Phase 3 — Privacy and Secret Space

- [ ] Review vault authentication, session lifecycle, rate limits, and authorization rules.
- [ ] Verify private files are never exposed through public routes or client-side logs.
- [ ] Keep vault data and credentials out of local desktop-layout preferences.
- [ ] Validate emergency wipe behavior carefully before changing destructive flows.
- [ ] Keep storage usage reporting grounded in actual backend responses.

## Phase 4 — System utilities

- [x] Expand Settings with five wallpapers, light/dark theme, and five accent colours; persist preferences locally in the current browser.
- [x] Add keyboard-navigable app search and launcher behavior.
- [x] Keep personalization client-side only; do not add infrastructure, cloud sync, or vault coupling.
- [ ] Improve Terminal mock-up and system information without implying real shell access.
- [ ] Add useful quick settings and notifications only where they improve the experience.

## Phase 5 — Release quality

- [ ] Add repeatable checks for build, core interactions, keyboard shortcuts, and responsive layout.
- [ ] Review accessibility: focus visibility, semantic labels, contrast, and reduced motion.
- [ ] Check browser console and failed requests.
- [ ] Verify the production deployment and logs after each merge.
- [ ] Re-check cost and access controls before infrastructure changes.

## Release checklist

1. Create a focused feature branch.
2. Make the smallest coherent change and update this roadmap.
3. Run the production build and available checks.
4. Review the diff and open a pull request.
5. Merge only when the change is understood and safe.
6. Confirm the Vercel production deployment is ready.
7. Record what was actually verified; do not equate a successful build with full interaction testing.


## Upgrade 9 — Settings & Personalization

- [x] Add five selectable desktop wallpapers with live previews.
- [x] Add light/dark appearance selection and five accent colours.
- [x] Persist theme, wallpaper, and accent in separate local browser keys with safe fallbacks.
- [x] Keep the vault and backend untouched; preferences are not uploaded or synced.
- [ ] Verify settings interactions manually on desktop and mobile after deployment.


## Upgrade 10 — Start menu & app search

- [x] Separate a curated pinned view from the complete app list.
- [x] Search app names, descriptions, and categories with a useful no-results state.
- [x] Support Arrow Up/Down navigation and Enter to launch directly from search.
- [x] Expose result selection and launcher controls with accessible labels and keyboard hints.
- [x] Improve narrow-screen result layout; manual browser/mobile testing remains pending.


## Upgrade 11 — Desktop context menus & shortcuts

- [x] Add right-click menus for desktop icons and blank desktop space.
- [x] Add a desktop refresh action that clears selection and dismisses menus without reloading open apps.
- [x] Add a shortcut picker for supported apps and persist only app IDs in browser-local storage.
- [x] Add quick access to Personalization from the desktop menu.
- [x] Keep Secret Space excluded from the new-shortcut picker and do not persist any vault state.
- [ ] Manually verify pointer, keyboard context-menu, and narrow-screen behavior after deployment.


## Upgrade 12 — Window management polish

- [x] Add explicit taskbar indicators for active, open, and minimized windows.
- [x] Add a Show desktop control that minimizes visible windows and restores the same set on the next activation.
- [x] Keep window restoration in transient React state; no new persisted window content or vault data.
- [ ] Manually verify multi-window focus, minimize/restore, Show desktop toggle, and narrow-screen taskbar behavior.


## Upgrade 13 — Quick settings
- [x] Add client-side quick controls for dark theme, focus mode, reduced motion, and Settings.
- [x] Keep preferences and behavior local; no new services or infrastructure.

## Upgrade 14 — Session notification center
- [x] Surface desktop actions and preference changes as in-session notifications.
- [x] Add notification count, clear-all, and a useful empty state; notifications are not synced or persisted.

## Upgrade 15 — Calendar and clock panel
- [x] Add a responsive local date/time panel with a month grid and current-day highlight.
- [x] Clearly indicate that no calendar account is connected.

## Upgrade 16 — Keyboard shortcut guide
- [x] Add a '?' keyboard shortcut to open the built-in shortcut reference.
- [x] Respect editable fields and Escape to dismiss panels.

## Upgrade 17 — Focus mode
- [x] Add a quick toggle that visually deemphasizes desktop decoration without hiding or closing app windows.

## Upgrade 18 — Reduced-motion preference
- [x] Add a session-level reduced-motion switch that disables animation and transitions.

## Upgrade 19 — Responsive system tray
- [x] Replace decorative tray glyphs with working quick-settings, notification, and calendar controls.
- [x] Adjust tray controls and system panels for narrow viewports.

## Upgrade 20 — Local-first system utility layer
- [x] Keep all new utility state in the current browser session; no account connections or backend changes.
- [ ] Manually test all panels, keyboard dismissal, focus behavior, and mobile layouts after deployment.


## Forward plan — Upgrades 21–50

This is a planning backlog, not a claim that these features already exist. Ship one focused upgrade at a time (or a small, tightly related batch), inspect the current code before implementation, and adjust scope when a feature is already present or would require risky architecture changes. Prioritize correctness and testability over adding decorative UI.

### Phase 6 — Quality gates and diagnostics (21–25)

- [x] **Upgrade 21 — Baseline build and test gate:** add a GitHub Actions workflow for unit tests, production build, and Chromium browser smoke tests on pull requests and pushes to `main`.
- [x] **Upgrade 22 — Core interaction smoke tests:** Playwright covers Start/search, Settings, terminal, quick settings, app launch, minimize/restore, close, and settings export.
- [ ] **Upgrade 23 — Keyboard regression suite:** initial tests cover Escape dismissal and shortcut protection while Start search is focused; focus restoration, full keyboard-only operation, and screen-reader review remain.
- [ ] **Upgrade 24 — Responsive viewport checks:** Playwright checks desktop/tablet/mobile shell visibility and Start bounds; full overflow, touch, and device testing remains.
- [ ] **Upgrade 25 — Runtime diagnostics checklist:** document how to inspect browser-console errors, failed requests, and Vercel build/runtime logs; fix observed issues rather than adding a pretend diagnostics screen.

### Phase 7 — Desktop usability (26–30)

- [ ] **Upgrade 26 — Window snapping and tiling polish:** inspect existing behavior first; improve half-screen placement, viewport bounds, and small-screen fallback without regressing resizing.
- [ ] **Upgrade 27 — Taskbar overflow and app grouping:** keep open apps reachable at narrow widths and make active/minimized states understandable.
- [x] **Upgrade 28 — Desktop layout recovery:** add a confirmed reset for open window layout that preserves appearance preferences, desktop shortcuts, and Secret Space.
- [ ] **Upgrade 29 — Search quality pass:** improve empty states, result ranking, keyboard selection, and clear-query behavior without inventing results.
- [ ] **Upgrade 30 — Consistent loading, empty, and error states:** standardize feedback across apps, including honest messages when a feature is a mock or a service is unavailable.

### Phase 8 — Accessibility and interaction consistency (31–35)

- [ ] **Upgrade 31 — Accessibility audit:** check semantic structure, names, roles, states, focus order, contrast, zoom, and reduced motion against WCAG 2.2 AA criteria where applicable.
- [ ] **Upgrade 32 — Modal and popover focus management:** add reliable focus entry, Escape handling, and focus restoration for Start, system panels, and dialogs.
- [ ] **Upgrade 33 — Pointer and touch parity:** ensure essential actions do not depend on hover or right-click; provide touch-friendly targets and visible alternatives.
- [ ] **Upgrade 34 — Text scaling and zoom resilience:** verify long labels, browser zoom, and larger text do not clip core controls.
- [ ] **Upgrade 35 — Accessible notification behavior:** ensure notifications are announced appropriately, dismissible, non-obstructive, and not the sole way to convey important state.

### Phase 9 — Portfolio and content quality (36–40)

- [ ] **Upgrade 36 — Project browser refresh:** use a single curated source of truth for project title, description, status, links, and technology labels; verify every destination.
- [ ] **Upgrade 37 — About and contact polish:** clarify the portfolio owner's work and contact paths while avoiding publication of private details.
- [ ] **Upgrade 38 — Achievements and public documents review:** verify accuracy, links, dates, and publication permissions; keep empty/private records unpublished.
- [ ] **Upgrade 39 — App content consistency:** give each app a clear purpose, useful content, and honest boundaries; label simulated OS functionality as simulated.
- [ ] **Upgrade 40 — Metadata and sharing previews:** audit page title, description, favicon, Open Graph metadata, and social preview without exposing private content.

### Phase 10 — Reliability, privacy, and release operations (41–45)

- [ ] **Upgrade 41 — Error boundaries and recovery:** contain UI failures where supported and provide a safe retry/reload path without hiding errors from developers.
- [ ] **Upgrade 42 — Storage resilience:** validate browser-local preferences, handle malformed or unavailable storage safely, and provide reset behavior; never store secrets or private file contents there.
- [ ] **Upgrade 43 — Dependency and security review:** inspect dependency health, lockfile consistency, exposed environment variables, and unsafe external-link patterns; avoid unnecessary dependency additions.
- [ ] **Upgrade 44 — Performance baseline:** measure bundle/build output and key interactions first; optimize demonstrated bottlenecks instead of guessing.
- [ ] **Upgrade 45 — Release and rollback runbook:** record how to verify a deployment, identify its commit, inspect logs, and return to the last known-good deployment.

### Phase 11 — Optional capability extensions (46–50)

- [ ] **Upgrade 46 — Import/export of public desktop preferences:** allow users to export/import only a validated, versioned allowlist of non-sensitive settings; exclude window contents, credentials, tokens, and vault data.
- [x] **Upgrade 47 — Local help and onboarding:** add a Help & tips app that can be opened from Start without blocking normal use.
- [x] **Upgrade 48 — Terminal honesty and utility:** add an allowlisted simulated prompt and clearly state that arbitrary shell/OS commands are never executed.
- [ ] **Upgrade 49 — Cross-browser compatibility pass:** verify supported browsers and graceful fallbacks for local storage, CSS effects, keyboard behavior, and date/time formatting.
- [ ] **Upgrade 50 — Release acceptance and product review:** run the accumulated build, interaction, accessibility, responsive, privacy, and deployment checks; publish a verified change log and a short list of known limitations.

### Planning guardrails

- Keep upgrades 21–45 focused on reliability and product quality before adding more visual features.
- Inspect the existing implementation before each upgrade; revise the plan if code already satisfies an item.
- Do not connect cloud sync, analytics, external accounts, or new paid infrastructure as part of this roadmap by default.
- Any proposed nonzero-cost service or infrastructure change must be priced and presented for explicit approval before proceeding.
- Secret Space/vault work is intentionally not bundled into upgrades 21–50. Treat authentication, authorization, data exposure, and destructive wipe changes as a separately scoped security review with explicit approval.
- A successful build or READY deployment is not proof of manual interaction, assistive-technology, or cross-device testing. Record each verification separately.


## Upgrade batch 21–50 — implementation status

The first implementation batch establishes foundations and ships selected low-risk capabilities. This status is intentionally evidence-based; items below are not marked complete merely because they were included in the plan.

### Shipped in this batch
- [x] **Upgrade 21 — Baseline build and test gate:** add a GitHub Actions workflow that installs dependencies, runs `npm test`, and builds the production bundle on pull requests and pushes to `main`. Workflow execution still needs to report green before this gate is considered verified.
- [x] **Upgrade 40 — Metadata and sharing previews:** add Open Graph title/description, a theme color, color-scheme hint, and crawl directives.
- [x] **Upgrade 41 — Error recovery:** add a React error boundary with a reload path and browser-console diagnostics; no error payloads are sent to a service.
- [x] **Upgrade 46 — Import/export of public desktop preferences:** add a versioned JSON format containing only validated theme, wallpaper, and accent values. Import rejects malformed, oversized, unsupported, or invalid values.
- [x] **Upgrade 42 — Preference validation coverage:** add dependency-free Node tests for the allowlisted appearance-preference schema, malformed imports, unsupported versions, and oversized files.
- [x] **Upgrade 49 — Reduced-motion fallback:** honor the operating-system `prefers-reduced-motion` media preference in CSS, in addition to the in-app toggle.
- [x] **Documentation — Quality workflow:** document `npm test`, the CI build, and the distinction between automated checks and manual testing.

### Still required before calling the entire 21–50 programme complete
- [ ] Run and verify the CI workflow on the proposed branch/PR and confirm the Vercel production deployment after merge.
- [x] Add browser-driven Chromium tests for window lifecycle, Start/search, Settings export privacy, shortcuts, quick settings, terminal allowlisting, layout reset, and responsive shell basics.
- [ ] Complete keyboard-only, focus restoration, screen-reader, touch/pointer, contrast, zoom, and full mobile overflow testing.
- [ ] Manually test keyboard-only operation, screen-reader announcements, contrast, zoom, and mobile layouts.
- [ ] Complete the remaining desktop usability, accessibility, portfolio-content, dependency/security, performance, cross-browser, and release-acceptance items listed above.
- [ ] Review external project links and production logs with evidence before declaring them verified.

This is a partial implementation of upgrades 21–50, not a claim that all thirty upgrades are finished. Keep the remaining checklist open until each item is implemented and verified.


## Public profile and magazine integration

- [x] Add a public-safe profile using the portrait and public-facing credits already published on the Cambrian Climate Club site.
- [x] Exclude student ID, class/campus details, private contact information, and personal records from the portfolio profile.
- [x] Add a dedicated Climate Chronicles desktop app with an embedded PDF and open/download links to the original 2025–2026 issue.
- [ ] Verify the external portrait, magazine PDF, and cover image load in production browsers; the portfolio depends on the CCC site's public asset URLs.
