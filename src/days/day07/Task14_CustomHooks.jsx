import { useFetch } from '../../hooks/useFetch.js'
import { useLocalStorage } from '../../hooks/useLocalStorage.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { Save, Disc, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * Day 7 — Task 14: Custom Hooks
 * Goal: Extract reusable logic like useFetch or useLocalStorage.
 *
 * Extended to demonstrate three hooks working together: useDebounce
 * settles a search box, its debounced value is used as the `useFetch`
 * URL (so the request only fires once typing pauses), and the last
 * search term is preserved with useLocalStorage across reloads.
 */
export default function Task14_CustomHooks() {
  const [savedTerm, setSavedTerm] = useLocalStorage('task14-search-term', 'love')
  const [term, setTerm] = useState(savedTerm)
  const debouncedTerm = useDebounce(term, 500)

  const url = useMemo(
    () => `https://jsonplaceholder.typicode.com/comments?email_like=${encodeURIComponent(debouncedTerm)}`,
    [debouncedTerm]
  )
  const { data: comments, status } = useFetch(debouncedTerm ? url : null)

  const handleSave = () => setSavedTerm(term)

  return (
    <div className="task-section">
      <p className="task-eyebrow">Custom Hooks</p>
      <h2>Custom Hooks</h2>
      <p className="task-goal">Three reusable hooks composed together — <code>useDebounce</code> settles typing, <code>useFetch</code> fires the request, <code>useLocalStorage</code> remembers the last search.</p>

      <div style={{ position: 'relative', maxWidth: 300, marginBottom: 10 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-faint)' }} />
        <input
          className="search-input"
          style={{ paddingLeft: 30, maxWidth: 300 }}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search comment emails (e.g. love, ea, us)…"
        />
      </div>
      <div className="toolbar" style={{ marginTop: 0 }}>
        <button onClick={handleSave}><Save size={13} className="icon-inline" />Remember this search</button>
        {savedTerm && <span className="hint"><Disc size={11} className="icon-inline" />Saved: "{savedTerm}"</span>}
      </div>

      {debouncedTerm !== term && <p className="hint">Debouncing…</p>}
      {status === 'loading' && (
        <div className="spinner"><div className="spinner-circle" /><span>Fetching matches…</span></div>
      )}
      {status === 'error' && <p className="error-text">Couldn't load comments.</p>}
      {status === 'success' && comments && (
        <>
          <p className="result-count">{comments.length} match{comments.length === 1 ? '' : 'es'} for "{debouncedTerm}"</p>
          <ul className="user-list">
            {comments.slice(0, 5).map((c) => (
              <li key={c.id}>
                <strong>{c.email}</strong>
                <br />
                <span className="hint">{c.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
