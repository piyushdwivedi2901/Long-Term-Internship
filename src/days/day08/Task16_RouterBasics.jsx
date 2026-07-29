import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Info, Mail } from 'lucide-react'

/**
 * Day 8 — Task 16: React Router Basics
 * Goal: Multi-page app with Home, About, Contact pages and navigation.
 *
 * Uses MemoryRouter (rather than BrowserRouter) since this app is embedded
 * inside the parent sidebar-navigation shell and shouldn't fight it for the
 * real browser URL. In a standalone app, swap in <BrowserRouter>.
 */
function Home() {
  return (
    <div>
      <h4><HomeIcon size={15} className="icon-inline" />Home</h4>
      <p>Welcome to the home page of this mini multi-page demo.</p>
    </div>
  )
}
function About() {
  return (
    <div>
      <h4><Info size={15} className="icon-inline" />About</h4>
      <p>This is a small app built to practice React Router basics — client-side navigation with no full page reloads.</p>
    </div>
  )
}
function Contact() {
  return (
    <div>
      <h4><Mail size={15} className="icon-inline" />Contact</h4>
      <p>Reach out at hello@example.com.</p>
    </div>
  )
}

function Nav() {
  const location = useLocation()
  const links = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/about', label: 'About', icon: Info },
    { to: '/contact', label: 'Contact', icon: Mail },
  ]
  return (
    <nav className="router-nav">
      {links.map((l) => {
        const Icon = l.icon
        return (
          <Link
            key={l.to}
            to={l.to}
            className={location.pathname === l.to ? 'active' : ''}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Icon size={13} /> {l.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Task16_RouterBasics() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">React Router</p>
      <h2>React Router Basics</h2>
      <p className="task-goal">Three routes, one nav bar that highlights the active link. Uses <code>MemoryRouter</code> since this demo is nested inside the outer sidebar shell.</p>
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
