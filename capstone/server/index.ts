import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createServices } from '../shared/services.ts'
import { createApp } from './app.ts'
import { createSqliteRepository } from './sqliteRepository.ts'
import { jwtSigner, scryptHasher } from './security.ts'

const production = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 4000)

let secret = process.env.JWT_SECRET
if (!secret) {
  if (production) {
    console.error('JWT_SECRET must be set in production')
    process.exit(1)
  }
  secret = randomBytes(32).toString('hex')
  console.warn('JWT_SECRET not set — using a random secret; sessions end when the server restarts.')
}

const repo = createSqliteRepository(process.env.DB_FILE ?? 'flowboard.sqlite')
const services = createServices({ repo, passwords: scryptHasher, tokens: jwtSigner(secret) })

const app = createApp(services, {
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5180').split(',').map((s) => s.trim()),
  // `npm start` serves the built frontend from the same origin.
  staticDir: process.env.STATIC_DIR ?? (production ? fileURLToPath(new URL('../dist-server', import.meta.url)) : undefined),
})

const server = app.listen(port, () => console.log(`Flowboard API on http://localhost:${port}`))

const shutdown = () => server.close(() => (repo.close(), process.exit(0)))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
