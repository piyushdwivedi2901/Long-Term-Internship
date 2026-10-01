import type { ProfileCardProps } from '../../components/ProfileCard'
import type { UseFetchResult } from '../../hooks/useFetch'

/**
 * Compile-time proofs for Task 27. Each `@ts-expect-error` line MUST be a
 * type error — if a type is loosened by accident, `tsc` reports the
 * directive as unused and `npm run typecheck` (and CI) fails. So the
 * guarantees described on the Task 27 page are enforced, not just claimed.
 */

// A correct value type-checks.
export const valid: ProfileCardProps = {
  name: 'Ada Lovelace',
  bio: 'First programmer.',
  image: 'https://example.com/ada.png',
  field: 'Mathematics',
  year: 1843,
}

// @ts-expect-error — `year` must be a number, not a string
export const wrongType: ProfileCardProps = { ...valid, year: '1843' }

// @ts-expect-error — `field` is required
export const missingProp: ProfileCardProps = { name: 'x', bio: 'x', image: 'x', year: 1 }

// The generic flows through: `data` is `string[] | null`, not `any`.
declare const result: UseFetchResult<string[]>
// @ts-expect-error — `data` may be null until the request succeeds
export const unsafe: string[] = result.data

// @ts-expect-error — `status` is a closed union, not any string
export const badStatus: UseFetchResult<number>['status'] = 'pending'
