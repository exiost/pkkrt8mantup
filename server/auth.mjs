import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'

export function hashPassword(pw) {
  const salt = randomBytes(16)
  const key = scryptSync(pw, salt, 64)
  return `s1$${salt.toString('hex')}$${key.toString('hex')}`
}

export function verifyPassword(pw, stored) {
  const [v, salt, key] = String(stored).split('$')
  if (v !== 's1' || !salt || !key) return false
  const k2 = scryptSync(pw, Buffer.from(salt, 'hex'), 64)
  const k1 = Buffer.from(key, 'hex')
  return k1.length === k2.length && timingSafeEqual(k1, k2)
}

const b64 = (b) => Buffer.from(b).toString('base64url')

export function signToken(payload, secret, ttlSec = 30 * 24 * 3600) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec }))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token, secret) {
  if (typeof token !== 'string') return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const good = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig), c = Buffer.from(good)
  if (a.length !== c.length || !timingSafeEqual(a, c)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    return p.exp > Math.floor(Date.now() / 1000) ? p : null
  } catch { return null }
}
