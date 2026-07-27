# Long Term Internship — React Practice

A running log of a 5-week React learning roadmap: components, hooks, side
effects, routing, and mini projects — building toward a small portfolio of
real, working apps.

**🔗 Live demo:** https://piyushdwivedi2901.github.io/Long-Term-Internship/

Every task lives under `src/days/dayXX/` and is wired into the sidebar nav in
`src/App.jsx`, so the whole history stays browsable in one running app —
open the live demo (or run it locally) and click through the sidebar to see
all 26 tasks live.

## Running it locally

```bash
npm install
npm run dev      # start the app
npm run build    # production build
npm test         # run the test suite (Task 25)
```

## Tech notes

- **Bundler:** Vite + React 18
- **Routing tasks (16, 17, 22):** use `react-router-dom`'s `MemoryRouter`
  since these mini-apps are embedded inside the outer sidebar shell —
  swap in `BrowserRouter` if extracting one as a standalone app.
- **Live public APIs used (no keys required):** JSONPlaceholder (Tasks 10–12),
  Open-Meteo (Task 19 — weather), Open Trivia DB (Task 21 — quiz),
  TheMealDB (Task 22 — recipes).
- **State management (Task 24):** Zustand, chosen over Redux Toolkit for
  minimal boilerplate.
- **Testing (Task 25):** Vitest + React Testing Library. Test files sit next
  to the components they cover (`*.test.jsx`) — 21 passing tests across 6 suites.

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
- [x] Day 13 — Task 25: Testing (Vitest + React Testing Library, 21 passing tests)
- [x] Day 13 — Task 26: Performance (`useMemo`, `useCallback`, `React.memo`)

**All 26 tasks complete.** 🎉

## Source

Task list adapted from the internship roadmap PDF (`Internship_Tasks.pdf`).
