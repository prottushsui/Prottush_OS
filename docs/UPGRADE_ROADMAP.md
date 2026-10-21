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
