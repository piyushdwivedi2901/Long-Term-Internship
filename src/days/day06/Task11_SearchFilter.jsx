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
      <h2>Task 11: Search/Filter Feature</h2>
      <input
        className="search-input"
        placeholder="Search by name, email, or company…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {status === 'loading' && <p>Loading users…</p>}
      {status === 'error' && <p className="error-text">Failed to load users.</p>}
      {status === 'success' && (
        <>
          <p className="result-count">{filtered.length} result(s)</p>
          <ul className="user-list">
            {filtered.map((u) => (
              <li key={u.id}>
                <strong>{u.name}</strong> — {u.email} ({u.company.name})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
