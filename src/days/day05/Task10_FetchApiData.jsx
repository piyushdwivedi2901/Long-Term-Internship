import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, User } from 'lucide-react'

/**
 * Day 5 — Task 10: Fetch API Data
 * Goal: Pull data from a public API (JSONPlaceholder) and render a list.
 *
 * Extended: a second fetch joins each post to its author (a small
 * client-side "join" across two endpoints), a manual refresh button that
 * re-triggers the effect via a state dependency, and skeleton loaders
 * instead of a bare "Loading…" string.
 */
export default function Task10_FetchApiData() {
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState({})
  const [status, setStatus] = useState('idle')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(() => {
    let cancelled = false
    setStatus('loading')

    Promise.all([
      fetch('https://jsonplaceholder.typicode.com/posts?_limit=6').then((r) => r.json()),
      fetch('https://jsonplaceholder.typicode.com/users').then((r) => r.json()),
    ])
      .then(([postData, userData]) => {
        if (cancelled) return
        const byId = Object.fromEntries(userData.map((u) => [u.id, u]))
        setPosts(postData)
        setUsers(byId)
        setStatus('success')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load, refreshKey])

  return (
    <div className="task-section">
      <p className="task-eyebrow">Data Fetching</p>
      <h2>Fetch API Data</h2>
      <p className="task-goal">Posts and users fetched in parallel from JSONPlaceholder, then joined client-side so each post shows its author.</p>

      <div className="toolbar">
        <button onClick={() => setRefreshKey((k) => k + 1)} disabled={status === 'loading'}>
          <RefreshCw size={13} className="icon-inline" />
          Refresh
        </button>
        {status === 'success' && <span className="result-count">{posts.length} posts loaded</span>}
      </div>

      {status === 'loading' && (
        <ul className="post-list" style={{ listStyle: 'none', padding: 0 }}>
          {[1, 2, 3].map((i) => (
            <li key={i} className="post-item">
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: '100%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 10, width: '80%' }} />
            </li>
          ))}
        </ul>
      )}

      {status === 'error' && <p className="error-text">Couldn't load posts. Check your connection and try again.</p>}

      {status === 'success' && (
        <ul className="post-list" style={{ listStyle: 'none', padding: 0 }}>
          {posts.map((post) => {
            const author = users[post.userId]
            return (
              <li key={post.id} className="post-item">
                <h4>{post.title}</h4>
                <p>{post.body}</p>
                {author && (
                  <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 5, margin: 0 }}>
                    <User size={12} /> {author.name} · {author.company.name}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
