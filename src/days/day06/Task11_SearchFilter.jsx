import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'

/**
 * Day 6 — Task 11: Search/Filter Feature
 * Goal: Add a search bar that filters a fetched list in real time.
 *
 * Extended: a sort control (name / company) layered on top of the filter,
 * and initials-avatar badges per user for a more finished list UI.
 */
function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default function Task11_SearchFilter() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
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
    const base = q
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.company.name.toLowerCase().includes(q)
        )
      : users
    return [...base].sort((a, b) =>
      sortBy === 'company' ? a.company.name.localeCompare(b.company.name) : a.name.localeCompare(b.name)
    )
  }, [users, query, sortBy])

  return (
    <div className="task-section">
      <p className="task-eyebrow">Search &amp; Filter</p>
      <h2>Search/Filter Feature</h2>
      <p className="task-goal">A real user list from JSONPlaceholder, filtered client-side by name, email, or company as you type — no extra request per keystroke.</p>

      <div className="toolbar">
        <div style={{ position: 'relative', maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-faint)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 30, maxWidth: 280 }}
            placeholder="Search by name, email, or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="tab-group">
          {['name', 'company'].map((key) => (
            <button key={key} className={`tab-btn ${sortBy === key ? 'active' : ''}`} onClick={() => setSortBy(key)}>
              {key === 'name' ? 'Name' : 'Company'}
              {sortBy === key && <ArrowUpDown size={11} className="icon-inline" style={{ marginLeft: 4, marginRight: 0 }} />}
            </button>
          ))}
        </div>
      </div>

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
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="avatar-fallback">{initials(u.name)}</span>
                    <span>
                      <strong>{u.name}</strong>
                      <br />
                      <span className="hint">{u.email} · {u.company.name}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
