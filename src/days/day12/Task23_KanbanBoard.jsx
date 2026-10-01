import { useEffect, useRef, useState } from 'react'
import { Plus, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Day 12 — Task 23: Kanban / Task Board
 * Goal: Drag-and-drop tasks between columns (To Do / In Progress / Done).
 * Uses the native HTML5 drag-and-drop API — no external DnD library needed.
 *
 * Extended with a priority tag per card, a per-column "add task" input,
 * and a task count badge in each column header — turning the static
 * three-column demo into something closer to a real board.
 *
 * Accessibility pass (Task 33): drag-and-drop is mouse-only, so every card
 * can also be moved from the keyboard (focus a card, press ← / →, or use its
 * "Move" buttons), each move is announced through an aria-live region, and
 * focus follows the card to its new column.
 */
const COLUMN_ORDER = ['todo', 'inProgress', 'done']

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
  const [overColumn, setOverColumn] = useState(null)
  const [drafts, setDrafts] = useState({ todo: '', inProgress: '', done: '' })
  const [announcement, setAnnouncement] = useState('')
  const focusCardId = useRef(null)

  // After a keyboard move the card re-mounts in another column; put focus back on it.
  useEffect(() => {
    if (focusCardId.current != null) {
      document.querySelector(`[data-card-id="${focusCardId.current}"]`)?.focus()
      focusCardId.current = null
    }
  }, [columns])

  const handleDragStart = (taskId, fromColumn) => setDragging({ taskId, fromColumn })

  const moveTask = (taskId, fromColumn, toColumn) => {
    if (fromColumn === toColumn) return
    setColumns((prev) => ({
      ...prev,
      [fromColumn]: { ...prev[fromColumn], taskIds: prev[fromColumn].taskIds.filter((id) => id !== taskId) },
      [toColumn]: { ...prev[toColumn], taskIds: [...prev[toColumn].taskIds, taskId] },
    }))
    const position = columns[toColumn].taskIds.length + 1
    setAnnouncement(`Moved "${tasks[taskId].text}" to ${columns[toColumn].title}, position ${position} of ${position}.`)
  }

  const handleDrop = (toColumn) => {
    if (!dragging) return
    moveTask(dragging.taskId, dragging.fromColumn, toColumn)
    setDragging(null)
    setOverColumn(null)
  }

  const moveByKeyboard = (taskId, fromColumn, direction) => {
    const target = COLUMN_ORDER[COLUMN_ORDER.indexOf(fromColumn) + direction]
    if (!target) {
      setAnnouncement(`"${tasks[taskId].text}" is already in the ${direction < 0 ? 'first' : 'last'} column.`)
      return
    }
    focusCardId.current = taskId
    moveTask(taskId, fromColumn, target)
  }

  const onCardKeyDown = (e, taskId, colId) => {
    if (e.target !== e.currentTarget) return // ignore keys from the buttons inside the card
    if (e.key === 'ArrowLeft') { e.preventDefault(); moveByKeyboard(taskId, colId, -1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); moveByKeyboard(taskId, colId, 1) }
  }

  const addTask = (colId, e) => {
    e.preventDefault()
    const text = drafts[colId].trim()
    if (!text) return
    const id = nextId++
    setTasks((prev) => ({ ...prev, [id]: { id, text, priority: 'medium' } }))
    setColumns((prev) => ({ ...prev, [colId]: { ...prev[colId], taskIds: [...prev[colId].taskIds, id] } }))
    setDrafts((d) => ({ ...d, [colId]: '' }))
    setAnnouncement(`Added "${text}" to ${columns[colId].title}.`)
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">Mini Project</p>
      <h2>Kanban / Task Board</h2>
      <p className="task-goal">Drag a card between columns with the native HTML5 drag-and-drop API, or add new cards directly into any column.
        Keyboard: Tab to a card, then press <kbd>←</kbd> / <kbd>→</kbd> to move it between columns.</p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      <div className="kanban-board">
        {Object.entries(columns).map(([colId, col]) => (
          <section
            key={colId}
            className={`kanban-column ${overColumn === colId && dragging ? 'drag-over' : ''}`}
            aria-labelledby={`col-${colId}`}
            onDragOver={(e) => { e.preventDefault(); if (overColumn !== colId) setOverColumn(colId) }}
            onDrop={() => handleDrop(colId)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id={`col-${colId}`}>{col.title}</h3>
              <span className="pill" aria-label={`${col.taskIds.length} cards`}>{col.taskIds.length}</span>
            </div>

            <ul className="kanban-list" aria-label={`${col.title} cards`}>
            {col.taskIds.map((taskId, i) => (
              <li
                key={taskId}
                className={`kanban-card ${dragging?.taskId === taskId ? 'is-dragging' : ''}`}
                draggable
                tabIndex={0}
                data-card-id={taskId}
                aria-label={`${tasks[taskId].text}, ${tasks[taskId].priority} priority, card ${i + 1} of ${col.taskIds.length} in ${col.title}. Press left or right arrow to move.`}
                onDragStart={() => handleDragStart(taskId, colId)}
                onDragEnd={() => { setDragging(null); setOverColumn(null) }}
                onKeyDown={(e) => onCardKeyDown(e, taskId, colId)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <span><GripVertical size={12} className="icon-inline" aria-hidden="true" style={{ color: 'var(--text-faint)' }} />{tasks[taskId].text}</span>
                </div>
                <span className={`pill p-${tasks[taskId].priority}`} style={{ marginTop: 6, display: 'inline-flex' }}>{tasks[taskId].priority}</span>
                <div className="kanban-move">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={colId === COLUMN_ORDER[0]}
                    aria-label={`Move "${tasks[taskId].text}" left`}
                    onClick={() => moveByKeyboard(taskId, colId, -1)}
                  ><ChevronLeft size={12} aria-hidden="true" /></button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={colId === COLUMN_ORDER[COLUMN_ORDER.length - 1]}
                    aria-label={`Move "${tasks[taskId].text}" right`}
                    onClick={() => moveByKeyboard(taskId, colId, 1)}
                  ><ChevronRight size={12} aria-hidden="true" /></button>
                </div>
              </li>
            ))}
            </ul>
            {col.taskIds.length === 0 && <p className="empty-state" style={{ fontSize: '0.78rem', padding: 10 }}>Drop tasks here</p>}

            <form onSubmit={(e) => addTask(colId, e)} style={{ marginTop: 10, display: 'flex', gap: 4 }}>
              <input
                aria-label={`New card for ${col.title}`}
                value={drafts[colId]}
                onChange={(e) => setDrafts((d) => ({ ...d, [colId]: e.target.value }))}
                placeholder="Add card…"
                style={{ flex: 1, fontSize: '0.8rem', padding: '5px 8px' }}
              />
              <button className="icon-btn" type="submit" aria-label={`Add card to ${col.title}`}><Plus size={13} /></button>
            </form>
          </section>
        ))}
      </div>
    </div>
  )
}
