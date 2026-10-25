# Upgrade 51 — Production bundle splitting

## Evidence

The latest observed Vercel production build succeeded, but Vite reported a 532.50 kB minified JavaScript chunk (303.98 kB gzip), above its 500 kB warning threshold.

## Change

Configure Rollup to split React/runtime dependencies and Lucide icon modules into separate vendor chunks. This is a build-only change: no app behavior, vault logic, external services, or paid infrastructure changes are intended.

## Verification required

- GitHub Actions must pass unit tests and the production build on this branch/PR.
- Compare the new chunk sizes with the 532.50 kB baseline and confirm no chunk remains above the configured warning threshold without explanation.
- Verify the Vercel preview deployment before merging; verify production only after merge.
- A successful build does not replace browser interaction and responsive testing.
