import { useMemo, useState } from 'react'
import { ShieldCheck, Braces } from 'lucide-react'
import { ProfileCard, type ProfileCardProps } from '../../components/ProfileCard'
import { useFetch } from '../../hooks/useFetch'

/**
 * Day 14 — Task 27: TypeScript Basics
 * Goal: Convert ProfileCard and useFetch to .tsx/.ts; type props, state,
 * and the hook's generic return.
 *
 * - ProfileCard -> src/components/ProfileCard.tsx (props interface)
 * - useFetch    -> src/hooks/useFetch.ts (generic `UseFetchResult<T>`)
 * - This page exercises both, plus a union-typed piece of state.
 * - Task27_TypeChecks.ts holds `@ts-expect-error` proofs that the compiler
 *   really rejects bad usage.
 */
interface User {
  id: number
  name: string
  email: string
  company: { name: string }
}

type SortKey = 'name' | 'email'

const people: ProfileCardProps[] = [
  {
    name: 'Anders Hejlsberg',
    field: 'Language design',
    year: 2012,
    bio: 'Lead architect of TypeScript, and earlier of C# and Turbo Pascal.',
    image: 'https://i.pravatar.cc/150?img=15',
  },
  {
    name: 'Barbara Liskov',
    field: 'Type theory',
    year: 1987,
    bio: 'Formulated the substitution principle that underpins safe subtyping.',
    image: 'https://i.pravatar.cc/150?img=44',
  },
]

export default function Task27_TypeScriptBasics() {
  const { data: users, status, error } = useFetch<User[]>('https://jsonplaceholder.typicode.com/users?_limit=5')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const sorted = useMemo<User[]>(
    () => [...(users ?? [])].sort((a, b) => a[sortKey].localeCompare(b[sortKey])),
    [users, sortKey],
  )

  return (
    <div className="task-section">
      <p className="task-eyebrow">TypeScript</p>
      <h2>TypeScript Basics</h2>
      <p className="task-goal">
        <code>ProfileCard</code> and <code>useFetch</code> converted to <code>.tsx</code>/<code>.ts</code>:
        typed props, typed state, and a generic hook return — with compile-time proofs checked by <code>npm run typecheck</code>.
      </p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 420 }}>
        <div className="stat-card">
          <div className="stat-card-label"><ShieldCheck size={11} className="icon-inline" />Strict mode</div>
          <div className="stat-card-value done">on</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Converted</div>
          <div className="stat-card-value accent">2</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Compile proofs</div>
          <div className="stat-card-value">4</div>
        </div>
      </div>

      <h3>1 · Typed props — <code>ProfileCardProps</code></h3>
      <div className="card-grid" style={{ marginBottom: 20 }}>
        {people.map((p) => (
          <ProfileCard key={p.name} {...p} />
        ))}
      </div>
      <pre className="code-block">{`export interface ProfileCardProps {
  name: string
  bio: string
  image: string
  field: string
  year: number
}`}</pre>

      <h3>2 · Generic hook — <code>useFetch&lt;User[]&gt;</code></h3>
      <div className="toolbar">
        <div className="tab-group" role="group" aria-label="Sort users by">
          {(['name', 'email'] as const).map((key) => (
            <button key={key} className={`tab-btn ${sortKey === key ? 'active' : ''}`} onClick={() => setSortKey(key)}>
              {key}
            </button>
          ))}
        </div>
        <span className="result-count">status: {status}</span>
      </div>
      {status === 'loading' && (
        <div className="spinner"><div className="spinner-circle" /><span>Loading users…</span></div>
      )}
      {status === 'error' && <p className="error-text">Couldn't load users: {error?.message}</p>}
      {status === 'success' && (
        <ul className="user-list">
          {sorted.map((u) => (
            <li key={u.id}>
              <span>
                <strong>{u.name}</strong>
                <br />
                <span className="hint">{u.email} · {u.company.name}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <pre className="code-block">{`function useFetch<T = unknown>(url: string | null | undefined): {
  data: T | null          // typed by the caller: User[] | null
  status: 'idle' | 'loading' | 'success' | 'error'
  error: Error | null
}`}</pre>

      <h3><Braces size={14} className="icon-inline" />3 · What the compiler rejects</h3>
      <p className="hint">These lines live in <code>Task27_TypeChecks.ts</code> as <code>@ts-expect-error</code> directives — if the types were loosened, CI would fail.</p>
      <pre className="code-block">{`const a: ProfileCardProps = { ...valid, year: `}<span className="tok-err">{`'1843'`}</span>{` }   `}<span className="tok-dim">{`// string is not number`}</span>{`
const b: ProfileCardProps = { name, bio, image, year }  `}<span className="tok-dim">{`// 'field' missing`}</span>{`
const c: string[] = result.data                          `}<span className="tok-dim">{`// might be null`}</span>{`
const d: UseFetchResult<number>['status'] = `}<span className="tok-err">{`'pending'`}</span>{`  `}<span className="tok-dim">{`// not in the union`}</span></pre>
    </div>
  )
}
