// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { STATUSES } from '../../shared/schemas.ts'
import { testServices } from '../../shared/testing.ts'
import { applyMove } from './hooks.ts'

/**
 * The board updates optimistically with applyMove before the server answers.
 * Fuzz it against the real service: after any sequence of moves, the
 * optimistic state must equal what the server computes.
 */
describe('applyMove mirrors the server move rule', () => {
  it('agrees with services.tasks.move over 300 random moves', async () => {
    const { services } = testServices()
    const uid = (await services.auth.signup({ name: 'P', email: 'p@example.com', password: 'password123' })).user.id
    const project = services.projects.create(uid, { name: 'P' })
    for (let i = 0; i < 9; i++) services.tasks.create(uid, { projectId: project.id, title: `T${i}`, status: STATUSES[i % 4] })

    let seed = 42
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n)
    let optimistic = services.tasks.list(uid)
    const shape = (list: typeof optimistic) =>
      list.map((t) => `${t.id}:${t.status}:${t.position}`).sort()

    for (let i = 0; i < 300; i++) {
      const task = optimistic[rand(optimistic.length)]
      const input = { status: STATUSES[rand(4)], index: rand(6) }
      optimistic = applyMove(optimistic, task.id, input)
      services.tasks.move(uid, task.id, input)
      expect(shape(optimistic)).toEqual(shape(services.tasks.list(uid)))
    }
  })
})
