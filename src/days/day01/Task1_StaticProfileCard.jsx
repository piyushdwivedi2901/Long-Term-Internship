import { MapPin, Briefcase, Link as LinkIcon, Github, Linkedin } from 'lucide-react'

/**
 * Day 1 — Task 1: Static Profile Card
 * Goal: Render a card with a name, image, and bio using hardcoded JSX.
 * (No props yet — everything is written directly inside the component.)
 *
 * Extended beyond the minimum brief with a stats row and social links to
 * show a fuller "real profile card" composition, still fully hardcoded.
 */
export default function Task1_StaticProfileCard() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Components &amp; JSX</p>
      <h2>Static Profile Card</h2>
      <p className="task-goal">Render a name, photo, and bio using hardcoded JSX — no props yet, everything lives inside the component.</p>

      <div className="card" style={{ maxWidth: 340 }}>
        <img
          className="card-avatar"
          src="https://i.pravatar.cc/150?img=12"
          alt="Piyush Dwivedi"
        />
        <h3 className="card-name">Piyush Dwivedi</h3>
        <p className="hint" style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <MapPin size={13} /> Mumbai, India
          <span style={{ color: 'var(--border)' }}>·</span>
          <Briefcase size={13} /> React Intern
        </p>
        <p className="card-bio">
          Frontend developer in training, currently learning React through a
          structured 5-week internship roadmap — components, hooks, routing,
          and mini projects.
        </p>

        <div className="stat-grid" style={{ margin: '14px 0', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
            <div className="stat-card-value accent" style={{ fontSize: '1.1rem' }}>26</div>
            <div className="stat-card-label" style={{ justifyContent: 'center' }}>Tasks</div>
          </div>
          <div className="stat-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
            <div className="stat-card-value done" style={{ fontSize: '1.1rem' }}>13</div>
            <div className="stat-card-label" style={{ justifyContent: 'center' }}>Days</div>
          </div>
          <div className="stat-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
            <div className="stat-card-value" style={{ fontSize: '1.1rem' }}>5</div>
            <div className="stat-card-label" style={{ justifyContent: 'center' }}>Weeks</div>
          </div>
        </div>

        <div className="button-row">
          <button className="icon-btn" aria-label="GitHub"><Github size={15} /></button>
          <button className="icon-btn" aria-label="LinkedIn"><Linkedin size={15} /></button>
          <button className="icon-btn" aria-label="Portfolio site"><LinkIcon size={15} /></button>
        </div>
      </div>
    </div>
  )
}
