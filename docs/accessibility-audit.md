# Accessibility audit (Task 33)

Method: axe-core (the engine behind axe DevTools) run two ways, plus manual keyboard testing.

1. **In tests** — `src/days/day17/Task33_AccessibilityPass.test.tsx` runs axe against the Kanban
   board, the cart and the open cart modal in jsdom (`npm test`).
2. **In a real browser** — `npm run audit:a11y` drives Chromium through every task page and runs
   axe including colour contrast, which jsdom cannot compute.

## Findings and fixes

| Where | Finding | WCAG | Fix |
|---|---|---|---|
| Kanban (23) | Cards only movable by mouse drag | 2.1.1 Keyboard | Focusable cards; `←` / `→` and Move buttons; focus follows the card |
| Kanban (23) | Moves were silent | 4.1.3 Status Messages | Polite `aria-live` region announces moves/adds |
| Kanban (23) | Unlabelled inputs, heading skip, 4.3:1 priority pill | 1.3.1 / 1.4.3 | Labels, `h3` headings, lighter pill colour |
| Cart (20) | Unlabelled qty/coupon inputs, silent errors and totals | 1.3.1 / 4.1.3 | Labels, `role="alert"`, `role="status"` summary |
| Cart modal (32) | Needs focus management | 2.4.3 Focus Order | Focus trap, Escape, focus restore (`Modal.tsx`) |
| Whole app | `--text-faint` was 3.1:1 on surfaces | 1.4.3 Contrast | Token lightened to `#8b91a7` (≥ 4.5:1) |
| Task 6 | `role="switch"` had no accessible name | 4.1.2 | `aria-labelledby` |
| Tasks 8, 22 | `<select>` without a label | 1.3.1 | `aria-label` |
| Tasks 15–17, 25, 27, 29 | Heading levels skipped (h2 → h4) | 1.3.1 | `h3` |
| Task 28 | Scrollable `<pre>` not keyboard reachable | 2.1.1 | `tabIndex={0}` + label |
| Task 8 | Completed items faded with `opacity` (2.7:1) | 1.4.3 | Colour + strikethrough instead |

Result: 0 axe violations on all task pages (Chromium, colour contrast included).

## Not covered

A real screen reader (NVDA / VoiceOver) was not available in this environment, so announcement
wording is verified through the live-region DOM contents rather than by listening to it.
