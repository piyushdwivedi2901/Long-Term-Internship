import { useFetch } from '../../hooks/useFetch.js'
import { useLocalStorage } from '../../hooks/useLocalStorage.js'

/**
 * Day 7 — Task 14: Custom Hooks
 * Goal: Extract reusable logic like useFetch or useLocalStorage,
 * and demonstrate both in one component.
 */
export default function Task14_CustomHooks() {
  const { data: albums, status } = useFetch(
    'https://jsonplaceholder.typicode.com/albums?_limit=5'
  )
  const [notes, setNotes] = useLocalStorage('task14-notes', '')

  return (
    <div className="task-section">
      <p className="task-eyebrow">Custom Hooks</p>
      <h2>Custom Hooks</h2>
      <p className="task-goal">Two reusable hooks — <code>useFetch</code> for GET requests, <code>useLocalStorage</code> for a persisted value — extracted out of components so any component can reuse them.</p>

      <h4>useFetch(url)</h4>
      {status === 'loading' && (
        <div className="spinner"><div className="spinner-circle" /><span>Loading albums…</span></div>
      )}
      {status === 'error' && <p className="error-text">Couldn't load albums.</p>}
      {status === 'success' && (
        <ul>
          {albums.map((a) => (
            <li key={a.id}>{a.title}</li>
          ))}
        </ul>
      )}

      <h4>useLocalStorage(key, initialValue)</h4>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type a note — refresh the page, it'll still be here."
        rows={3}
        style={{ width: '100%' }}
      />
      <p className="hint">Persisted under localStorage key "task14-notes".</p>
    </div>
  )
}
