import axe, { type AxeResults, type Result } from 'axe-core'

/**
 * Run axe-core against a DOM node and return the violations. jsdom has no
 * layout engine, so colour-contrast is disabled here (it is covered by the
 * in-browser audit instead). The page-level "region" rule is off too: these
 * tests render one component in isolation, while the real app wraps every
 * task in <main>.
 */
export async function runAxe(node: Element = document.body): Promise<Result[]> {
  const results: AxeResults = await axe.run(node, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return results.violations
}

export function formatViolations(violations: Result[]): string {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`)
    .join('\n')
}
