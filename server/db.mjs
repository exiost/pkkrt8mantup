import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// dimuat lewat require agar juga jalan di vitest (vite tidak mengenal modul bawaan node:sqlite)
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')

export const COLLECTIONS = ['warga', 'keluarga', 'kelahiran', 'kematian', 'pesertaKB', 'pusBaru', 'dasawisma', 'tags', 'kampungKB', 'arsip']

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '',
      pass TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS records (
      coll TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL,
      srv INTEGER NOT NULL, purged INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (coll, id)
    );
    CREATE INDEX IF NOT EXISTS idx_records_srv ON records(srv);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  migrateRT(db)
  return db
}

/** Daftar RT Desa Mantup (bawaan 01–17) */
export const RT_BAWAAN = Array.from({ length: 17 }, (_, i) => String(i + 1).padStart(2, '0'))

/**
 * Multi-RT: setiap data & akun diberi label RT. Database lama (satu RT) otomatis menjadi RT 08,
 * pengaturannya disalin ke "settings:08". Akun dengan rt kosong (NULL) = Admin Desa.
 */
function migrateRT(db) {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
  if (!cols('records').includes('rt')) db.exec("ALTER TABLE records ADD COLUMN rt TEXT NOT NULL DEFAULT '08'")
  if (!cols('users').includes('rt')) db.exec("ALTER TABLE users ADD COLUMN rt TEXT DEFAULT '08'")
  db.exec('CREATE INDEX IF NOT EXISTS idx_records_rt_srv ON records(rt, srv)')
  const get = db.prepare('SELECT value FROM meta WHERE key = ?')
  const old = get.get('settings')
  if (old && !get.get('settings:08')) db.prepare('INSERT INTO meta(key, value) VALUES(?, ?)').run('settings:08', old.value)
  if (!get.get('rts')) db.prepare('INSERT INTO meta(key, value) VALUES(?, ?)').run('rts', JSON.stringify(RT_BAWAAN))
}

export function createStore(db) {
  const q = {
    getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
    setMeta: db.prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
    maxSrv: db.prepare('SELECT COALESCE(MAX(srv), 0) AS m FROM records'),
    getRec: db.prepare('SELECT data, updated_at, purged, rt FROM records WHERE coll = ? AND id = ?'),
    putRec: db.prepare(`INSERT INTO records(coll, id, data, updated_at, srv, purged, rt) VALUES(?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(coll, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, srv = excluded.srv, purged = 0`),
    purgeRec: db.prepare(`INSERT INTO records(coll, id, data, updated_at, srv, purged, rt) VALUES(?, ?, '{}', ?, ?, 1, ?)
      ON CONFLICT(coll, id) DO UPDATE SET data = '{}', updated_at = excluded.updated_at, srv = excluded.srv, purged = 1`),
    all: db.prepare('SELECT coll, id, data, updated_at, purged FROM records WHERE purged = 0 AND rt = ?'),
    since: db.prepare('SELECT coll, id, data, updated_at, purged FROM records WHERE srv > ? AND rt = ?'),
    wipe: db.prepare('DELETE FROM records WHERE rt = ?'),
    countAudit: db.prepare("SELECT COUNT(*) AS n FROM records WHERE coll = 'audit'"),
    pruneAudit: db.prepare("DELETE FROM records WHERE coll = 'audit' AND id IN (SELECT id FROM records WHERE coll = 'audit' ORDER BY updated_at ASC LIMIT ?)"),
    ringkasRT: db.prepare("SELECT rt, coll, COUNT(*) AS n, MAX(updated_at) AS akhir FROM records WHERE purged = 0 AND coll IN ('warga', 'keluarga', 'audit') GROUP BY rt, coll"),
    users: db.prepare('SELECT id, username, name, role, active, created_at, rt FROM users ORDER BY created_at'),
    userByName: db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    userCount: db.prepare('SELECT COUNT(*) AS n FROM users'),
    adminCount: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1"),
    desaCount: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND rt IS NULL AND active = 1"),
    insUser: db.prepare('INSERT INTO users(id, username, name, pass, role, active, created_at, rt) VALUES(?, ?, ?, ?, ?, 1, ?, ?)'),
    updUser: db.prepare('UPDATE users SET name = ?, role = ?, active = ?, rt = ? WHERE id = ?'),
    updPass: db.prepare('UPDATE users SET pass = ? WHERE id = ?'),
    delUser: db.prepare('DELETE FROM users WHERE id = ?'),
  }
  const tx = (fn) => {
    db.exec('BEGIN IMMEDIATE')
    try { const r = fn(); db.exec('COMMIT'); return r } catch (e) { db.exec('ROLLBACK'); throw e }
  }
  const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: !!u.active, rt: u.rt ?? null, desa: u.role === 'admin' && !u.rt })
  const parse = (r) => ({ ...JSON.parse(r.data), ...(r.purged ? { purged: true, id: r.id, updatedAt: r.updated_at } : {}) })

  return {
    q, tx, publicUser,
    meta: (k) => q.getMeta.get(k)?.value ?? null,
    setMeta: (k, v) => q.setMeta.run(k, v),
    seq: () => q.maxSrv.get().m,
    /** terapkan satu operasi; kembalikan record server bila konflik (server lebih baru) */
    rts: () => { try { return JSON.parse(q.getMeta.get('rts')?.value ?? '[]') } catch { return [] } },
    /** terapkan satu operasi pada RT tertentu; kembalikan record server bila konflik (server lebih baru) */
    applyOp(op, who, rt) {
      if (op.t === 'put') {
        const { k, rec } = op
        if (!COLLECTIONS.includes(k) || !rec || typeof rec.id !== 'string') throw new Error('operasi tidak valid')
        const cur = q.getRec.get(k, rec.id)
        if (cur && cur.rt !== rt) throw new Error(`Data ini milik RT ${cur.rt}, bukan RT ${rt}`)
        if (cur && !cur.purged && cur.updated_at > (rec.updatedAt ?? '')) return { k, rec: JSON.parse(cur.data) }
        if (cur && cur.purged) return null // sudah dihapus permanen
        q.putRec.run(k, rec.id, JSON.stringify(rec), rec.updatedAt ?? new Date().toISOString(), q.maxSrv.get().m + 1, rt)
        return null
      }
      if (op.t === 'del') {
        if (!COLLECTIONS.includes(op.k) || typeof op.id !== 'string') throw new Error('operasi tidak valid')
        const cur = q.getRec.get(op.k, op.id)
        if (cur && cur.rt !== rt) throw new Error(`Data ini milik RT ${cur.rt}, bukan RT ${rt}`)
        q.purgeRec.run(op.k, op.id, new Date().toISOString(), q.maxSrv.get().m + 1, rt)
        return null
      }
      if (op.t === 'audit') {
        const e = { ...op.entry, oleh: who }
        const cur = q.getRec.get('audit', e.id)
        if (cur && cur.rt !== rt) return null
        q.putRec.run('audit', e.id, JSON.stringify(e), e.waktu, q.maxSrv.get().m + 1, rt)
        if (q.countAudit.get().n > 6000) q.pruneAudit.run(1000)
        return null
      }
      throw new Error('operasi tidak dikenal')
    },
    snapshot(since, rt) {
      const rows = since ? q.since.all(since, rt) : q.all.all(rt)
      const out = { audit: [] }
      for (const c of COLLECTIONS) out[c] = []
      for (const r of rows) {
        if (r.coll === 'audit') { if (!r.purged) out.audit.push(JSON.parse(r.data)); continue }
        if (out[r.coll]) out[r.coll].push(parse(r))
      }
      out.audit.sort((a, b) => b.waktu.localeCompare(a.waktu))
      out.audit = out.audit.slice(0, 500)
      return out
    },
    /** ganti seluruh data SATU RT dengan isi cadangan (RT lain tidak tersentuh) */
    restore(data, rt) {
      tx(() => {
        q.wipe.run(rt)
        let seq = q.maxSrv.get().m
        const milikLain = (c, id) => { const cur = q.getRec.get(c, id); return cur && cur.rt !== rt }
        for (const c of COLLECTIONS) for (const rec of data[c] ?? []) {
          if (rec && typeof rec.id === 'string' && !milikLain(c, rec.id)) q.putRec.run(c, rec.id, JSON.stringify(rec), rec.updatedAt ?? new Date().toISOString(), ++seq, rt)
        }
        for (const e of data.audit ?? []) if (e?.id && !milikLain('audit', e.id)) q.putRec.run('audit', e.id, JSON.stringify(e), e.waktu ?? new Date().toISOString(), ++seq, rt)
        if (data.settings) q.setMeta.run(`settings:${rt}`, JSON.stringify(data.settings))
      })
    },
  }
}
