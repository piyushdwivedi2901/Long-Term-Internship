import type { ReactNode } from 'react'
import { CheckSquare, MessageSquare } from 'lucide-react'
import type { Task } from '../../../shared/types.ts'
import { DueChip, Label, PriorityTag } from '../../ui/bits.tsx'
import { cx } from '../../lib/cx.ts'

interface Props {
  task: Task
  today: string
  onOpen?: () => void
  handle?: ReactNode
  lifted?: boolean
}

export function TaskCard({ task, today, onOpen, handle, lifted }: Props) {
  const done = task.checklist.filter((c) => c.done).length
  return (
    <article className={cx('card', lifted && 'card--lifted', task.status === 'done' && 'card--done')}>
      {handle}
      <button type="button" className="card__open" onClick={onOpen} tabIndex={onOpen ? 0 : -1}>
        <span className="card__title">{task.title}</span>
      </button>
      {task.labels.length > 0 && (
        <div className="card__labels">
          {task.labels.slice(0, 3).map((l) => <Label key={l}>{l}</Label>)}
          {task.labels.length > 3 && <Label>+{task.labels.length - 3}</Label>}
        </div>
      )}
      <div className="card__meta">
        <PriorityTag priority={task.priority} compact />
        {task.dueDate && <DueChip due={task.dueDate} today={today} done={task.status === 'done'} />}
        <span className="card__counts">
          {task.checklist.length > 0 && (
            <span title="Checklist">
              <CheckSquare size={13} aria-hidden /> {done}/{task.checklist.length}
              <span className="sr-only"> checklist items done</span>
            </span>
          )}
          {task.commentCount > 0 && (
            <span title="Comments">
              <MessageSquare size={13} aria-hidden /> {task.commentCount}
              <span className="sr-only"> comments</span>
            </span>
          )}
        </span>
      </div>
    </article>
  )
}
