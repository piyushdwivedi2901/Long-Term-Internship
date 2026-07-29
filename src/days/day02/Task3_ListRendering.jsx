import { useMemo, useState } from 'react'
import { Star, Search, ArrowUpDown } from 'lucide-react'

/**
 * Day 2 — Task 3: List Rendering
 * Goal: Given an array of objects (10 movies), render them using .map()
 * with proper `key` props.
 *
 * Extended: search-as-you-type filtering and a clickable, sortable column
 * header — still the same core .map()-with-keys pattern, applied to a
 * derived (filtered + sorted) array rather than the raw one.
 */
const movies = [
  { id: 1, title: 'Inception', year: 2010, rating: 8.8, genre: 'Sci-Fi' },
  { id: 2, title: 'The Matrix', year: 1999, rating: 8.7, genre: 'Sci-Fi' },
  { id: 3, title: 'Interstellar', year: 2014, rating: 8.6, genre: 'Sci-Fi' },
  { id: 4, title: 'Parasite', year: 2019, rating: 8.5, genre: 'Thriller' },
  { id: 5, title: 'The Dark Knight', year: 2008, rating: 9.0, genre: 'Action' },
  { id: 6, title: 'Whiplash', year: 2014, rating: 8.5, genre: 'Drama' },
  { id: 7, title: 'Spirited Away', year: 2001, rating: 8.6, genre: 'Animation' },
  { id: 8, title: 'The Prestige', year: 2006, rating: 8.5, genre: 'Mystery' },
  { id: 9, title: 'Arrival', year: 2016, rating: 7.9, genre: 'Sci-Fi' },
  { id: 10, title: 'Coco', year: 2017, rating: 8.4, genre: 'Animation' },
]

const SORT_KEYS = ['title', 'year', 'rating']

export default function Task3_ListRendering() {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('rating')
  const [sortDir, setSortDir] = useState('desc')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? movies.filter((m) => m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q))
      : movies
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (typeof a[sortKey] === 'string') return a[sortKey].localeCompare(b[sortKey]) * dir
      return (a[sortKey] - b[sortKey]) * dir
    })
  }, [query, sortKey, sortDir])

  const avgRating = (movies.reduce((s, m) => s + m.rating, 0) / movies.length).toFixed(2)

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">Rendering Lists</p>
      <h2>List Rendering</h2>
      <p className="task-goal">An array of ten movies rendered with <code>.map()</code>, each row keyed by a stable id rather than array index.</p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total titles</div>
          <div className="stat-card-value">{movies.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg. rating</div>
          <div className="stat-card-value accent">{avgRating}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Showing</div>
          <div className="stat-card-value done">{visible.length}</div>
        </div>
      </div>

      <div className="toolbar">
        <div style={{ position: 'relative', maxWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-faint)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 30, maxWidth: 260 }}
            placeholder="Filter by title or genre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="tab-group">
          {SORT_KEYS.map((key) => (
            <button
              key={key}
              className={`tab-btn ${sortKey === key ? 'active' : ''}`}
              onClick={() => toggleSort(key)}
            >
              {key === 'rating' ? 'Rating' : key === 'year' ? 'Year' : 'Title'}
              {sortKey === key && <ArrowUpDown size={11} className="icon-inline" style={{ marginLeft: 4, marginRight: 0 }} />}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">No titles match "{query}".</p>
      ) : (
        <ul className="movie-list">
          {visible.map((movie) => (
            <li key={movie.id} className="movie-item">
              <span className="movie-title">{movie.title}</span>
              <span className="pill">{movie.genre}</span>
              <span className="movie-year">{movie.year}</span>
              <span className="movie-rating"><Star size={12} className="icon-inline" style={{ marginRight: 2 }} />{movie.rating}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
