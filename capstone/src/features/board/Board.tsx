import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import { STATUSES, STATUS_LABELS } from '../../../shared/schemas.ts'
import type { Status, Task } from '../../../shared/types.ts'
import { TaskCard } from './TaskCard.tsx'

type Columns = Record<Status, number[]>

const colId = (s: Status) => `col:${s}`
const isCol = (id: UniqueIdentifier) => String(id).startsWith('col:')

function toColumns(tasks: Task[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], review: [], done: [] }
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) cols[t.status].push(t.id)
  return cols
}

interface BoardProps {
  tasks: Task[]
  today: string
  /** Disable reordering while a filter hides some cards (indexes would lie). */
  reorderDisabled?: boolean
  onMove(id: number, status: Status, index: number): void
  onOpen(id: number): void
  onAdd(status: Status): void
}

/**
 * Kanban board with dnd-kit: mouse, touch and keyboard dragging (focus a grip,
 * Space to lift, arrows to move, Space to drop, Escape to cancel), with every
 * step announced to screen readers.
 */
export function Board({ tasks, today, reorderDisabled, onMove, onOpen, onAdd }: BoardProps) {
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const columns = useMemo(() => toColumns(tasks), [tasks])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [overStatus, setOverStatus] = useState<Status | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findColumn = (id: UniqueIdentifier): Status | undefined => {
    if (isCol(id)) return String(id).slice(4) as Status
    return STATUSES.find((s) => columns[s].includes(Number(id)))
  }

  /**
   * Where the active card would land if dropped on `overId`. Cards don't jump
   * between columns mid-drag (that makes collision detection oscillate);
   * the target column is highlighted instead and the move happens on drop.
   */
  const destination = (activeId: UniqueIdentifier, overId: UniqueIdentifier): { status: Status; index: number } | null => {
    const status = findColumn(overId)
    const from = findColumn(activeId)
    if (!status || !from) return null
    const id = Number(activeId)
    const list = columns[status]
    if (status === from) {
      const to = isCol(overId) ? list.length - 1 : list.indexOf(Number(overId))
      return { status, index: arrayMove(list, list.indexOf(id), to).indexOf(id) }
    }
    return { status, index: isCol(overId) ? list.length : Math.max(list.indexOf(Number(overId)), 0) }
  }

  const title = (id: UniqueIdentifier) => byId.get(Number(id))?.title ?? 'task'
  const where = (d: { status: Status; index: number } | null, moving = true) => {
    if (!d) return 'no column'
    const total = columns[d.status].length + (moving && d.status !== byId.get(activeId ?? -1)?.status ? 1 : 0)
    return `${STATUS_LABELS[d.status]}, position ${d.index + 1} of ${Math.max(total, 1)}`
  }
  const current = (id: UniqueIdentifier) => {
    const s = findColumn(id)!
    return { status: s, index: columns[s].indexOf(Number(id)) }
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up “${title(active.id)}” from ${where(current(active.id), false)}.`,
    onDragOver: ({ active, over }) => {
      if (over?.id === active.id) return undefined // still on its own spot: keep the "Picked up" message
      return over ? `“${title(active.id)}” is over ${where(destination(active.id, over.id))}.` : `“${title(active.id)}” is not over a column.`
    },
    onDragEnd: ({ active, over }) => (over ? `Dropped “${title(active.id)}” in ${where(destination(active.id, over.id))}.` : `Dropped “${title(active.id)}” outside the board. It stayed where it was.`),
    onDragCancel: ({ active }) => `Cancelled. “${title(active.id)}” stayed in ${where(current(active.id), false)}.`,
  }

  const reset = () => {
    setActiveId(null)
    setOverStatus(null)
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(Number(active.id))
    setOverStatus(findColumn(active.id) ?? null)
  }
  const onDragOver = ({ over }: DragOverEvent) => {
    setOverStatus(over ? (findColumn(over.id) ?? null) : null)
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    reset()
    if (!over) return
    const d = destination(active.id, over.id)
    const now = current(active.id)
    if (d && (d.status !== now.status || d.index !== now.index)) onMove(Number(active.id), d.status, d.index)
  }

  const active = activeId ? byId.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To move a task, press Space to pick it up. Use the arrow keys to move it within or between columns, Space to drop it, or Escape to cancel.',
        },
      }}
    >
      <div className="board">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            ids={columns[status]}
            byId={byId}
            today={today}
            disabled={reorderDisabled}
            highlighted={activeId !== null && overStatus === status && byId.get(activeId)?.status !== status}
            onOpen={onOpen}
            onAdd={() => onAdd(status)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
        {active ? <TaskCard task={active} today={today} lifted /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({
  status,
  ids,
  byId,
  today,
  disabled,
  highlighted,
  onOpen,
  onAdd,
}: {
  status: Status
  ids: number[]
  byId: Map<number, Task>
  today: string
  disabled?: boolean
  highlighted?: boolean
  onOpen(id: number): void
  onAdd(): void
}) {
  const { setNodeRef } = useDroppable({ id: colId(status), disabled })
  const headingId = `col-${status}-h`
  return (
    <section className={`column status--${status}${highlighted ? ' is-over' : ''}`} aria-labelledby={headingId}>
      <header className="column__header">
        <span className="column__stop" aria-hidden />
        <h2 id={headingId} className="column__title">{STATUS_LABELS[status]}</h2>
        <span className="column__count" aria-label={`${ids.length} tasks`}>{ids.length}</span>
        <button type="button" className="icon-button icon-button--sm" aria-label={`Add task to ${STATUS_LABELS[status]}`} onClick={onAdd}>
          <Plus size={16} aria-hidden />
        </button>
      </header>
      <SortableContext id={colId(status)} items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul ref={setNodeRef} className="column__list">
          {ids.map((id) => {
            const task = byId.get(id)
            return task ? <SortableCard key={id} task={task} today={today} disabled={disabled} onOpen={onOpen} /> : null
          })}
          {ids.length === 0 && <li className="column__empty">{disabled ? 'No matching tasks' : 'Drop a task here'}</li>}
        </ul>
      </SortableContext>
    </section>
  )
}

function SortableCard({ task, today, disabled, onOpen }: { task: Task; today: string; disabled?: boolean; onOpen(id: number): void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? 'is-placeholder' : undefined}>
      <TaskCard
        task={task}
        today={today}
        onOpen={() => onOpen(task.id)}
        handle={
          disabled ? null : (
            <button
              type="button"
              ref={setActivatorNodeRef}
              className="card__handle"
              aria-label={`Move “${task.title}”`}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={16} aria-hidden />
            </button>
          )
        }
      />
    </li>
  )
}
