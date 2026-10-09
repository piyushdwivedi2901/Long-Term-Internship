import { AppError, notFound, parse, unauthorized } from './errors.ts'
import type { ActivityRow, ProjectRow, Repository, TaskRow, UserRow } from './repository.ts'
import {
  STATUSES,
  STATUS_LABELS,
  commentSchema,
  deleteAccountSchema,
  loginSchema,
  moveSchema,
  profileSchema,
  projectPatchSchema,
  projectSchema,
  signupSchema,
  taskPatchSchema,
  taskQuerySchema,
  taskSchema,
} from './schemas.ts'
import type { Activity, ActivityKind, Comment, Project, Session, Stats, Status, StatusCounts, Task, User } from './types.ts'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}

export interface TokenSigner {
  sign(user: { id: number; email: string }): string
  /** Returns the user id for a valid token, or null. */
  verify(token: string): number | null
}

export interface ServiceDeps {
  repo: Repository
  passwords: PasswordHasher
  tokens: TokenSigner
  now?: () => Date
}

// ---------- date helpers (calendar days as YYYY-MM-DD) ----------
export const isoDay = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return isoDay(d)
}

const emptyCounts = (): StatusCounts => ({ todo: 0, in_progress: 0, review: 0, done: 0 })

const toUser = (u: UserRow): User => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })

/**
 * Every business rule in Flowboard. Each method takes the acting user's id
 * first and only ever touches that user's rows — ownership is enforced here,
 * once, rather than in each route.
 */
export function createServices({ repo, passwords, tokens, now = () => new Date() }: ServiceDeps) {
  const stamp = () => now().toISOString()

  const log = (ownerId: number, kind: ActivityKind, summary: string, projectId: number | null, taskId: number | null) =>
    repo.activity.insert({ ownerId, kind, summary, projectId, taskId, createdAt: stamp() })

  const ownProject = (userId: number, id: number): ProjectRow => {
    const p = repo.projects.byId(id)
    if (!p || p.ownerId !== userId) throw notFound('Project')
    return p
  }
  const ownTask = (userId: number, id: number): TaskRow => {
    const t = repo.tasks.byId(id)
    if (!t || t.ownerId !== userId) throw notFound('Task')
    return t
  }

  const toTask = (t: TaskRow, commentCount = 0): Task => {
    const { ownerId: _owner, ...rest } = t
    void _owner
    return { ...rest, commentCount }
  }
  const withCounts = (rows: TaskRow[]): Task[] => {
    const counts = repo.comments.countByTasks(rows.map((r) => r.id))
    return rows.map((r) => toTask(r, counts.get(r.id) ?? 0))
  }

  const toProject = (p: ProjectRow, tasks: TaskRow[]): Project => {
    const counts = emptyCounts()
    for (const t of tasks) if (t.projectId === p.id) counts[t.status]++
    const { ownerId: _owner, ...rest } = p
    void _owner
    return { ...rest, counts }
  }

  /** Re-numbers a column 0..n so positions stay small and contiguous. */
  const renumber = (ordered: TaskRow[]) =>
    ordered.forEach((t, i) => {
      if (t.position !== i) repo.tasks.update(t.id, { position: i })
    })

  const column = (userId: number, projectId: number, status: Status, excludeId?: number) =>
    repo.tasks
      .listByOwner(userId)
      .filter((t) => t.projectId === projectId && t.status === status && t.id !== excludeId)
      .sort((a, b) => a.position - b.position || a.id - b.id)

  const auth = {
    async signup(input: unknown): Promise<Session> {
      const data = parse(signupSchema, input)
      if (repo.users.byEmail(data.email)) {
        throw new AppError(409, 'email_taken', 'An account with this email already exists', {
          email: 'An account with this email already exists',
        })
      }
      const passwordHash = await passwords.hash(data.password)
      const row = repo.users.insert({ name: data.name, email: data.email, passwordHash, createdAt: stamp() })
      return { token: tokens.sign(row), user: toUser(row) }
    },

    async login(input: unknown): Promise<Session> {
      const data = parse(loginSchema, input)
      const row = repo.users.byEmail(data.email)
      // Same message whether the email or the password is wrong.
      const ok = row ? await passwords.verify(data.password, row.passwordHash) : false
      if (!row || !ok) throw new AppError(401, 'bad_credentials', 'Email or password is incorrect')
      return { token: tokens.sign(row), user: toUser(row) }
    },

    /** Resolves a bearer token to a user id, or throws 401. */
    authenticate(token: string | undefined | null): number {
      const id = token ? tokens.verify(token) : null
      if (id === null || !repo.users.byId(id)) throw unauthorized('Your session has ended. Sign in again.')
      return id
    },

    me(userId: number): User {
      const row = repo.users.byId(userId)
      if (!row) throw unauthorized()
      return toUser(row)
    },

    updateProfile(userId: number, input: unknown): User {
      const data = parse(profileSchema, input)
      repo.users.update(userId, { name: data.name })
      return auth.me(userId)
    },

    async deleteAccount(userId: number, input: unknown): Promise<void> {
      const { password } = parse(deleteAccountSchema, input)
      const row = repo.users.byId(userId)
      if (!row) throw unauthorized()
      if (!(await passwords.verify(password, row.passwordHash))) {
        throw new AppError(400, 'bad_password', 'That password is incorrect', { password: 'That password is incorrect' })
      }
      repo.transaction(() => {
        for (const t of repo.tasks.listByOwner(userId)) {
          for (const c of repo.comments.listByTask(t.id)) repo.comments.delete(c.id)
          repo.tasks.delete(t.id)
        }
        for (const p of repo.projects.listByOwner(userId)) repo.projects.delete(p.id)
        repo.activity.deleteByOwner(userId)
        repo.users.delete(userId)
      })
    },
  }

  const projects = {
    list(userId: number): Project[] {
      const tasks = repo.tasks.listByOwner(userId)
      return repo.projects.listByOwner(userId).map((p) => toProject(p, tasks))
    },

    get(userId: number, id: number): Project {
      return toProject(ownProject(userId, id), repo.tasks.listByOwner(userId))
    },

    create(userId: number, input: unknown): Project {
      const data = parse(projectSchema, input)
      const ts = stamp()
      return repo.transaction(() => {
        const row = repo.projects.insert({ ownerId: userId, ...data, createdAt: ts, updatedAt: ts })
        log(userId, 'project.created', `Created project “${row.name}”`, row.id, null)
        return toProject(row, [])
      })
    },

    update(userId: number, id: number, input: unknown): Project {
      const data = parse(projectPatchSchema, input)
      const existing = ownProject(userId, id)
      repo.transaction(() => {
        repo.projects.update(id, { ...data, updatedAt: stamp() })
        log(userId, 'project.updated', `Updated project “${data.name ?? existing.name}”`, id, null)
      })
      return projects.get(userId, id)
    },

    remove(userId: number, id: number): void {
      const p = ownProject(userId, id)
      repo.transaction(() => {
        for (const t of repo.tasks.listByOwner(userId).filter((t) => t.projectId === id)) {
          for (const c of repo.comments.listByTask(t.id)) repo.comments.delete(c.id)
          repo.tasks.delete(t.id)
        }
        repo.projects.delete(id)
        log(userId, 'project.deleted', `Deleted project “${p.name}”`, null, null)
      })
    },
  }

  const tasks = {
    list(userId: number, query: unknown = {}): Task[] {
      const q = parse(taskQuerySchema, query)
      const today = q.today ?? isoDay(now())
      const weekEnd = addDays(today, 6)
      const needle = q.q?.toLowerCase()
      const rows = repo.tasks
        .listByOwner(userId)
        .filter((t) => (q.projectId ? t.projectId === q.projectId : true))
        .filter((t) => (q.status ? t.status === q.status : true))
        .filter((t) => (q.priority ? t.priority === q.priority : true))
        .filter((t) =>
          needle
            ? t.title.toLowerCase().includes(needle) ||
              t.description.toLowerCase().includes(needle) ||
              t.labels.some((l) => l.toLowerCase().includes(needle))
            : true,
        )
        .filter((t) => {
          if (q.due === 'none') return t.dueDate === null
          if (q.due === 'overdue') return t.dueDate !== null && t.dueDate < today && t.status !== 'done'
          if (q.due === 'week') return t.dueDate !== null && t.dueDate >= today && t.dueDate <= weekEnd
          return true
        })
        .sort(
          (a, b) =>
            STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.position - b.position || a.id - b.id,
        )
      return withCounts(rows)
    },

    get(userId: number, id: number): Task {
      return withCounts([ownTask(userId, id)])[0]
    },

    create(userId: number, input: unknown): Task {
      const data = parse(taskSchema, input)
      const project = ownProject(userId, data.projectId)
      const ts = stamp()
      return repo.transaction(() => {
        const position = column(userId, project.id, data.status).length
        const row = repo.tasks.insert({
          ownerId: userId,
          ...data,
          position,
          createdAt: ts,
          updatedAt: ts,
          completedAt: data.status === 'done' ? ts : null,
        })
        log(userId, 'task.created', `Added “${row.title}” to ${project.name}`, project.id, row.id)
        return toTask(row)
      })
    },

    update(userId: number, id: number, input: unknown): Task {
      const data = parse(taskPatchSchema, input)
      const existing = ownTask(userId, id)
      repo.transaction(() => {
        const patch: Partial<TaskRow> = { ...data, updatedAt: stamp() }
        if (data.status && data.status !== existing.status) {
          // A status change via edit appends the task to its new column.
          patch.position = column(userId, existing.projectId, data.status, id).length
          patch.completedAt = data.status === 'done' ? stamp() : null
        }
        repo.tasks.update(id, patch)
        if (data.status && data.status !== existing.status) {
          renumber(column(userId, existing.projectId, existing.status, id))
          logMove(userId, existing, data.status)
        } else {
          log(userId, 'task.updated', `Edited “${data.title ?? existing.title}”`, existing.projectId, id)
        }
      })
      return tasks.get(userId, id)
    },

    /** Drag-and-drop: put the task at `index` within `status`'s column. */
    move(userId: number, id: number, input: unknown): Task {
      const { status, index } = parse(moveSchema, input)
      const existing = ownTask(userId, id)
      repo.transaction(() => {
        const target = column(userId, existing.projectId, status, id)
        const at = Math.min(index, target.length)
        const moved = { ...existing, status }
        target.splice(at, 0, moved)
        const statusChanged = status !== existing.status
        repo.tasks.update(id, {
          status,
          position: at,
          updatedAt: stamp(),
          ...(statusChanged ? { completedAt: status === 'done' ? stamp() : null } : {}),
        })
        renumber(target.map((t) => (t.id === id ? { ...t, position: at } : t)))
        if (statusChanged) {
          renumber(column(userId, existing.projectId, existing.status, id))
          logMove(userId, existing, status)
        }
      })
      return tasks.get(userId, id)
    },

    remove(userId: number, id: number): void {
      const t = ownTask(userId, id)
      repo.transaction(() => {
        for (const c of repo.comments.listByTask(id)) repo.comments.delete(c.id)
        repo.tasks.delete(id)
        renumber(column(userId, t.projectId, t.status))
        log(userId, 'task.deleted', `Deleted “${t.title}”`, t.projectId, null)
      })
    },
  }

  function logMove(userId: number, t: TaskRow, to: Status) {
    if (to === 'done') log(userId, 'task.completed', `Completed “${t.title}”`, t.projectId, t.id)
    else log(userId, 'task.moved', `Moved “${t.title}” to ${STATUS_LABELS[to]}`, t.projectId, t.id)
  }

  const comments = {
    list(userId: number, taskId: number): Comment[] {
      ownTask(userId, taskId)
      return repo.comments.listByTask(taskId).map((c) => ({
        ...c,
        authorName: repo.users.byId(c.authorId)?.name ?? 'Deleted user',
      }))
    },

    add(userId: number, taskId: number, input: unknown): Comment {
      const { body } = parse(commentSchema, input)
      const t = ownTask(userId, taskId)
      return repo.transaction(() => {
        const row = repo.comments.insert({ taskId, authorId: userId, body, createdAt: stamp() })
        log(userId, 'comment.added', `Commented on “${t.title}”`, t.projectId, t.id)
        return { ...row, authorName: auth.me(userId).name }
      })
    },

    remove(userId: number, commentId: number): void {
      const c = repo.comments.byId(commentId)
      if (!c || c.authorId !== userId) throw notFound('Comment')
      repo.comments.delete(commentId)
    },
  }

  const activity = {
    list(userId: number, limit = 20): Activity[] {
      return repo.activity
        .listByOwner(userId, Math.min(Math.max(limit, 1), 100))
        .map(({ ownerId: _o, ...a }: ActivityRow) => (void _o, a))
    },
  }

  function stats(userId: number, todayInput?: string): Stats {
    const today = todayInput && /^\d{4}-\d{2}-\d{2}$/.test(todayInput) ? todayInput : isoDay(now())
    const weekEnd = addDays(today, 6)
    const all = repo.tasks.listByOwner(userId)
    const counts = emptyCounts()
    let overdue = 0
    let dueThisWeek = 0
    for (const t of all) {
      counts[t.status]++
      if (t.dueDate && t.status !== 'done') {
        if (t.dueDate < today) overdue++
        else if (t.dueDate <= weekEnd) dueThisWeek++
      }
    }
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
    const completedByDay = days.map((date) => ({
      date,
      count: all.filter((t) => t.completedAt && t.status === 'done' && t.completedAt.slice(0, 10) === date).length,
    }))
    return {
      total: all.length,
      counts,
      overdue,
      dueThisWeek,
      completionRate: all.length ? counts.done / all.length : 0,
      completedByDay,
      projects: projects.list(userId).map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        counts: p.counts,
        total: Object.values(p.counts).reduce((a, b) => a + b, 0),
      })),
    }
  }

  /** Creates a realistic sample workspace so a new account isn't empty. */
  function seedSample(userId: number, todayInput?: string): Project[] {
    const today = todayInput ?? isoDay(now())
    const d = (n: number) => addDays(today, n)
    const plan: {
      project: { name: string; description: string; color: Project['color'] }
      tasks: { title: string; status: Status; priority: Task['priority']; due: number | null; labels: string[]; done?: number; checklist?: string[] }[]
    }[] = [
      {
        project: { name: 'Website relaunch', description: 'New marketing site, launching at the end of the month.', color: 'blue' },
        tasks: [
          { title: 'Write homepage copy', status: 'in_progress', priority: 'high', due: 2, labels: ['content'], checklist: ['Hero headline', 'Feature section', 'Pricing blurb'] },
          { title: 'Design pricing page', status: 'review', priority: 'medium', due: 4, labels: ['design'] },
          { title: 'Set up analytics', status: 'todo', priority: 'low', due: 9, labels: ['dev'] },
          { title: 'Fix mobile nav overlap', status: 'todo', priority: 'urgent', due: -1, labels: ['bug', 'dev'] },
          { title: 'Choose a hosting provider', status: 'done', priority: 'medium', due: -6, labels: ['dev'], done: -5 },
          { title: 'Collect customer quotes', status: 'done', priority: 'low', due: -3, labels: ['content'], done: -2 },
        ],
      },
      {
        project: { name: 'Internship report', description: 'Weekly progress write-ups and the final presentation.', color: 'teal' },
        tasks: [
          { title: 'Draft week 7 summary', status: 'in_progress', priority: 'medium', due: 1, labels: ['writing'] },
          { title: 'Prepare demo for mentor review', status: 'todo', priority: 'high', due: 5, labels: ['presentation'], checklist: ['Record walkthrough', 'List open questions'] },
          { title: 'Benchmark bundle size', status: 'done', priority: 'medium', due: -2, labels: ['performance'], done: -1 },
          { title: 'Accessibility audit notes', status: 'done', priority: 'medium', due: -8, labels: ['a11y'], done: -7 },
        ],
      },
      {
        project: { name: 'Home', description: 'Errands and life admin.', color: 'amber' },
        tasks: [
          { title: 'Renew passport', status: 'todo', priority: 'high', due: 12, labels: ['admin'] },
          { title: 'Plan weekend trip', status: 'todo', priority: 'low', due: null, labels: [] },
          { title: 'Pay electricity bill', status: 'done', priority: 'medium', due: -4, labels: ['bills'], done: -4 },
        ],
      },
    ]

    return repo.transaction(() =>
      plan.map(({ project, tasks: list }) => {
        const p = projects.create(userId, project)
        for (const t of list) {
          const created = tasks.create(userId, {
            projectId: p.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.due === null ? null : d(t.due),
            labels: t.labels,
            checklist: (t.checklist ?? []).map((text, i) => ({ id: `c${i}`, text, done: i === 0 })),
          })
          if (t.done !== undefined) repo.tasks.update(created.id, { completedAt: `${d(t.done)}T15:00:00.000Z` })
        }
        return projects.get(userId, p.id)
      }),
    )
  }

  return { auth, projects, tasks, comments, activity, stats, seedSample }
}

export type Services = ReturnType<typeof createServices>
