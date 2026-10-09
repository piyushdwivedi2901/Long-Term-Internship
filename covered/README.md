# Covered: a warranty and bill locker

When something at home breaks, the first question is always the same: **is it
still under warranty?** The answer usually sits in a drawer of faded bills and
warranty cards, if they weren't thrown away.

Covered keeps every purchase with its bill and every warranty that applies to
it. It answers that question in one search. It warns you before cover runs
out, and when something breaks, it hands you everything the service centre will
ask for.

**Live demo:** https://piyushdwivedi2901.github.io/Long-Term-Internship/covered/
On the sign-in screen, choose **Explore with sample items**. You'll get ten
everyday purchases, each in a different warranty situation.

## What makes it different

Most to-do and receipt apps store one expiry date per item. Real warranties are
messier, and Covered models them properly:

| Real-world case | How Covered handles it |
|---|---|
| An AC with **1 year** of cover, but **5 years on the compressor** | Each part has its own cover. After the main warranty ends, the item shows **"Parts covered: Compressor until 2030"** instead of "Expired". |
| A phone with a **paid extended plan** | Extended cover starts **the day after** the standard warranty ends, and the timeline shows the hand-over. You aren't warned that the standard warranty is "ending" when the extension follows straight on. |
| "Is the fridge still covered?" | Plain-language search that understands everyday words: *fridge* finds "Refrigerator", *AC* finds "air conditioner", *RO* finds a water purifier. It answers in words: *"Only the compressor is still covered"*. |
| Bought on 31 January with 1 month of cover | Calendar maths clamps to the end of the month, as warranty cards do: cover runs until 28/29 Feb. A one-year warranty bought on 15 March covers you **through 14 March**. Fuzz-tested on 2,000 random dates. |
| Remembering to check before cover ends | Download a **calendar file** that works in Google, Apple and Outlook calendars. Every cover's last day becomes an event, with an alarm set your chosen number of days before. |
| The service centre asks for the serial number, invoice and purchase date | The **claim kit** copies each one with one tap. It can also write the whole service-request message (product, serial, invoice, which cover applies) to copy, share or email. |

## Features

- **Dashboard.**
  - The "Is it covered?" search
  - The value of everything you own that is still covered
  - Covers ending in the next six months, soonest first
  - Open repairs
  - A nudge for items with no bill saved
- **My things.**
  - Filter by status (covered, ending soon, parts only, expired, no warranty), category or "no bill saved"
  - Sort by soonest end, newest purchase, name or price
  - Filters live in the URL, so a view can be bookmarked
- **Item page.**
  - A rubber-stamp status
  - The plain-language verdict
  - A **coverage timeline** with every cover drawn on one calendar and a "today" needle
  - The claim kit, purchase details, and bills and photos
  - Repair history
- **Bills and photos.**
  - Upload photos or PDFs, or take a photo on a phone (opens the rear camera)
  - Large phone photos are shrunk before upload
  - The server checks that every file really is the type it claims to be
- **Repairs and claims.**
  - Log the date, issue, status, ticket number and cost
  - "Claimed under warranty" is ticked automatically when the date falls inside a cover
- **Add / edit form.**
  - One-tap cover presets (Compressor 10 years, Panel 2 years, Extended…)
  - A **live preview** that answers "covered until…" as you type
  - Bills can be attached before saving
  - Asks before you leave with unsaved changes
- **Settings.**
  - Reminder window (7, 15, 30 or 60 days), which also decides what counts as "ending soon"
  - Light, dark or system theme
  - Spreadsheet (CSV) and full JSON backup exports
  - Account deletion
- **Accessibility.** Every screen passes axe-core with zero violations in both themes, including colour contrast. Dialogs trap and restore focus, and the coverage timeline has a text equivalent for screen readers.
- **Phones.** A bottom tab bar, a floating "add" button and bottom-sheet dialogs, with no sideways scrolling (tested).

## Architecture

The same layout as the other projects in this repo. **All rules live in
`shared/`**, and two backends run that same code:

- **The Express API** (`server/`):
  - SQLite through Node's built-in `node:sqlite`, with bills stored as real bytes (BLOB)
  - scrypt passwords and JWT sessions
  - Rate limits on sign-in and on uploads
  - A 6 MB body limit on the upload route only, 64 kB everywhere else
  - Stored files are served with `Content-Security-Policy: sandbox`, so an uploaded PDF can never run script on the site
- **The in-browser backend** (`src/api/demo.ts`):
  - Runs the same services over localStorage. This is what the static GitHub Pages site uses.
  - If the browser's storage is full, the change is rolled back and the user is told. It never pretends something was saved.

`src/api/contract.test.ts` runs the same scenarios against both backends.

```
covered/
  shared/   dates · warranty maths · calendar (.ics) export · schemas · services · repositories · sample bills
  server/   Express app · SQLite repository · scrypt + JWT · entry point
  src/      React 19 + TypeScript UI — api/, auth/, features/, pages/, ui/, lib/
  e2e/      Playwright: static build + production server, axe audits
```

**Stack:**
- React 19, TypeScript (strict), React Router 7
- TanStack Query, React Hook Form + Zod, Zustand (toasts)
- lucide icons, IBM Plex Sans and Mono (self-hosted)
- Express 5, node:sqlite
- Vitest, Playwright, axe-core

## Running it

Requires **Node 22.18+**.

```bash
cd covered
npm install
npm run dev        # UI with the in-browser backend → http://localhost:5200/Long-Term-Internship/covered/
npm run dev:full   # UI + Express/SQLite API (Vite proxies /api to :4200)
```

| Script | What it does |
|---|---|
| `npm test` | 75 tests. They cover warranty and calendar maths (fuzzed), `.ics` folding and escaping, services, the HTTP API (auth, privacy, uploads, limits), the backend contract, search and full UI flows. |
| `npm run test:e2e` | 10 Playwright tests. They cover the add → bill → repair journey, real calendar and CSV downloads, keyboard use, deep links and phone layout, axe audits in light and dark themes, and the production server: data reaching a second device and staying invisible to other accounts. |
| `npm run typecheck` | Strict TypeScript over everything |
| `npm run build` | Static build for GitHub Pages |
| `npm run build:server` + `npm start` | Production build served by Express from one origin |

Lighthouse on the sign-in page: performance 95, accessibility 100, best
practices 100, SEO 100. This was measured on a local production build.

## Deploying with a real database

On GitHub Pages, each visitor's data, including their bills, stays in their
own browser. That space is shared by the whole site, so the demo keeps files
under 2 MB in total. To keep data on a server, deploy it:

- **Render:** the repo-root `render.yaml` Blueprint includes a `covered`
  service. It builds the Dockerfile, generates `JWT_SECRET` and mounts a disk
  for SQLite.
- **Docker:**
  `docker build -t covered covered && docker run -p 4200:4200 -e JWT_SECRET=$(openssl rand -hex 32) -v covered-data:/data covered`

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | random per boot (dev) | **Required** in production |
| `DB_FILE` | `covered.sqlite` | Put it on a persistent volume |
| `PORT` | `4200` | |
| `CORS_ORIGIN` | `http://localhost:5200` | Only needed if the UI is served from another origin |

## Known limitations

- **Reminders are calendar events, not emails or push notifications.** Those
  need a mail service or push keys, which are deliberately left out so the
  project runs anywhere without accounts.
- **No text recognition on bills.** Purchase details are typed in, not read
  from the photo.
- **One person per account.** There is no shared household view yet.
- **HEIC photos** (the iPhone default) aren't accepted. The app explains how
  to share the photo as JPG instead.
- **Sample data.** The sample items use real product brands, but the stores
  and invoices are fictional. The sample bills are clearly marked as samples.
- **Docker image not built here.** The image follows the tested production path
  (`npm ci` → `build:server` → prune → `node server/index.ts`, verified from a
  clean copy). No Docker daemon was available in the development environment.
