import { useEffect, useState } from 'react'

/**
 * Day 5 — Task 10: Fetch API Data
 * Goal: Pull data from a public API (JSONPlaceholder) and render a list.
 */
export default function Task10_FetchApiData() {
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    fetch('https://jsonplaceholder.typicode.com/posts?_limit=6')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setPosts(data)
          setStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="task-section">
      <p className="task-eyebrow">Data Fetching</p>
      <h2>Fetch API Data</h2>
      <p className="task-goal">Six posts pulled from JSONPlaceholder on mount, with a cancellation guard so a fast unmount can't set state on a gone component.</p>
      {status === 'loading' && (
        <div className="spinner"><div className="spinner-circle" /><span>Loading posts…</span></div>
      )}
      {status === 'error' && <p className="error-text">Couldn't load posts. Check your connection and try again.</p>}
      {status === 'success' && (
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.id} className="post-item">
              <h4>{post.title}</h4>
              <p>{post.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
