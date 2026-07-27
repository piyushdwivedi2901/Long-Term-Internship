import { useState } from 'react'
import Task1_StaticProfileCard from './days/day01/Task1_StaticProfileCard.jsx'
import Task2_PropsPractice from './days/day01/Task2_PropsPractice.jsx'

// Registry of all completed tasks. Add a new entry here each time
// a new day's tasks are built — the nav and viewer pick it up automatically.
const taskRegistry = [
  {
    day: 1,
    label: 'Day 1',
    tasks: [
      { id: 'd1-t1', title: 'Task 1: Static Profile Card', Component: Task1_StaticProfileCard },
      { id: 'd1-t2', title: 'Task 2: Props Practice', Component: Task2_PropsPractice },
    ],
  },
]

const allTasks = taskRegistry.flatMap((d) => d.tasks)

export default function App() {
  const [activeId, setActiveId] = useState(allTasks[0].id)
  const active = allTasks.find((t) => t.id === activeId)
  const ActiveComponent = active.Component

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="sidebar-title">Long Term Internship</h1>
        <p className="sidebar-subtitle">React practice log</p>
        {taskRegistry.map((day) => (
          <div key={day.day} className="day-group">
            <h4>{day.label}</h4>
            <ul>
              {day.tasks.map((t) => (
                <li key={t.id}>
                  <button
                    className={t.id === activeId ? 'active' : ''}
                    onClick={() => setActiveId(t.id)}
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <main className="content">
        <ActiveComponent />
      </main>
    </div>
  )
}
