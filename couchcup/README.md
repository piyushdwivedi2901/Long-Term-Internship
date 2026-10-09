# Couch Cup: a tournament hub for EA FC nights

Every group of friends who play EA FC (or any football game) together has the
same argument: *who's actually the best?* Couch Cup settles it. Start a crew,
run leagues and knockout cups, enter scores from the sofa, and let the table,
the bracket and everyone's rating do the talking.

**Live demo:** https://piyushdwivedi2901.github.io/Long-Term-Internship/couchcup/
On the sign-in screen, choose **Explore with a sample crew**. You'll get
"Hostel Room 12": a finished league, a cup halfway through with a semi-final
still to play, and a new season under way.

## Features

- **Crews.**
  - Up to 24 players, each with their own kit colour shown on scoreboards, brackets and charts.
  - Players can be added before they have an account. Friends join with an
    8-character invite code or link, and can claim their name, keeping every
    result, rating and trophy.
- **Leagues.**
  - Fixtures are drawn automatically with the circle method: everyone plays
    everyone, single or home & away. With an odd number of players, one player
    rests each matchday.
  - Home and away games are balanced so nobody is more than one game off an
    even split (tested for 2–16 players).
  - Points system: 3-1-0 or 2-1-0.
  - The table shows P W D L GF GA GD Pts and a form guide. Ties go to goal
    difference, then goals scored, then a head-to-head mini-table.
- **Knockout cups.**
  - A real bracket with connector lines, seeded so the top two can only meet in
    the final (1 v 8, 4 v 5, 2 v 7, 3 v 6).
  - Byes go to the top seeds when the count isn't a power of two. Seeding can
    be by rating, a random draw, or as listed.
  - Level games need a penalty shoot-out. Winners move through automatically.
  - Changing an earlier result that would alter who went through is blocked
    once the next round has been played. The app tells you exactly which result
    to clear first.
- **Score entry built for thumbs.**
  - Big goal steppers and the clubs each side used, from a list of 69 clubs and
    national teams, or anything you type.
  - How the match ended: full time, extra time, penalties or forfeit/rage quit.
  - When it was played, and notes.
- **Fair spin.** Pick a strength tier (5★ to 3★) and both players get two
  different random clubs from it, skipping the clubs each of them just played.
  No more "I'll be City again".
- **Power rankings.**
  - Every match moves an Elo rating. Ratings are zero-sum, use World Football
    Elo margin weighting (a 4–0 counts for more than a 1–0), and include a
    trend and form.
  - Rating history chart per player, with their peak.
- **Head-to-head.** Pick any two players for wins, draws, losses, goals and
  last meetings, plus a colour-coded grid of every pair in the crew.
- **Player profiles.**
  - Win rate, goals per game, clean sheets and the best win streak.
  - Clubs played and the win rate with each, plus a record against every rival.
  - Trophies won.
- **Records and awards.**
  - Crew records: biggest win, most goals in a game, longest win streak and the
    biggest rivalry.
  - Per-competition awards: Golden Boot, best defence and biggest win.
  - A champion banner when a competition ends.
- **Friendlies** count towards ratings and head-to-heads without being part of
  any competition.
- **Accessibility.**
  - Every screen passes axe-core with zero violations in light and dark themes,
    including colour contrast.
  - Every score bug has a plain-sentence description for screen readers
    ("Rohan 1–1 Aisha, 3–4 on penalties").
  - Tabs follow the WAI-ARIA keyboard pattern, and dialogs trap and restore focus.
- **Phones.** A bottom tab bar, bottom-sheet dialogs, and a bracket that
  scrolls inside its card, with no sideways page scrolling (tested).

## Architecture

The same layout as the other projects in this repo: **all rules live in
`shared/`**, and two backends run that same code.

- **`shared/fixtures.ts`:**
  - The circle-method round robin with exact home/away balancing
  - Standard bracket seeding, byes and next-round slots
- **`shared/engine.ts`:** pure functions for the table and its tiebreakers, Elo
  ratings, player stats, head-to-heads and records
- **`shared/services.ts`:** every rule:
  - access and invites
  - knockout progression and safe result edits
  - deciding when a competition is over and who won
  - the sample crew, generated from fixed player strengths with a seeded random
    number generator, so every demo tells the same story
- **The Express API** (`server/`): SQLite via Node's built-in `node:sqlite`,
  scrypt passwords, JWT sessions, rate-limited sign-in and invite codes (so
  codes can't be brute-forced), and security headers
- **The in-browser backend** (`src/api/demo.ts`): runs the same services over
  localStorage. This powers the static GitHub Pages site.
  `src/api/contract.test.ts` runs the same scenarios against both backends.

```
couchcup/
  shared/   fixtures · engine (tables, Elo, stats) · clubs + fair spin · schemas · services · repositories
  server/   Express app · SQLite repository · scrypt + JWT · entry point
  src/      React 19 + TypeScript UI — api/, auth/, features/ (crew tabs, bracket, result dialog), pages/, ui/
  e2e/      Playwright: static build + production server, axe audits
```

**Stack:**
- React 19, TypeScript (strict), React Router 7
- TanStack Query, React Hook Form + Zod, Zustand (toasts)
- lucide icons, Barlow and Barlow Condensed (self-hosted)
- Express 5, node:sqlite
- Vitest, Playwright, axe-core

## Running it

Requires **Node 22.18+**.

```bash
cd couchcup
npm install
npm run dev        # UI with the in-browser backend → http://localhost:5210/Long-Term-Internship/couchcup/
npm run dev:full   # UI + Express/SQLite API (Vite proxies /api to :4300)
```

| Script | What it does |
|---|---|
| `npm test` | 55 tests. They cover fixture properties for 2–16 players, seeding and byes, tiebreakers, zero-sum ratings (fuzzed), stats, services, the HTTP API (privacy, permissions, tokens, rate limits), the backend contract and full UI flows. |
| `npm run test:e2e` | 9 Playwright tests. They cover a whole cup night (extra time, shoot-out, champion), blocked edits to earlier rounds, joining via an invite link, deep links, phone layout, axe audits in light and dark themes, and two friends on two devices sharing a league through the real server. |
| `npm run typecheck` | Strict TypeScript over everything |
| `npm run build` | Static build for GitHub Pages |
| `npm run build:server` + `npm start` | Production build served by Express from one origin |

Lighthouse on the sign-in page: performance 96, accessibility 100, best
practices 100, SEO 100. This was measured on a local production build.

## Deploying with a real, shared database

On GitHub Pages, each visitor's data stays in their own browser, so invites
only work between accounts on the same device. For friends on different phones,
deploy the server:

- **Render:** the repo-root `render.yaml` Blueprint includes a `couchcup`
  service. It builds the Dockerfile, generates `JWT_SECRET` and mounts a disk
  for SQLite.
- **Docker:**
  `docker build -t couchcup couchcup && docker run -p 4300:4300 -e JWT_SECRET=$(openssl rand -hex 32) -v couchcup-data:/data couchcup`

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | random per boot (dev) | **Required** in production |
| `DB_FILE` | `couchcup.sqlite` | Put it on a persistent volume |
| `PORT` | `4300` | |
| `CORS_ORIGIN` | `http://localhost:5210` | Only needed if the UI is served from another origin |

## Known limitations

- **Not affiliated with EA Sports.** Couch Cup doesn't read anything from the
  game; scores are entered by hand. Club names belong to their clubs. The star
  tiers are Couch Cup's own rough grouping for fair random picks, not official
  game ratings.
- **No group stage** (groups → knockout) or two-legged knockout ties yet.
  Leagues can be home & away.
- **Refresh to see changes.** Updates from friends appear when you refresh or
  return to the app; there are no live push updates.
- **Single server instance.** The rate limiter and SQLite assume one process.
- **Docker image not built here.** It follows the tested production path
  (`npm ci` → `build:server` → prune → `node server/index.ts`, verified from a
  clean copy). No Docker daemon was available in the development environment.
