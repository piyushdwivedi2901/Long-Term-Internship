import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom'

/**
 * Day 8 — Task 16: React Router Basics
 * Goal: Multi-page app with Home, About, Contact pages and navigation.
 *
 * Uses MemoryRouter (rather than BrowserRouter) since this app is embedded
 * inside the parent sidebar-navigation shell and shouldn't fight it for the
 * real browser URL. In a standalone app, swap in <BrowserRouter>.
 */
function Home() {
  return <p>Welcome to the home page of this mini multi-page demo.</p>
}
function About() {
  return <p>This is a small app built to practice React Router basics.</p>
}
function Contact() {
  return <p>Reach out at hello@example.com.</p>
}

function Nav() {
  const location = useLocation()
  const links = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ]
  return (
    <nav className="router-nav">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className={location.pathname === l.to ? 'active' : ''}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

export default function Task16_RouterBasics() {
  return (
    <div className="task-section">
      <h2>Task 16: React Router Basics</h2>
      <MemoryRouter initialEntries={['/']}>
        <Nav />
        <div className="router-page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
      </MemoryRouter>
    </div>
  )
}
