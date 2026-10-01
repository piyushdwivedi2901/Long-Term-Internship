# Lighthouse audit (Task 40)

Reports: [`docs/lighthouse/before.json`](lighthouse/before.json) and [`after.json`](lighthouse/after.json)
(rendered on the Task 40 page of the app).

```bash
npm run build && npx vite preview --port 4173 &
CHROMIUM_PATH=/path/to/chrome npm run lighthouse -- http://localhost:4173/Long-Term-Internship/ docs/lighthouse/after.json
# or against the deployed site:
npm run lighthouse -- https://piyushdwivedi2901.github.io/Long-Term-Internship/ docs/lighthouse/live.json
```

| | Before | After |
|---|---|---|
| Performance | 94 | **99** |
| First Contentful Paint | 2.2 s | 1.6 s |
| Largest Contentful Paint | 2.2 s | 1.7 s |
| Speed Index | 4.1 s | 1.6 s |
| Total Blocking Time | 8 ms | 0 ms |
| Unused JavaScript | 140 KiB | 0 |
| Accessibility / Best practices / SEO | 100 / 96 / 100 | 100 / 96 / 100 |

## Findings fixed

1. **Unused JavaScript (140 KiB).** Every task was bundled into one 607 kB entry chunk. Tasks are now
   loaded with `React.lazy` from `src/registry.ts` (with hover/focus prefetch); TanStack Query's provider moved
   into Task 14's chunk. Entry chunk: 188 → 49 kB gzip.
2. **Render-blocking third-party CSS.** Google Fonts replaced by self-hosted `@fontsource` fonts.
3. **Missing source maps** — `build.sourcemap` enabled.
4. **`/favicon.ico` 404** — added `public/favicon.svg`.

## Caveats (please read)

- The audit was run against a local `vite preview` of the production build, because the environment it
  ran in could not reach `github.io`. Lighthouse used its default simulated mobile throttling. Re-run against
  the live URL (command above) to confirm on the real host.
- The remaining console error in the "after" report is `i.pravatar.cc` avatar images being unreachable
  from that sandbox; it is not a defect on the live site. The remaining "render-blocking" note is the app's own
  (small) stylesheet.
- Lighthouse scores vary run to run; treat differences of a few points as noise. The unused-JavaScript and
  chunk-size changes are deterministic.
