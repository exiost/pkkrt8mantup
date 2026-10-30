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
  return db
}

export function createStore(db) {
  const q = {
    getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
    setMeta: db.prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
    maxSrv: db.prepare('SELECT COALESCE(MAX(srv), 0) AS m FROM records'),
    getRec: db.prepare('SELECT data, updated_at, purged FROM records WHERE coll = ? AND id = ?'),
    putRec: db.prepare(`INSERT INTO records(coll, id, data, updated_at, srv, purged) VALUES(?, ?, ?, ?, ?, 0)
      ON CONFLICT(coll, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, srv = excluded.srv, purged = 0`),
    purgeRec: db.prepare(`INSERT INTO records(coll, id, data, updated_at, srv, purged) VALUES(?, ?, '{}', ?, ?, 1)
      ON CONFLICT(coll, id) DO UPDATE SET data = '{}', updated_at = excluded.updated_at, srv = excluded.srv, purged = 1`),
    all: db.prepare('SELECT coll, id, data, updated_at, purged FROM records WHERE purged = 0'),
    since: db.prepare('SELECT coll, id, data, updated_at, purged FROM records WHERE srv > ?'),
    wipe: db.prepare('DELETE FROM records'),
    countAudit: db.prepare("SELECT COUNT(*) AS n FROM records WHERE coll = 'audit'"),
    pruneAudit: db.prepare("DELETE FROM records WHERE coll = 'audit' AND id IN (SELECT id FROM records WHERE coll = 'audit' ORDER BY updated_at ASC LIMIT ?)"),
    users: db.prepare('SELECT id, username, name, role, active, created_at FROM users ORDER BY created_at'),
    userByName: db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    userCount: db.prepare('SELECT COUNT(*) AS n FROM users'),
    adminCount: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1"),
    insUser: db.prepare('INSERT INTO users(id, username, name, pass, role, active, created_at) VALUES(?, ?, ?, ?, ?, 1, ?)'),
    updUser: db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?'),
    updPass: db.prepare('UPDATE users SET pass = ? WHERE id = ?'),
    delUser: db.prepare('DELETE FROM users WHERE id = ?'),
  }
  const tx = (fn) => {
    db.exec('BEGIN IMMEDIATE')
    try { const r = fn(); db.exec('COMMIT'); return r } catch (e) { db.exec('ROLLBACK'); throw e }
  }
  const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: !!u.active })
  const parse = (r) => ({ ...JSON.parse(r.data), ...(r.purged ? { purged: true, id: r.id, updatedAt: r.updated_at } : {}) })

  return {
    q, tx, publicUser,
    meta: (k) => q.getMeta.get(k)?.value ?? null,
    setMeta: (k, v) => q.setMeta.run(k, v),
    seq: () => q.maxSrv.get().m,
    /** terapkan satu operasi; kembalikan record server bila konflik (server lebih baru) */
    applyOp(op, who) {
      if (op.t === 'put') {
        const { k, rec } = op
        if (!COLLECTIONS.includes(k) || !rec || typeof rec.id !== 'string') throw new Error('operasi tidak valid')
        const cur = q.getRec.get(k, rec.id)
        if (cur && !cur.purged && cur.updated_at > (rec.updatedAt ?? '')) return { k, rec: JSON.parse(cur.data) }
        if (cur && cur.purged) return null // sudah dihapus permanen
        q.putRec.run(k, rec.id, JSON.stringify(rec), rec.updatedAt ?? new Date().toISOString(), q.maxSrv.get().m + 1)
        return null
      }
      if (op.t === 'del') {
        if (!COLLECTIONS.includes(op.k) || typeof op.id !== 'string') throw new Error('operasi tidak valid')
        q.purgeRec.run(op.k, op.id, new Date().toISOString(), q.maxSrv.get().m + 1)
        return null
      }
      if (op.t === 'audit') {
        const e = { ...op.entry, oleh: who }
        q.putRec.run('audit', e.id, JSON.stringify(e), e.waktu, q.maxSrv.get().m + 1)
        if (q.countAudit.get().n > 6000) q.pruneAudit.run(1000)
        return null
      }
      throw new Error('operasi tidak dikenal')
    },
    snapshot(since) {
      const rows = since ? q.since.all(since) : q.all.all()
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
    restore(data) {
      tx(() => {
        q.wipe.run()
        let seq = 0
        for (const c of COLLECTIONS) for (const rec of data[c] ?? []) {
          if (rec && typeof rec.id === 'string') q.putRec.run(c, rec.id, JSON.stringify(rec), rec.updatedAt ?? new Date().toISOString(), ++seq)
        }
        for (const e of data.audit ?? []) if (e?.id) q.putRec.run('audit', e.id, JSON.stringify(e), e.waktu ?? new Date().toISOString(), ++seq)
        if (data.settings) q.setMeta.run('settings', JSON.stringify(data.settings))
      })
    },
  }
}
