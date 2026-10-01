import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'

const KEY_LEN = 64

/** scrypt with a per-password random salt. Stored as `salt:hash` (hex). */
export function hashPassword(password) {
  const salt = randomBytes(16)
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, (err, key) =>
      err ? reject(err) : resolve(`${salt.toString('hex')}:${key.toString('hex')}`),
    ),
  )
}

export function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':')
  const expected = Buffer.from(hashHex, 'hex')
  return new Promise((resolve, reject) =>
    scrypt(password, Buffer.from(saltHex, 'hex'), KEY_LEN, (err, key) =>
      err ? reject(err) : resolve(timingSafeEqual(key, expected)),
    ),
  )
}

export function signToken(user, secret) {
  return jwt.sign({ sub: String(user.id), email: user.email }, secret, { expiresIn: '7d' })
}

/** Returns the decoded payload, or null for a missing / invalid / expired token. */
export function readToken(header, secret) {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    return jwt.verify(token, secret)
  } catch {
    return null
  }
}
