import { useMemo, useState } from 'react'
import { Sparkles, ArrowUpDown } from 'lucide-react'

/**
 * Day 1 — Task 2: Props Practice
 * Goal: Convert the static card into a reusable <ProfileCard name="" bio="" />
 * component and render 3-4 different ones by passing different props.
 *
 * Extended: each card also takes a `field` and `year` prop to demonstrate
 * passing several props of different types (string, number), plus a sort
 * control that reorders the rendered cards by year — a small taste of
 * props + derived state working together.
 */
function ProfileCard({ name, bio, image, field, year }) {
  return (
    <div className="card">
      <img className="card-avatar" src={image} alt={name} />
      <h3 className="card-name">{name}</h3>
      <p className="pill" style={{ marginBottom: 8 }}>
        <Sparkles size={11} /> {field}
      </p>
      <p className="card-bio">{bio}</p>
      <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Active {year}</p>
    </div>
  )
}

const people = [
  {
    name: 'Ada Lovelace',
    field: 'Mathematics',
    year: 1843,
    bio: 'Wrote the first algorithm intended for a machine, decades before computers existed.',
    image: 'https://i.pravatar.cc/150?img=47',
  },
  {
    name: 'Grace Hopper',
    field: 'Compilers',
    year: 1952,
    bio: 'Pioneered machine-independent programming languages and built the first compiler.',
    image: 'https://i.pravatar.cc/150?img=32',
  },
  {
    name: 'Alan Turing',
    field: 'Computation Theory',
    year: 1936,
    bio: 'Formalized the theoretical limits of computation, foundational to computer science.',
    image: 'https://i.pravatar.cc/150?img=68',
  },
  {
    name: 'Margaret Hamilton',
    field: 'Software Engineering',
    year: 1969,
    bio: 'Led the team behind the on-board flight software for NASA\u2019s Apollo missions.',
    image: 'https://i.pravatar.cc/150?img=45',
  },
]

export default function Task2_PropsPractice() {
  const [sortAsc, setSortAsc] = useState(true)

  const sorted = useMemo(
    () => [...people].sort((a, b) => (sortAsc ? a.year - b.year : b.year - a.year)),
    [sortAsc]
  )

  return (
    <div className="task-section">
      <p className="task-eyebrow">Components &amp; JSX</p>
      <h2>Props Practice</h2>
      <p className="task-goal">The same card, made reusable. One <code>&lt;ProfileCard /&gt;</code> component, rendered four times with different props.</p>

      <div className="toolbar">
        <button onClick={() => setSortAsc((v) => !v)}>
          <ArrowUpDown size={13} className="icon-inline" />
          Sort by year: {sortAsc ? 'oldest first' : 'newest first'}
        </button>
      </div>

      <div className="card-grid">
        {sorted.map((person) => (
          <ProfileCard key={person.name} {...person} />
        ))}
      </div>
    </div>
  )
}
