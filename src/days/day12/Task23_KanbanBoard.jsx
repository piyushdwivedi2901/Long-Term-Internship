import { useState } from 'react'
import { Plus, GripVertical } from 'lucide-react'

/**
 * Day 12 — Task 23: Kanban / Task Board
 * Goal: Drag-and-drop tasks between columns (To Do / In Progress / Done).
 * Uses the native HTML5 drag-and-drop API — no external DnD library needed.
 *
 * Extended with a priority tag per card, a per-column "add task" input,
 * and a task count badge in each column header — turning the static
 * three-column demo into something closer to a real board.
 */
let nextId = 5

const initialColumns = {
  todo: { title: 'To Do', taskIds: [1, 2] },
  inProgress: { title: 'In Progress', taskIds: [3] },
  done: { title: 'Done', taskIds: [4] },
}

const initialTasks = {
  1: { id: 1, text: 'Design database schema', priority: 'high' },
  2: { id: 2, text: 'Write API documentation', priority: 'low' },
  3: { id: 3, text: 'Build login page', priority: 'medium' },
  4: { id: 4, text: 'Set up CI pipeline', priority: 'medium' },
}

export default function Task23_KanbanBoard() {
  const [columns, setColumns] = useState(initialColumns)
  const [tasks, setTasks] = useState(initialTasks)
  const [dragging, setDragging] = useState(null) // { taskId, fromColumn }
  const [drafts, setDrafts] = useState({ todo: '', inProgress: '', done: '' })

  const handleDragStart = (taskId, fromColumn) => setDragging({ taskId, fromColumn })

  const handleDrop = (toColumn) => {
    if (!dragging) return
    const { taskId, fromColumn } = dragging
    if (fromColumn !== toColumn) {
      setColumns((prev) => ({
        ...prev,
        [fromColumn]: { ...prev[fromColumn], taskIds: prev[fromColumn].taskIds.filter((id) => id !== taskId) },
        [toColumn]: { ...prev[toColumn], taskIds: [...prev[toColumn].taskIds, taskId] },
      }))
    }
    setDragging(null)
  }

  const addTask = (colId, e) => {
    e.preventDefault()
    const text = drafts[colId].trim()
    if (!text) return
    const id = nextId++
    setTasks((prev) => ({ ...prev, [id]: { id, text, priority: 'medium' } }))
    setColumns((prev) => ({ ...prev, [colId]: { ...prev[colId], taskIds: [...prev[colId].taskIds, id] } }))
    setDrafts((d) => ({ ...d, [colId]: '' }))
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">Mini Project</p>
      <h2>Kanban / Task Board</h2>
      <p className="task-goal">Drag a card between columns with the native HTML5 drag-and-drop API, or add new cards directly into any column.</p>
      <div className="kanban-board">
        {Object.entries(columns).map(([colId, col]) => (
          <div
            key={colId}
            className="kanban-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(colId)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>{col.title}</h4>
              <span className="pill">{col.taskIds.length}</span>
            </div>

            {col.taskIds.map((taskId) => (
              <div
                key={taskId}
                className="kanban-card"
                draggable
                onDragStart={() => handleDragStart(taskId, colId)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <span><GripVertical size={12} className="icon-inline" style={{ color: 'var(--text-faint)' }} />{tasks[taskId].text}</span>
                </div>
                <span className={`pill p-${tasks[taskId].priority}`} style={{ marginTop: 6, display: 'inline-flex' }}>{tasks[taskId].priority}</span>
              </div>
            ))}
            {col.taskIds.length === 0 && <p className="empty-state" style={{ fontSize: '0.78rem', padding: 10 }}>Drop tasks here</p>}

            <form onSubmit={(e) => addTask(colId, e)} style={{ marginTop: 10, display: 'flex', gap: 4 }}>
              <input
                value={drafts[colId]}
                onChange={(e) => setDrafts((d) => ({ ...d, [colId]: e.target.value }))}
                placeholder="Add card…"
                style={{ flex: 1, fontSize: '0.8rem', padding: '5px 8px' }}
              />
              <button className="icon-btn" type="submit" aria-label={`Add card to ${col.title}`}><Plus size={13} /></button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
