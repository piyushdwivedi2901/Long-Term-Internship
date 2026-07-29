import { useEffect, useMemo, useState } from 'react'

/**
 * Day 6 — Task 11: Search/Filter Feature
 * Goal: Add a search bar that filters a fetched list in real time.
 */
export default function Task11_SearchFilter() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data)
        setStatus('success')
      })
      .catch(() => setStatus('error'))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.company.name.toLowerCase().includes(q)
    )
  }, [users, query])

  return (
    <div className="task-section">
      <p className="task-eyebrow">Search &amp; Filter</p>
      <h2>Search/Filter Feature</h2>
      <p className="task-goal">A real user list from JSONPlaceholder, filtered client-side by name, email, or company as you type — no extra request per keystroke.</p>
      <input
        className="search-input"
        placeholder="Search by name, email, or company…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {status === 'loading' && (
        <div className="spinner" style={{ marginTop: 12 }}><div className="spinner-circle" /><span>Loading users…</span></div>
      )}
      {status === 'error' && <p className="error-text">Couldn't load users. Try again shortly.</p>}
      {status === 'success' && (
        <>
          <p className="result-count">{filtered.length} result{filtered.length === 1 ? '' : 's'}</p>
          {filtered.length === 0 ? (
            <p className="empty-state">No one matches "{query}" — try a different name, email, or company.</p>
          ) : (
            <ul className="user-list">
              {filtered.map((u) => (
                <li key={u.id}>
                  <strong>{u.name}</strong> — {u.email} ({u.company.name})
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
