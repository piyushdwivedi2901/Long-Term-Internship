# Fairshare: split expenses, settle up fairly

A full-stack shared-expense app for trips, flatmates and dinners. Everyone adds
what they paid. Fairshare keeps a running balance for each person and works out
the **fewest payments** that settle the whole group.

**Live demo:** https://piyushdwivedi2901.github.io/Long-Term-Internship/fairshare/
On the sign-in screen, choose **Explore with sample groups**. You'll get a Goa
trip, a flat and a work trip in euros.

## What it does

- **Groups** for a trip, a flat or an event, each with its own currency
  (₹, $, €, £). People can be added by name before they have an account.
- **Four ways to split a bill**, with a live per-person preview:
  - **Equally** among whoever is ticked
  - **Exact amounts**, with a "₹400 left to assign" counter
  - **Percentages**, which must total 100%
  - **Shares**, e.g. a couple counts 2 and a single counts 1
- **Balances** shown as bars around a zero line, plus a **settle-up plan**: the
  shortest list of "who pays whom" that clears every debt. Record a payment
  straight from the plan.
- **Invite codes and links.** Friends join with an 8-character code, and can
  join *as* the name already in the group, taking over that person's share of
  past expenses.
- **Insights:** spending by category, the last six months, and who paid vs.
  who used.
- **Activity feed** across all your groups. **CSV export** of any group, with
  each person's share in its own column.
- **Accessibility.** Every screen passes axe-core with 0 violations, including
  colour contrast, in light and dark themes. Tabs follow the WAI-ARIA keyboard
  pattern, and dialogs trap and restore focus.
- **One-handed on phones:** a bottom tab bar, a floating "add expense" button,
  and bottom-sheet dialogs.

## Getting the money right

This is the part that would hurt users if it were wrong, so it's isolated and
heavily tested in `shared/`:

| Rule | How |
|---|---|
| No floating-point drift | Every amount is an integer in **paise / cents** (`money.ts`). ₹0.10 + ₹0.20 is exactly ₹0.30. |
| Splits always add up | `allocate()` uses the **largest-remainder method**: ₹100 three ways is ₹33.34 + ₹33.33 + ₹33.33, never ₹99.99. Fuzz-tested on 3,500 random splits. |
| Balances always net to zero | `computeBalances()` gives net = paid − share + payments. Tested on every sample group and on random ledgers. |
| Settle-up in ≤ n − 1 payments | `simplifyDebts()` greedily matches the largest debtor with the largest creditor. Fuzz-tested on 500 random groups: every plan clears all balances in at most n − 1 payments. |
| History is never rewritten | People who appear in expenses can't be removed. Leaving a group or deleting your account keeps your name on past expenses, so friends' balances don't change. |
| Currency is locked once used | You can't change a group's currency after it has expenses, so ₹ amounts never silently become €. |
| Indian number formatting | ₹1,23,456.70, via `Intl.NumberFormat('en-IN')`. |

## Architecture

Like the Flowboard capstone, Fairshare keeps **all business rules in `shared/`**.
Two backends run that same code:

- **The Express API** (`server/`) uses SQLite via Node's built-in
  `node:sqlite`, scrypt password hashing, JWT sessions, rate limiting on sign-in
  and invite codes (so codes can't be brute-forced), and security headers.
- **An in-browser backend** (`src/api/demo.ts`) runs the same services over
  localStorage. This is what the static GitHub Pages site uses. It re-reads
  storage before every call, so two tabs or two accounts in the same browser
  behave like one shared database.

A contract test (`src/api/contract.test.ts`) runs the same scenarios against
both backends.

```
fairshare/
  shared/   money, split and balance maths · Zod schemas · services · repositories
  server/   Express app · SQLite repository · scrypt + JWT · entry point
  src/      React 19 + TypeScript UI — api/, auth/, features/ (expense, settle, group tabs), pages/, ui/
  e2e/      Playwright: static build + production server
```

**Stack:** React 19, TypeScript (strict), React Router 7, TanStack Query,
React Hook Form + Zod, Zustand (toasts), lucide icons, Instrument Sans and
Instrument Serif (self-hosted), Express 5, node:sqlite, Vitest, Playwright,
axe-core.

## Running it

Requires **Node 22.18+**.

```bash
cd fairshare
npm install
npm run dev        # UI with the in-browser backend → http://localhost:5190/Long-Term-Internship/fairshare/
npm run dev:full   # UI + Express/SQLite API (Vite proxies /api to :4100)
```

| Script | What it does |
|---|---|
| `npm test` | 55 tests: money/split/balance fuzzing, services, HTTP API, backend contract, CSV, dialogs, full UI flows |
| `npm run test:e2e` | 9 Playwright tests: trip journey, invite link, CSV, keyboard, phone, axe (light and dark), and two real devices sharing a group through the server |
| `npm run typecheck` | Strict TypeScript over everything |
| `npm run build` | Static build for GitHub Pages |
| `npm run build:server` + `npm start` | Production build served by Express from one origin |

Lighthouse on the sign-in page: performance 96, accessibility 100, best
practices 100, SEO 100. This was measured on a local production build.

## Deploying with a real, shared database

On GitHub Pages, each visitor's data stays in their own browser. For a version
where friends on different phones share groups, deploy the server:

- **Render:** the repo-root `render.yaml` Blueprint includes a `fairshare`
  service. It builds the Dockerfile, generates `JWT_SECRET` and mounts a disk
  for SQLite.
- **Docker:**
  `docker build -t fairshare fairshare && docker run -p 4100:4100 -e JWT_SECRET=$(openssl rand -hex 32) -v fairshare-data:/data fairshare`

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | random per boot (dev) | **Required** in production |
| `DB_FILE` | `fairshare.sqlite` | Put it on a persistent volume |
| `PORT` | `4100` | |
| `CORS_ORIGIN` | `http://localhost:5190` | Only needed if the UI is served from another origin |

## Known limitations

- **No receipt photos, recurring expenses or multi-currency conversion inside a
  group.** Each group uses one currency, and totals across currencies are shown
  separately rather than converted.
- **Settle-up planning is greedy.** It never needs more than n − 1 payments,
  which is optimal in the common case. Finding the true minimum for every
  possible group is NP-hard and isn't attempted.
- **Single server instance.** The rate limiter and SQLite assume one process.
- **Docker image not built here.** It follows the tested production path
  (`build:server` + `node server/index.ts`), but no Docker daemon was available
  in the development environment.
