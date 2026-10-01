# Bundle analysis (Task 41)

```bash
npm run analyze                              # build + stats/treemap.html (interactive) + stats/stats.json
node scripts/chunk-sizes.mjs dist stats/after-chunks.json
node scripts/summarize-reports.mjs           # regenerates the data shown on the Task 41 page
```

`rollup-plugin-visualizer` is enabled only when `ANALYZE` is set (see `vite.config.js`), so normal builds are unaffected.

## Largest chunk: found and reduced

| Chunk | Before (min / gzip) | After (min / gzip) |
|---|---|---|
| `index.js` (entry) | 607 kB / **188 kB** | 148 kB / **49 kB** (−74 % gzip) |
| `axe.js` (Task 33, on demand) | 587 kB / 159 kB | 587 kB / 159 kB |
| Per-task chunks | — | ~80 chunks, each fetched on first visit |

The treemap showed the entry chunk containing `framer-motion`, `zod`, `react-hook-form`, TanStack Query and
the code of every task. Fixes:

1. Route-level code splitting: `React.lazy` per task, with prefetch on hover/focus.
2. `QueryClientProvider` moved from `main.jsx` into Task 14 (its only consumer) — TanStack Query leaves the entry chunk.

## What is left

`axe-core` is now the largest chunk. It is fetched only when a visitor presses "Run axe audit" on Task 33,
so ordinary visitors never download it. `build.chunkSizeWarningLimit` is set just above it so any *new*
oversized chunk still triggers a warning. Next candidates if size ever matters: Task 34 (framer-motion, 45 kB gz)
and Task 38 (zod + react-hook-form, 36 kB gz) — both already on-demand.
