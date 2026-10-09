import type { ActivityRow, CommentRow, ProjectRow, Repository, TaskRow, UserRow } from './repository.ts'

export interface Snapshot {
  version: 1
  seq: number
  users: UserRow[]
  projects: ProjectRow[]
  tasks: TaskRow[]
  comments: CommentRow[]
  activity: ActivityRow[]
}

export const emptySnapshot = (): Snapshot => ({
  version: 1,
  seq: 0,
  users: [],
  projects: [],
  tasks: [],
  comments: [],
  activity: [],
})

const clone = <T>(v: T): T => structuredClone(v)

/**
 * In-memory Repository. `onChange` receives a snapshot after every committed
 * write so the browser demo can persist it (localStorage); tests just use it
 * as a fast, isolated store. Rows are cloned on the way in and out so callers
 * can never mutate stored state by accident — the same guarantee a database
 * gives.
 */
export function createMemoryRepository(
  initial: Snapshot = emptySnapshot(),
  onChange?: (snapshot: Snapshot) => void,
): Repository & { snapshot(): Snapshot } {
  const db = clone(initial)
  let depth = 0
  let dirty = false

  const changed = () => {
    if (depth > 0) {
      dirty = true
      return
    }
    onChange?.(clone(db))
  }
  const nextId = () => ++db.seq

  function table<Row extends { id: number }>(rows: () => Row[], set: (rows: Row[]) => void) {
    return {
      insert(row: Omit<Row, 'id'>): Row {
        const full = { ...clone(row), id: nextId() } as Row
        rows().push(full)
        changed()
        return clone(full)
      },
      byId(id: number): Row | undefined {
        const row = rows().find((r) => r.id === id)
        return row && clone(row)
      },
      update(id: number, patch: Partial<Omit<Row, 'id'>>) {
        const row = rows().find((r) => r.id === id)
        if (row) {
          Object.assign(row, clone(patch))
          changed()
        }
      },
      delete(id: number) {
        set(rows().filter((r) => r.id !== id))
        changed()
      },
      where(pred: (r: Row) => boolean): Row[] {
        return rows().filter(pred).map(clone)
      },
    }
  }

  const users = table(() => db.users, (r) => (db.users = r))
  const projects = table(() => db.projects, (r) => (db.projects = r))
  const tasks = table(() => db.tasks, (r) => (db.tasks = r))
  const comments = table(() => db.comments, (r) => (db.comments = r))
  const activity = table(() => db.activity, (r) => (db.activity = r))

  return {
    users: {
      insert: users.insert,
      byId: users.byId,
      byEmail: (email) => users.where((u) => u.email === email)[0],
      update: users.update,
      delete: users.delete,
    },
    projects: {
      insert: projects.insert,
      byId: projects.byId,
      listByOwner: (ownerId) => projects.where((p) => p.ownerId === ownerId).sort((a, b) => a.id - b.id),
      update: projects.update,
      delete: projects.delete,
    },
    tasks: {
      insert: tasks.insert,
      byId: tasks.byId,
      listByOwner: (ownerId) => tasks.where((t) => t.ownerId === ownerId),
      update: tasks.update,
      delete: tasks.delete,
    },
    comments: {
      insert: comments.insert,
      byId: comments.byId,
      listByTask: (taskId) => comments.where((c) => c.taskId === taskId).sort((a, b) => a.id - b.id),
      countByTasks: (ids) => {
        const wanted = new Set(ids)
        const counts = new Map<number, number>()
        for (const c of db.comments) if (wanted.has(c.taskId)) counts.set(c.taskId, (counts.get(c.taskId) ?? 0) + 1)
        return counts
      },
      delete: comments.delete,
    },
    activity: {
      insert: activity.insert,
      listByOwner: (ownerId, limit) =>
        activity
          .where((a) => a.ownerId === ownerId)
          .sort((a, b) => b.id - a.id)
          .slice(0, limit),
      deleteByOwner: (ownerId) => {
        db.activity = db.activity.filter((a) => a.ownerId !== ownerId)
        changed()
      },
    },
    transaction<T>(fn: () => T): T {
      const before = clone(db)
      depth++
      try {
        const result = fn()
        depth--
        if (depth === 0 && dirty) {
          dirty = false
          onChange?.(clone(db))
        }
        return result
      } catch (err) {
        depth--
        // roll back every table to the pre-transaction state
        Object.assign(db, before)
        dirty = false
        throw err
      }
    },
    snapshot: () => clone(db),
  }
}
