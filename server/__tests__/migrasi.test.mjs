import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb, createStore } from '../db.mjs'

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')

describe('migrasi database lama (satu RT) ke multi-RT', () => {
  it('data & akun lama menjadi RT 08, pengaturan disalin', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'siwarga-')), 'lama.db')
    const old = new DatabaseSync(f)
    old.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', pass TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
      CREATE TABLE records (coll TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL, srv INTEGER NOT NULL, purged INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (coll, id));
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO users VALUES ('u1','admin','Admin','x','admin',1,'2026-01-01');
      INSERT INTO records VALUES ('warga','w1','{"id":"w1","nama":"Siti"}','2026-01-01',1,0);
      INSERT INTO meta VALUES ('settings','{"rt":"RT 08"}');`)
    old.close()
    const db = openDb(f)
    const s = createStore(db)
    expect(s.q.userById.get('u1').rt).toBe('08')
    expect(s.snapshot(0, '08').warga.map((w) => w.nama)).toEqual(['Siti'])
    expect(s.snapshot(0, '01').warga).toEqual([])
    expect(JSON.parse(s.meta('settings:08')).rt).toBe('RT 08')
    expect(s.rts().length).toBe(17)
    // dibuka ulang: tidak dobel / tidak rusak
    db.close()
    const s2 = createStore(openDb(f))
    expect(s2.snapshot(0, '08').warga.length).toBe(1)
  })
})
