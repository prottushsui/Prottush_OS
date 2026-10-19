# Prottush OS — Windows 11-inspired portfolio

A structured React + Vite portfolio that uses a Windows 11-inspired desktop metaphor. It is a portfolio interface, not a Windows emulator.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm run build
```

## Project map

```text
src/
├── App.jsx       # Desktop shell, window lifecycle, Start menu, taskbar
├── apps.js       # Central app registry and browser speed-dial data
├── main.jsx      # React entry point
└── styles.css    # Design tokens, Fluent-inspired surfaces, responsive UI
```

## Design and engineering rules

- Keep window chrome in `WindowFrame` and app-specific content in `AppContent` when splitting components in future iterations.
- Keep the app registry in one place so desktop shortcuts and Start results stay consistent.
- Comment non-obvious state and event handling; avoid comments that merely restate syntax.
- Keep keyboard access, visible focus states, and reduced-motion support.
- Never publish private school, identity, or health records. Add only public-safe documents.
- The terminal is a visual mock-up and does not execute commands.
- Theme preferences currently last for the current page session. Local persistence can be added later.

## Suggested next milestones

1. Split `App.jsx` into `components/`, `apps/`, and `hooks/` as behavior grows.
2. Add real, public-safe CV files under `public/documents/`.
3. Add true resize handles, snap layouts, and persistent preferences.
4. Run `npm run build` and test keyboard + mobile behavior before deployment.
