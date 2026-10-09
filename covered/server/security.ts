import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { PasswordHasher, TokenSigner } from '../shared/services.ts'

const KEY_LEN = 64

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))),
  )

/** scrypt with a random 16-byte salt per password, stored as "scrypt$salt$hash". */
export const scryptHasher: PasswordHasher = {
  async hash(password) {
    const salt = randomBytes(16)
    return `scrypt$${salt.toString('hex')}$${(await derive(password, salt)).toString('hex')}`
  },
  async verify(password, stored) {
    const [scheme, saltHex, hashHex] = stored.split('$')
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
    const expected = Buffer.from(hashHex, 'hex')
    const actual = await derive(password, Buffer.from(saltHex, 'hex'))
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  },
}

export function jwtSigner(secret: string, expiresIn: jwt.SignOptions['expiresIn'] = '7d'): TokenSigner {
  return {
    sign: (user) => jwt.sign({ sub: String(user.id), email: user.email }, secret, { expiresIn, algorithm: 'HS256' }),
    verify(token) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
        const id = typeof payload === 'object' ? Number(payload.sub) : NaN
        return Number.isInteger(id) ? id : null
      } catch {
        return null
      }
    },
  }
}
