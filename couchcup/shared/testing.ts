import { createMemoryRepository } from './memoryRepository.ts'
import { createServices, type PasswordHasher, type TokenSigner } from './services.ts'

/** Fast deterministic deps for unit tests — never for production. */
export const plainHasher: PasswordHasher = {
  hash: async (p) => `plain:${p}`,
  verify: async (p, h) => h === `plain:${p}`,
}
export const plainTokens: TokenSigner = {
  sign: (u) => `t.${u.id}`,
  verify: (t) => (/^t\.\d+$/.test(t) ? Number(t.slice(2)) : null),
}

export function testServices(now = () => new Date('2026-10-09T09:00:00Z')) {
  const repo = createMemoryRepository()
  return { repo, services: createServices({ repo, passwords: plainHasher, tokens: plainTokens, now }) }
}
