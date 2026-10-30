import express from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb, createStore, COLLECTIONS } from './db.mjs'
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROLES = ['admin', 'editor', 'viewer']

export function createApp({ dbFile, distDir, corsOrigin = '*' } = {}) {
  const db = openDb(dbFile ?? join(process.env.DATA_DIR ?? resolve(here, '../data'), 'siwarga.db'))
  const store = createStore(db)
  let secret = store.meta('secret')
  if (!secret) { secret = randomBytes(32).toString('hex'); store.setMeta('secret', secret) }

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '50mb' }))

  // --- CORS (mode bearer-token, tanpa cookie) & header keamanan dasar ---
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin)
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  // --- pembatas percobaan login ---
  const fails = new Map()
  const limited = (key) => { const f = fails.get(key); return f && f.n >= 8 && Date.now() - f.t < 15 * 60 * 1000 }
  const fail = (key) => { const f = fails.get(key); fails.set(key, { n: (f && Date.now() - f.t < 15 * 60 * 1000 ? f.n : 0) + 1, t: Date.now() }) }

  const auth = (roles) => (req, res, next) => {
    const h = req.headers.authorization ?? ''
    const p = verifyToken(h.startsWith('Bearer ') ? h.slice(7) : '', secret)
    const u = p && store.q.userById.get(p.uid)
    if (!u || !u.active) return res.status(401).json({ error: 'Sesi berakhir, silakan masuk lagi' })
    if (roles && !roles.includes(u.role)) return res.status(403).json({ error: 'Akun Anda tidak boleh melakukan ini' })
    req.user = u
    next()
  }
  const wrap = (fn) => (req, res) => { try { fn(req, res) } catch (e) { console.error(e); res.status(400).json({ error: e.message || 'Permintaan tidak valid' }) } }
  const session = (u) => ({ token: signToken({ uid: u.id }, secret), user: store.publicUser(u) })
  const validPw = (pw) => typeof pw === 'string' && pw.length >= 8

  app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'siwarga-pkk', needsSetup: store.q.userCount.get().n === 0 }))

  app.post('/api/setup', wrap((req, res) => {
    if (store.q.userCount.get().n > 0) return res.status(403).json({ error: 'Server sudah disiapkan' })
    const { username, password, name } = req.body ?? {}
    if (!username?.trim() || !validPw(password)) return res.status(400).json({ error: 'Isi nama pengguna dan kata sandi (minimal 8 karakter)' })
    const u = { id: randomUUID(), username: username.trim(), name: (name ?? '').trim() || username.trim(), pass: hashPassword(password), role: 'admin' }
    store.q.insUser.run(u.id, u.username, u.name, u.pass, 'admin', new Date().toISOString())
    res.json(session(u))
  }))

  app.post('/api/login', wrap((req, res) => {
    const { username, password } = req.body ?? {}
    const key = `${req.ip}|${String(username ?? '').toLowerCase()}`
    if (limited(key)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' })
    const u = store.q.userByName.get(String(username ?? ''))
    if (!u || !u.active || !verifyPassword(String(password ?? ''), u.pass)) { fail(key); return res.status(401).json({ error: 'Nama pengguna atau kata sandi salah' }) }
    fails.delete(key)
    res.json(session(u))
  }))

  app.get('/api/me', auth(), (req, res) => res.json({ user: store.publicUser(req.user) }))

  app.post('/api/me/password', auth(), wrap((req, res) => {
    const { old, next } = req.body ?? {}
    if (!verifyPassword(String(old ?? ''), req.user.pass)) return res.status(400).json({ error: 'Kata sandi lama salah' })
    if (!validPw(next)) return res.status(400).json({ error: 'Kata sandi baru minimal 8 karakter' })
    store.q.updPass.run(hashPassword(next), req.user.id)
    res.json({ ok: true })
  }))

  // --- data ---
  app.get('/api/data', auth(), wrap((req, res) => {
    const since = Number(req.query.since) || 0
    const seq = store.seq()
    const cols = store.snapshot(since)
    const settings = store.meta('settings')
    res.json({ seq, full: !since, collections: cols, settings: settings ? JSON.parse(settings) : null })
  }))

  app.post('/api/ops', auth(['admin', 'editor']), wrap((req, res) => {
    const ops = req.body?.ops
    if (!Array.isArray(ops) || ops.length > 5000) return res.status(400).json({ error: 'Daftar operasi tidak valid' })
    const admin = req.user.role === 'admin'
    const conflicts = []
    store.tx(() => {
      for (const op of ops) {
        if (op.t === 'del' && !admin) throw new Error('Hanya admin yang boleh menghapus permanen')
        if (op.t === 'settings') { store.setMeta('settings', JSON.stringify(op.settings)); continue }
        const c = store.applyOp(op, req.user.name || req.user.username)
        if (c) conflicts.push(c)
      }
    })
    res.json({ seq: store.seq(), conflicts })
  }))

  // --- pengguna (admin) ---
  app.get('/api/users', auth(['admin']), (_req, res) => res.json({ users: store.q.users.all().map((u) => ({ ...u, active: !!u.active })) }))

  app.post('/api/users', auth(['admin']), wrap((req, res) => {
    const { username, name, password, role } = req.body ?? {}
    if (!username?.trim() || !validPw(password) || !ROLES.includes(role)) return res.status(400).json({ error: 'Isi nama pengguna, peran, dan kata sandi (minimal 8 karakter)' })
    if (store.q.userByName.get(username.trim())) return res.status(409).json({ error: 'Nama pengguna sudah dipakai' })
    const id = randomUUID()
    store.q.insUser.run(id, username.trim(), (name ?? '').trim() || username.trim(), hashPassword(password), role, new Date().toISOString())
    res.json({ user: store.publicUser(store.q.userById.get(id)) })
  }))

  app.put('/api/users/:id', auth(['admin']), wrap((req, res) => {
    const u = store.q.userById.get(req.params.id)
    if (!u) return res.status(404).json({ error: 'Pengguna tidak ditemukan' })
    const role = req.body.role ?? u.role
    const active = req.body.active === undefined ? !!u.active : !!req.body.active
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Peran tidak valid' })
    if (u.role === 'admin' && (role !== 'admin' || !active) && store.q.adminCount.get().n <= 1) return res.status(400).json({ error: 'Harus ada minimal satu admin aktif' })
    store.q.updUser.run((req.body.name ?? u.name).trim(), role, active ? 1 : 0, u.id)
    if (req.body.password !== undefined) {
      if (!validPw(req.body.password)) return res.status(400).json({ error: 'Kata sandi minimal 8 karakter' })
      store.q.updPass.run(hashPassword(req.body.password), u.id)
    }
    res.json({ user: store.publicUser(store.q.userById.get(u.id)) })
  }))

  app.delete('/api/users/:id', auth(['admin']), wrap((req, res) => {
    const u = store.q.userById.get(req.params.id)
    if (!u) return res.status(404).json({ error: 'Pengguna tidak ditemukan' })
    if (u.id === req.user.id) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' })
    if (u.role === 'admin' && store.q.adminCount.get().n <= 1) return res.status(400).json({ error: 'Harus ada minimal satu admin aktif' })
    store.q.delUser.run(u.id)
    res.json({ ok: true })
  }))

  // --- cadangan ---
  app.get('/api/backup', auth(['admin']), (_req, res) => {
    const settings = store.meta('settings')
    res.json({ versi: 2, dibuat: new Date().toISOString(), settings: settings ? JSON.parse(settings) : null, ...store.snapshot(0) })
  })
  app.post('/api/restore', auth(['admin']), wrap((req, res) => {
    const d = req.body
    if (!d || !Array.isArray(d.warga)) return res.status(400).json({ error: 'Format cadangan tidak dikenali' })
    store.restore(d)
    res.json({ ok: true, seq: store.seq() })
  }))

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Tidak ditemukan' }))

  // --- aplikasi web (hasil build) ---
  const dist = distDir ?? resolve(here, '../dist')
  if (existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h', index: 'index.html' }))
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
  }
  return { app, db, store }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000
  const { app } = createApp({ corsOrigin: process.env.CORS_ORIGIN ?? '*' })
  app.listen(port, () => console.log(`SIWARGA PKK berjalan di http://localhost:${port}`))
}
