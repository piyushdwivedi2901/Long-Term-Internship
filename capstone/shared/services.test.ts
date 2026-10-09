// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { AppError } from './errors.ts'
import { testServices } from './testing.ts'

async function setup() {
  const { services, repo } = testServices()
  const { user } = await services.auth.signup({ name: 'Piyush', email: 'p@example.com', password: 'password123' })
  const project = services.projects.create(user.id, { name: 'Launch', color: 'teal' })
  return { services, repo, uid: user.id, project }
}

const catchErr = (fn: () => unknown): AppError => {
  try {
    fn()
  } catch (e) {
    return e as AppError
  }
  throw new Error('expected an error')
}

describe('auth', () => {
  it('signs up, normalises the email and logs in', async () => {
    const { services } = testServices()
    const s = await services.auth.signup({ name: ' Piyush ', email: ' P@Example.COM ', password: 'password123' })
    expect(s.user).toMatchObject({ name: 'Piyush', email: 'p@example.com' })
    const again = await services.auth.login({ email: 'p@example.com', password: 'password123' })
    expect(again.user.id).toBe(s.user.id)
    expect(services.auth.authenticate(again.token)).toBe(s.user.id)
  })

  it('rejects duplicates, bad input and wrong passwords with field messages', async () => {
    const { services } = await setup()
    await expect(services.auth.signup({ name: 'X', email: 'p@example.com', password: 'password123' })).rejects.toMatchObject({ status: 409 })
    await expect(services.auth.signup({ name: '', email: 'nope', password: 'short' })).rejects.toMatchObject({
      status: 400,
      fields: { name: 'Enter your name', email: 'Enter a valid email address', password: 'Use at least 8 characters' },
    })
    await expect(services.auth.login({ email: 'p@example.com', password: 'wrong-pass' })).rejects.toMatchObject({ status: 401 })
    await expect(services.auth.login({ email: 'x@example.com', password: 'password123' })).rejects.toMatchObject({
      message: 'Email or password is incorrect',
    })
  })

  it('rejects missing or unknown tokens', () => {
    const { services } = testServices()
    expect(catchErr(() => services.auth.authenticate(undefined)).status).toBe(401)
    expect(catchErr(() => services.auth.authenticate('t.999')).status).toBe(401)
  })

  it('deletes an account and everything it owns, after confirming the password', async () => {
    const { services, repo, uid, project } = await setup()
    services.tasks.create(uid, { projectId: project.id, title: 'A' })
    await expect(services.auth.deleteAccount(uid, { password: 'nope-nope' })).rejects.toMatchObject({ status: 400 })
    await services.auth.deleteAccount(uid, { password: 'password123' })
    expect(repo.users.byId(uid)).toBeUndefined()
    expect(repo.tasks.listByOwner(uid)).toEqual([])
    expect(repo.projects.listByOwner(uid)).toEqual([])
  })
})

describe('ownership', () => {
  it("never exposes or modifies another user's data", async () => {
    const { services, uid, project } = await setup()
    const task = services.tasks.create(uid, { projectId: project.id, title: 'Secret' })
    const other = (await services.auth.signup({ name: 'B', email: 'b@example.com', password: 'password123' })).user.id

    expect(services.projects.list(other)).toEqual([])
    expect(services.tasks.list(other)).toEqual([])
    expect(catchErr(() => services.projects.get(other, project.id)).status).toBe(404)
    expect(catchErr(() => services.tasks.update(other, task.id, { title: 'x' })).status).toBe(404)
    expect(catchErr(() => services.tasks.create(other, { projectId: project.id, title: 'sneaky' })).status).toBe(404)
    expect(catchErr(() => services.comments.add(other, task.id, { body: 'hi' })).status).toBe(404)
  })
})

describe('tasks', () => {
  it('appends new tasks to their column and counts them on the project', async () => {
    const { services, uid, project } = await setup()
    const a = services.tasks.create(uid, { projectId: project.id, title: 'A' })
    const b = services.tasks.create(uid, { projectId: project.id, title: 'B' })
    expect([a.position, b.position]).toEqual([0, 1])
    expect(services.projects.get(uid, project.id).counts).toEqual({ todo: 2, in_progress: 0, review: 0, done: 0 })
  })

  it('moves a task between columns at an exact index and keeps both columns contiguous', async () => {
    const { services, uid, project } = await setup()
    const [a, b, c] = ['A', 'B', 'C'].map((title) => services.tasks.create(uid, { projectId: project.id, title }))
    const x = services.tasks.create(uid, { projectId: project.id, title: 'X', status: 'review' })

    services.tasks.move(uid, b.id, { status: 'review', index: 0 })
    const byStatus = (s: string) => services.tasks.list(uid, { status: s }).map((t) => [t.title, t.position])
    expect(byStatus('todo')).toEqual([['A', 0], ['C', 1]])
    expect(byStatus('review')).toEqual([['B', 0], ['X', 1]])

    services.tasks.move(uid, c.id, { status: 'todo', index: 0 }) // reorder within a column
    expect(byStatus('todo')).toEqual([['C', 0], ['A', 1]])
    void a
    void x
  })

  it('stamps completedAt when a task reaches Done and clears it when it leaves', async () => {
    const { services, uid, project } = await setup()
    const t = services.tasks.create(uid, { projectId: project.id, title: 'A' })
    expect(services.tasks.move(uid, t.id, { status: 'done', index: 0 }).completedAt).toBe('2026-10-09T09:00:00.000Z')
    expect(services.tasks.update(uid, t.id, { status: 'todo' }).completedAt).toBeNull()
  })

  it('filters by search text, labels, priority and due window', async () => {
    const { services, uid, project } = await setup()
    services.tasks.create(uid, { projectId: project.id, title: 'Fix login bug', labels: ['auth'], priority: 'urgent', dueDate: '2026-10-01' })
    services.tasks.create(uid, { projectId: project.id, title: 'Write docs', dueDate: '2026-10-12' })
    services.tasks.create(uid, { projectId: project.id, title: 'Someday' })
    const titles = (q: object) => services.tasks.list(uid, q).map((t) => t.title)
    expect(titles({ q: 'LOGIN' })).toEqual(['Fix login bug'])
    expect(titles({ q: 'auth' })).toEqual(['Fix login bug'])
    expect(titles({ priority: 'urgent' })).toEqual(['Fix login bug'])
    expect(titles({ due: 'overdue', today: '2026-10-09' })).toEqual(['Fix login bug'])
    expect(titles({ due: 'week', today: '2026-10-09' })).toEqual(['Write docs'])
    expect(titles({ due: 'none' })).toEqual(['Someday'])
  })

  it('validates input with readable messages', async () => {
    const { services, uid, project } = await setup()
    const err = catchErr(() => services.tasks.create(uid, { projectId: project.id, title: '  ', dueDate: '2026-13-45' }))
    expect(err.status).toBe(400)
    expect(err.fields).toMatchObject({ title: 'Give the task a title', dueDate: 'Enter a real date' })
  })

  it('deleting a project removes its tasks and comments', async () => {
    const { services, repo, uid, project } = await setup()
    const t = services.tasks.create(uid, { projectId: project.id, title: 'A' })
    services.comments.add(uid, t.id, { body: 'note' })
    services.projects.remove(uid, project.id)
    expect(repo.tasks.byId(t.id)).toBeUndefined()
    expect(repo.comments.listByTask(t.id)).toEqual([])
  })
})

describe('comments, activity and stats', () => {
  it('adds comments with the author name and counts them on the task', async () => {
    const { services, uid, project } = await setup()
    const t = services.tasks.create(uid, { projectId: project.id, title: 'A' })
    const c = services.comments.add(uid, t.id, { body: '  Looks good  ' })
    expect(c).toMatchObject({ body: 'Looks good', authorName: 'Piyush' })
    expect(services.tasks.get(uid, t.id).commentCount).toBe(1)
  })

  it('records a readable activity feed, newest first', async () => {
    const { services, uid, project } = await setup()
    const t = services.tasks.create(uid, { projectId: project.id, title: 'Ship it' })
    services.tasks.move(uid, t.id, { status: 'done', index: 0 })
    expect(services.activity.list(uid).map((a) => a.summary)).toEqual([
      'Completed “Ship it”',
      'Added “Ship it” to Launch',
      'Created project “Launch”',
    ])
  })

  it('computes dashboard stats', async () => {
    const { services, uid } = await setup()
    services.seedSample(uid, '2026-10-09')
    const s = services.stats(uid, '2026-10-09')
    expect(s.total).toBe(13)
    expect(s.counts.done).toBe(5)
    expect(s.overdue).toBe(1) // "Fix mobile nav overlap"
    expect(s.completionRate).toBeCloseTo(5 / 13)
    expect(s.completedByDay).toHaveLength(14)
    expect(s.completedByDay.reduce((n, d) => n + d.count, 0)).toBe(5)
    expect(s.projects.map((p) => p.name)).toEqual(['Launch', 'Website relaunch', 'Internship report', 'Home'])
  })

  it('rolls back a failed transaction completely', async () => {
    const { repo } = await setup()
    const before = repo.snapshot()
    expect(() =>
      repo.transaction(() => {
        repo.projects.insert({ ownerId: 1, name: 'temp', description: '', color: 'blue', createdAt: '', updatedAt: '' })
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(repo.snapshot()).toEqual(before)
  })
})
