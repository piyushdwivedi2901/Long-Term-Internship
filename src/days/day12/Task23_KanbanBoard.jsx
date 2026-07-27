import { useState } from 'react'

/**
 * Day 12 — Task 23: Kanban / Task Board
 * Goal: Drag-and-drop tasks between columns (To Do / In Progress / Done).
 * Uses the native HTML5 drag-and-drop API — no external DnD library needed.
 */
const initialColumns = {
  todo: { title: 'To Do', taskIds: [1, 2] },
  inProgress: { title: 'In Progress', taskIds: [3] },
  done: { title: 'Done', taskIds: [4] },
}

const initialTasks = {
  1: { id: 1, text: 'Design database schema' },
  2: { id: 2, text: 'Write API documentation' },
  3: { id: 3, text: 'Build login page' },
  4: { id: 4, text: 'Set up CI pipeline' },
}

export default function Task23_KanbanBoard() {
  const [columns, setColumns] = useState(initialColumns)
  const [tasks] = useState(initialTasks)
  const [dragging, setDragging] = useState(null) // { taskId, fromColumn }

  const handleDragStart = (taskId, fromColumn) => {
    setDragging({ taskId, fromColumn })
  }

  const handleDrop = (toColumn) => {
    if (!dragging) return
    const { taskId, fromColumn } = dragging
    if (fromColumn === toColumn) {
      setDragging(null)
      return
    }
    setColumns((prev) => ({
      ...prev,
      [fromColumn]: {
        ...prev[fromColumn],
        taskIds: prev[fromColumn].taskIds.filter((id) => id !== taskId),
      },
      [toColumn]: {
        ...prev[toColumn],
        taskIds: [...prev[toColumn].taskIds, taskId],
      },
    }))
    setDragging(null)
  }

  return (
    <div className="task-section">
      <h2>Task 23: Kanban / Task Board</h2>
      <div className="kanban-board">
        {Object.entries(columns).map(([colId, col]) => (
          <div
            key={colId}
            className="kanban-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(colId)}
          >
            <h4>{col.title}</h4>
            {col.taskIds.map((taskId) => (
              <div
                key={taskId}
                className="kanban-card"
                draggable
                onDragStart={() => handleDragStart(taskId, colId)}
              >
                {tasks[taskId].text}
              </div>
            ))}
            {col.taskIds.length === 0 && <p className="empty-state">Drop tasks here</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
