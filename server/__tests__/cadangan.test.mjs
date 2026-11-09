import { describe, it, expect } from 'vitest'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { openDb, createStore } from '../db.mjs'
import { cadanganHarian, daftarCadangan, createApp } from '../index.mjs'

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')

describe('cadangan harian database', () => {
  it('satu file per hari, isi utuh, disimpan 14 hari terakhir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'siwarga-cad-'))
    const db = openDb(join(dir, 'siwarga.db'))
    const s = createStore(db)
    s.applyOp({ t: 'put', k: 'warga', rec: { id: 'w1', nama: 'Siti', updatedAt: '2026-01-01' } }, 'x', '08')
    const folder = join(dir, 'cadangan-harian')
    for (let d = 1; d <= 20; d++) cadanganHarian(db, folder, 14, `2026-10-${String(d).padStart(2, '0')}`)
    cadanganHarian(db, folder, 14, '2026-10-20') // hari sama: tidak dobel
    const files = readdirSync(folder).sort()
    expect(files.length).toBe(14)
    expect(files[0]).toBe('siwarga-2026-10-07.db')
    expect(daftarCadangan(folder)[0].nama).toBe('siwarga-2026-10-20.db')
    const salinan = new DatabaseSync(join(folder, 'siwarga-2026-10-20.db'))
    expect(salinan.prepare("SELECT COUNT(*) AS n FROM records WHERE coll = 'warga'").get().n).toBe(1)
    salinan.close()
  })
  it('server membuat cadangan saat menyala; hanya Admin Desa yang bisa melihat & mengunduh', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'siwarga-cad2-'))
    const { app } = createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' })
    const srv = await new Promise((ok) => { const x = app.listen(0, () => ok(x)) })
    const base = `http://127.0.0.1:${srv.address().port}/api`
    const j = async (p, o = {}) => { const r = await fetch(base + p, { method: o.m ?? 'GET', headers: { 'Content-Type': 'application/json', ...(o.t ? { Authorization: `Bearer ${o.t}` } : {}) }, body: o.b ? JSON.stringify(o.b) : undefined }); return { s: r.status, r } }
    const desa = await (await j('/setup', { m: 'POST', b: { username: 'desa', password: 'rahasia123' } })).r.json()
    await j('/users', { m: 'POST', t: desa.token, b: { username: 'a8', password: 'rahasia123', role: 'admin', rt: '08' } })
    const a8 = await (await j('/login', { m: 'POST', b: { username: 'a8', password: 'rahasia123' } })).r.json()
    const list = await (await j('/cadangan-harian', { t: desa.token })).r.json()
    expect(list.list.length).toBe(1)
    const unduh = await j(`/cadangan-harian/${list.list[0].nama}`, { t: desa.token })
    expect(unduh.s).toBe(200)
    expect((await unduh.r.arrayBuffer()).byteLength).toBeGreaterThan(1000)
    expect((await j('/cadangan-harian', { t: a8.token })).s).toBe(403)
    expect((await j('/cadangan-harian/..%2Fsiwarga.db', { t: desa.token })).s).toBe(404)
    srv.close()
  })
})
