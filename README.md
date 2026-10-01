# Long Term Internship — React Practice

A running log of a 41-task React roadmap — components, hooks, routing, state, TypeScript,
accessibility, a real backend with auth, testing and production performance — built as one
browsable portfolio app.

**🔗 Live demo:** https://piyushdwivedi2901.github.io/Long-Term-Internship/

Every task lives under `src/days/dayNN/` and is registered in `src/registry.ts`, which drives the
sidebar (a literal commit graph, one node per day), breadcrumbs, `#/d17-t32`-style deep links and the
progress bar. Each task is its own lazily-loaded chunk.

## Running it locally

```bash
npm install
npm run dev          # frontend only — uses the in-browser demo backend
npm run dev:full     # frontend + the real Express/SQLite API together
npm run server       # API only (http://localhost:3001)
```

Requires **Node 22+** (the API uses the built-in `node:sqlite`).

| Script | What it does |
|---|---|
| `npm test` | Vitest + Testing Library unit/component/API tests |
| `npm run test:e2e` | Playwright end-to-end tests (builds, serves, starts the API) |
| `npm run typecheck` | `tsc --noEmit` (strict; JS and TS coexist) |
| `npm run build` / `preview` | Production build / serve it |
| `npm run analyze` | Build + interactive bundle treemap in `stats/` |
| `npm run audit:a11y` | axe-core on every task page in real Chromium (needs `preview` running) |
| `npm run lighthouse -- <url> <out.json>` | Lighthouse report |

## Backend: real server vs. demo mode

GitHub Pages can only host static files, so the deployed site runs the same API interface against
**browser storage ("demo mode")** — clearly labelled in the UI. Locally, set `VITE_API_URL`
(`npm run dev:full` does it for you) and the app talks to the real server in `server/`:

- Express + SQLite (`node:sqlite`), validated CRUD, parameterised queries
- Email/password auth: scrypt-hashed passwords, signed JWTs, per-user data isolation
- `JWT_SECRET` is required when `NODE_ENV=production`; `DB_FILE` and `CORS_ORIGIN` are configurable

To host the API for real, deploy `server/` to any Node 22 host (Render, Railway, Fly…), set those
variables, and build the frontend with `VITE_API_URL=https://your-api`.

## Project layout

```
src/
  days/dayNN/       one folder per day's tasks (+ co-located tests)
  components/       shared: DayNav (compound), Modal (portal), ErrorBoundary, ProfileCard
  api/              HTTP + demo clients behind one interface
  auth/             AuthProvider, ProtectedRoute
  hooks/ store/     useFetch<T>, useJson (TanStack Query), typed Zustand store
  registry.ts       the task registry (lazy-loaded)
server/             Express + SQLite API and its tests
e2e/                Playwright specs
docs/               accessibility, Lighthouse and bundle write-ups + raw reports
scripts/            audit / report tooling
```

## Quality gates

Every push to `main` runs, in order: **typecheck → unit tests → Playwright E2E → build → deploy**
(`.github/workflows/deploy.yml`). A failure at any step blocks the deploy.

- **162 Vitest tests** across 31 files (components, hooks, store, API client, Express server) — including
  automated axe-core accessibility checks.
- **12 Playwright tests**: todo flow, cart/checkout, navigation, and the real API.
- **0 axe violations** on all 41 pages in a real browser (colour contrast included) —
  [`docs/accessibility-audit.md`](docs/accessibility-audit.md).
- **Lighthouse** performance 94 → 99 — [`docs/lighthouse-audit.md`](docs/lighthouse-audit.md).

## Tech notes

- **Stack:** Vite 8 + React 18, TypeScript (strict, incrementally adopted — JS and TS files coexist),
  react-router (MemoryRouter for embedded demos), Zustand, TanStack Query, framer-motion,
  React Hook Form + Zod, lucide-react.
- **Design:** an ink-navy/amber "git commit log" aesthetic with IBM Plex Mono and Inter (self-hosted).
- **Public APIs used (no keys):** JSONPlaceholder, Open-Meteo, Open Trivia DB, TheMealDB.
- **Patterns demonstrated:** race-condition guards, compound components, error boundaries, code splitting,
  portals with focus management, optimistic updates with rollback, protected routes.

## Progress

### Week 1: Core Basics (Components, JSX, Props)
- [x] Day 1 — Task 1: Static profile card
- [x] Day 1 — Task 2: Props practice (`<ProfileCard />`)
- [x] Day 2 — Task 3: List rendering (`.map()` + keys)
- [x] Day 2 — Task 4: Conditional rendering
- [x] Day 3 — Task 5: Counter app (`useState`)
- [x] Day 3 — Task 6: Toggle switch
- [x] Day 4 — Task 7: Simple controlled form
- [x] Day 4 — Task 8: To-do list

### Week 2: Side Effects & Data Fetching
- [x] Day 5 — Task 9: `useEffect` basics
- [x] Day 5 — Task 10: Fetch API data
- [x] Day 6 — Task 11: Search/filter feature
- [x] Day 6 — Task 12: Loading & error states

### Week 3: Component Communication
- [x] Day 7 — Task 13: Lifting state up
- [x] Day 7 — Task 14: Custom hooks (`useFetch`, `useLocalStorage`)
- [x] Day 8 — Task 15: Context API (theme switcher)
- [x] Day 8 — Task 16: React Router basics
- [x] Day 9 — Task 17: Dynamic routes
- [x] Day 9 — Task 18: Form validation

### Week 4: Mini Projects
- [x] Day 10 — Task 19: Weather app (Open-Meteo API)
- [x] Day 10 — Task 20: E-commerce cart
- [x] Day 11 — Task 21: Quiz app (Open Trivia DB, timer + score)
- [x] Day 11 — Task 22: Recipe search app (TheMealDB, search + detail routing)
- [x] Day 12 — Task 23: Kanban/Task board (drag-and-drop)

### Week 5: Stretch Goals
- [x] Day 13 — Task 24: State management rebuild (Zustand)
- [x] Day 13 — Task 25: Testing (Vitest + React Testing Library, 29 passing tests)
- [x] Day 13 — Task 26: Performance (`useMemo`, `useCallback`, `React.memo`)

### Week 6: Advanced Patterns & Real-World Concerns
- [x] Day 14 — Task 27: TypeScript basics (`ProfileCard.tsx`, generic `useFetch<T>`)
- [x] Day 14 — Task 28: Typed Zustand store
- [x] Day 15 — Task 29: Error boundaries
- [x] Day 15 — Task 30: Code splitting (`React.lazy` + `Suspense`)
- [x] Day 16 — Task 31: Compound components (`DayNav`)
- [x] Day 17 — Task 32: Portals (accessible `Modal`, view-cart flow)
- [x] Day 17 — Task 33: Accessibility pass (axe audit, keyboard Kanban, contrast) — see [`docs/accessibility-audit.md`](docs/accessibility-audit.md)
- [x] Day 18 — Task 34: Animation (framer-motion: list add/remove, drag feedback, route transitions)
- [x] Day 19 — Task 35: Real backend (Express + SQLite persistence, demo-mode fallback)

### Week 7: Full-Stack Integration & Production Readiness
- [x] Day 20 — Task 36: Auth (email/password, scrypt + JWT, protected route, per-user data)
- [x] Day 20 — Task 37: TanStack Query (`useJson`, caching, refetch-on-focus)
- [x] Day 21 — Task 38: Forms at scale (React Hook Form + Zod vs the manual form, with measurements)
- [x] Day 21 — Task 39: E2E testing (Playwright: todo, cart/checkout, navigation, real-API suites)
- [x] Day 22 — Task 40: Performance audit (Lighthouse 94 → 99, [`docs/lighthouse-audit.md`](docs/lighthouse-audit.md))
- [x] Day 22 — Task 41: Bundle analysis (entry chunk 188 → 49 kB gzip, [`docs/bundle-analysis.md`](docs/bundle-analysis.md))

**All 41 tasks complete.** 🎉

## Source

Task lists adapted from the internship roadmap PDFs (`Internship_Tasks.pdf` — Weeks 1–5, `Internship_Tasks_2.pdf` — Weeks 6–7).
