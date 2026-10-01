import { useState } from 'react'
import { MemoryRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, Reorder, motion } from 'framer-motion'
import { GripVertical, Plus, X } from 'lucide-react'

/**
 * Task 34 — Animation (framer-motion)
 *  1. List add / remove  → AnimatePresence + layout
 *  2. Drag feedback      → Reorder.Group with whileDrag lift
 *  3. Route changes      → keyed <Routes> inside AnimatePresence
 *
 * <MotionConfig reducedMotion="user"> turns transform animations off for
 * visitors who ask their OS for reduced motion.
 */

/* ---------- 1. Animated list ---------- */
interface Item {
  id: number
  text: string
}

let nextItemId = 4

function AnimatedList() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, text: 'Plan the sprint' },
    { id: 2, text: 'Review pull requests' },
    { id: 3, text: 'Write release notes' },
  ])
  const [draft, setDraft] = useState('')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setItems((prev) => [{ id: nextItemId++, text }, ...prev])
    setDraft('')
  }

  return (
    <div>
      <form onSubmit={add} className="toolbar">
        <input
          className="search-input"
          aria-label="New item"
          placeholder="Add an item…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit"><Plus size={13} className="icon-inline" aria-hidden="true" />Add</button>
      </form>
      <ul className="anim-list" aria-label="Animated list">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <span>{item.text}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${item.text}`}
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

/* ---------- 2. Drag feedback ---------- */
function DragReorder() {
  const [order, setOrder] = useState(['Design', 'Build', 'Test', 'Ship'])
  return (
    <div>
      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="anim-list" aria-label="Drag to reorder">
        {order.map((label) => (
          <Reorder.Item
            key={label}
            value={label}
            className="anim-drag-item"
            whileDrag={{ scale: 1.04, boxShadow: '0 12px 28px rgba(0,0,0,0.45)', cursor: 'grabbing' }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          >
            <GripVertical size={13} aria-hidden="true" />
            <span>{label}</span>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <p className="hint" data-testid="t34-order">Order: {order.join(' → ')}</p>
    </div>
  )
}

/* ---------- 3. Route transitions ---------- */
const pages = {
  '/': { title: 'Home', body: 'Pages fade and slide as the route changes.' },
  '/about': { title: 'About', body: 'The outgoing page finishes its exit before this one enters.' },
  '/contact': { title: 'Contact', body: 'Keyed on the pathname, so each route is a distinct animation.' },
} as const

function Page({ path }: { path: keyof typeof pages }) {
  const { title, body } = pages[path]
  return (
    <motion.div
      className="anim-page"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <h3>{title}</h3>
      <p>{body}</p>
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page path="/" />} />
        <Route path="/about" element={<Page path="/about" />} />
        <Route path="/contact" element={<Page path="/contact" />} />
      </Routes>
    </AnimatePresence>
  )
}

function RouteDemo() {
  return (
    <MemoryRouter>
      <nav className="router-nav" aria-label="Animated demo routes">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <div className="anim-page-wrap">
        <AnimatedRoutes />
      </div>
    </MemoryRouter>
  )
}

export default function Task34_Animation() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="task-section">
        <p className="task-eyebrow">Motion</p>
        <h2>Animation</h2>
        <p className="task-goal">
          Three kinds of purposeful motion with framer-motion: a list that animates items in and out,
          drag feedback that lifts the item you hold, and page transitions between routes. All of it
          respects <code>prefers-reduced-motion</code>.
        </p>

        <div className="anim-grid">
          <section aria-labelledby="t34-list">
            <h3 id="t34-list">1 · List add / remove</h3>
            <AnimatedList />
          </section>
          <section aria-labelledby="t34-drag">
            <h3 id="t34-drag">2 · Drag feedback</h3>
            <DragReorder />
          </section>
          <section aria-labelledby="t34-route">
            <h3 id="t34-route">3 · Route transitions</h3>
            <RouteDemo />
          </section>
        </div>
      </div>
    </MotionConfig>
  )
}
