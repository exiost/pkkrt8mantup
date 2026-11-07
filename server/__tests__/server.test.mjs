import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../index.mjs'

let srv, base
const j = async (path, { method = 'GET', body, token, rt = '08' } = {}) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-RT': rt, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => ({})) }
}
const rec = (id, extra = {}) => ({ id, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), nama: 'X', ...extra })

let admin, editor, viewer
beforeAll(async () => {
  const { app } = createApp({ dbFile: ':memory:', distDir: '/nonexistent' })
  await new Promise((ok) => { srv = app.listen(0, ok) })
  base = `http://127.0.0.1:${srv.address().port}`
})
afterAll(() => srv.close())

describe('server SIWARGA', () => {
  it('bisa dipasang di sub-alamat (cPanel: domain/data-warga)', async () => {
    const r = await j('/data-warga/api/health')
    expect(r.status).toBe(200)
    expect(r.data.app).toBe('siwarga-pkk')
  })
  it('health: server baru butuh setup', async () => {
    const r = await j('/api/health')
    expect(r.data.needsSetup).toBe(true)
  })
  it('setup membuat admin hanya sekali', async () => {
    expect((await j('/api/setup', { method: 'POST', body: { username: 'admin', password: 'pendek' } })).status).toBe(400)
    const r = await j('/api/setup', { method: 'POST', body: { username: 'admin', password: 'rahasia123', name: 'Ketua' } })
    expect(r.status).toBe(200)
    admin = r.data.token
    expect(r.data.user.role).toBe('admin')
    expect((await j('/api/setup', { method: 'POST', body: { username: 'x', password: 'rahasia123' } })).status).toBe(403)
    expect((await j('/api/health')).data.needsSetup).toBe(false)
  })
  it('data tidak bisa dibuka tanpa login', async () => {
    expect((await j('/api/data')).status).toBe(401)
    expect((await j('/api/data', { token: 'salah.token' })).status).toBe(401)
  })
  it('login salah ditolak, login benar berhasil', async () => {
    expect((await j('/api/login', { method: 'POST', body: { username: 'admin', password: 'salahsalah' } })).status).toBe(401)
    const r = await j('/api/login', { method: 'POST', body: { username: 'ADMIN', password: 'rahasia123' } })
    expect(r.status).toBe(200)
  })
  it('admin membuat editor & viewer', async () => {
    const e = await j('/api/users', { method: 'POST', token: admin, body: { username: 'kader', password: 'kader12345', role: 'editor', name: 'Kader', rt: '08' } })
    expect(e.status).toBe(200)
    const v = await j('/api/users', { method: 'POST', token: admin, body: { username: 'tamu', password: 'tamu123456', role: 'viewer', rt: '08' } })
    expect(v.status).toBe(200)
    expect((await j('/api/users', { method: 'POST', token: admin, body: { username: 'kader', password: 'kader12345', role: 'editor' } })).status).toBe(409)
    editor = (await j('/api/login', { method: 'POST', body: { username: 'kader', password: 'kader12345' } })).data.token
    viewer = (await j('/api/login', { method: 'POST', body: { username: 'tamu', password: 'tamu123456' } })).data.token
    expect((await j('/api/users', { token: editor })).status).toBe(403)
  })
  it('editor menyimpan data, viewer hanya membaca', async () => {
    const r = await j('/api/ops', { method: 'POST', token: editor, body: { ops: [{ t: 'put', k: 'warga', rec: rec('w1', { nama: 'Siti' }) }, { t: 'audit', entry: { id: 'a1', waktu: new Date().toISOString(), koleksi: 'warga', recordId: 'w1', aksi: 'Tambah', label: 'Siti' } }] } })
    expect(r.status).toBe(200)
    expect((await j('/api/ops', { method: 'POST', token: viewer, body: { ops: [{ t: 'put', k: 'warga', rec: rec('w2') }] } })).status).toBe(403)
    const d = await j('/api/data', { token: viewer })
    expect(d.data.collections.warga.map((w) => w.nama)).toEqual(['Siti'])
    expect(d.data.collections.audit[0].oleh).toBe('Kader')
  })
  it('koleksi tidak dikenal ditolak', async () => {
    expect((await j('/api/ops', { method: 'POST', token: editor, body: { ops: [{ t: 'put', k: 'users', rec: rec('z') }] } })).status).toBe(400)
  })
  it('konflik: versi server lebih baru dipertahankan', async () => {
    const lama = rec('w1', { nama: 'Lama', updatedAt: '2000-01-01T00:00:00.000Z' })
    const r = await j('/api/ops', { method: 'POST', token: editor, body: { ops: [{ t: 'put', k: 'warga', rec: lama }] } })
    expect(r.data.conflicts[0].rec.nama).toBe('Siti')
  })
  it('delta sejak nomor urut tertentu', async () => {
    const before = (await j('/api/data', { token: editor })).data.seq
    await j('/api/ops', { method: 'POST', token: editor, body: { ops: [{ t: 'put', k: 'warga', rec: rec('w3', { nama: 'Budi' }) }] } })
    const d = await j(`/api/data?since=${before}`, { token: editor })
    expect(d.data.full).toBe(false)
    expect(d.data.collections.warga.map((w) => w.nama)).toEqual(['Budi'])
  })
  it('kunci tanggal laporan hanya bisa diubah admin', async () => {
    const kunci = { aktif: true, acuan: '2026-10-01', bulan: 9, tahun: 2026 }
    await j('/api/ops', { method: 'POST', token: admin, body: { ops: [{ t: 'settings', settings: { rt: 'RT 08', kunci } }] } })
    await j('/api/ops', { method: 'POST', token: editor, body: { ops: [{ t: 'settings', settings: { rt: 'RT 08', kunci: { ...kunci, aktif: false, tahun: 1999 } } }] } })
    expect((await j('/api/data', { token: viewer })).data.settings.kunci).toEqual(kunci)
    await j('/api/ops', { method: 'POST', token: admin, body: { ops: [{ t: 'settings', settings: { rt: 'RT 08' } }] } })
  })
  it('hapus permanen hanya admin', async () => {
    expect((await j('/api/ops', { method: 'POST', token: editor, body: { ops: [{ t: 'del', k: 'warga', id: 'w3' }] } })).status).toBe(400)
    expect((await j('/api/ops', { method: 'POST', token: viewer, body: { ops: [{ t: 'settings', settings: { rt: 'X' } }] } })).status).toBe(403)
    expect((await j('/api/ops', { method: 'POST', token: admin, body: { ops: [{ t: 'del', k: 'warga', id: 'w3' }, { t: 'settings', settings: { rt: 'RT 08' } }] } })).status).toBe(200)
    const d = await j('/api/data', { token: admin })
    expect(d.data.collections.warga.map((w) => w.id)).toEqual(['w1'])
    expect(d.data.settings.rt).toBe('RT 08')
  })
  it('tombstone hapus permanen ikut di delta', async () => {
    const d = await j('/api/data?since=1', { token: admin })
    expect(d.data.collections.warga.some((w) => w.id === 'w3' && w.purged)).toBe(true)
  })
  it('admin terakhir tidak bisa dinonaktifkan / dihapus', async () => {
    const me = (await j('/api/me', { token: admin })).data.user
    expect((await j(`/api/users/${me.id}`, { method: 'PUT', token: admin, body: { active: false } })).status).toBe(400)
    expect((await j(`/api/users/${me.id}`, { method: 'DELETE', token: admin })).status).toBe(400)
  })
  it('ganti kata sandi', async () => {
    expect((await j('/api/me/password', { method: 'POST', token: editor, body: { old: 'salah', next: 'barubaru123' } })).status).toBe(400)
    expect((await j('/api/me/password', { method: 'POST', token: editor, body: { old: 'kader12345', next: 'barubaru123' } })).status).toBe(200)
    expect((await j('/api/login', { method: 'POST', body: { username: 'kader', password: 'barubaru123' } })).status).toBe(200)
  })
  it('cadangan & pulihkan', async () => {
    const b = await j('/api/backup', { token: admin })
    expect(b.data.warga.length).toBe(1)
    expect((await j('/api/backup', { token: editor })).status).toBe(403)
    await j('/api/ops', { method: 'POST', token: admin, body: { ops: [{ t: 'put', k: 'warga', rec: rec('w9', { nama: 'Baru' }) }] } })
    expect((await j('/api/restore', { method: 'POST', token: admin, body: b.data })).status).toBe(200)
    const d = await j('/api/data', { token: admin })
    expect(d.data.collections.warga.map((w) => w.id)).toEqual(['w1'])
  })
  it('pengguna nonaktif tidak bisa masuk dan sesinya ditolak', async () => {
    const list = (await j('/api/users', { token: admin })).data.users
    const t = list.find((u) => u.username === 'tamu')
    await j(`/api/users/${t.id}`, { method: 'PUT', token: admin, body: { active: false } })
    expect((await j('/api/data', { token: viewer })).status).toBe(401)
    expect((await j('/api/login', { method: 'POST', body: { username: 'tamu', password: 'tamu123456' } })).status).toBe(401)
  })
  it('multi-RT: RT lain tidak bisa melihat atau menimpa data RT 08', async () => {
    expect((await j('/api/users', { method: 'POST', token: admin, body: { username: 'admin09', password: 'admin09pass', role: 'admin', rt: '09' } })).status).toBe(200)
    expect((await j('/api/users', { method: 'POST', token: admin, body: { username: 'tanpaRT', password: 'admin09pass', role: 'admin' } })).status).toBe(400)
    const a9 = (await j('/api/login', { method: 'POST', body: { username: 'admin09', password: 'admin09pass' } })).data
    expect(a9.user.rt).toBe('09')
    expect(a9.user.desa).toBe(false)
    const t9 = a9.token
    // header X-RT diabaikan untuk akun RT: tetap RT 09
    const d9 = await j('/api/data', { token: t9, rt: '08' })
    expect(d9.data.rt).toBe('09')
    expect(d9.data.collections.warga).toEqual([])
    expect((await j('/api/ops', { method: 'POST', token: t9, body: { ops: [{ t: 'put', k: 'warga', rec: rec('w1', { nama: 'Bajak' }) }] } })).status).toBe(400)
    expect((await j('/api/ops', { method: 'POST', token: t9, body: { ops: [{ t: 'del', k: 'warga', id: 'w1' }] } })).status).toBe(400)
    expect((await j('/api/ops', { method: 'POST', token: t9, body: { ops: [{ t: 'put', k: 'warga', rec: rec('x9', { nama: 'Warga 9' }) }] } })).status).toBe(200)
    // Admin RT 09 hanya melihat akun RT 09, tidak bisa mengubah akun RT 08
    const u9 = (await j('/api/users', { token: t9 })).data.users
    expect(u9.map((u) => u.username)).toEqual(['admin09'])
    const kader = (await j('/api/users', { token: admin })).data.users.find((u) => u.username === 'kader')
    expect((await j(`/api/users/${kader.id}`, { method: 'PUT', token: t9, body: { active: false } })).status).toBe(404)
    expect((await j('/api/users', { method: 'POST', token: t9, body: { username: 'desa2', password: 'desa2pass', role: 'admin', desa: true } })).status).toBe(403)
    expect((await j('/api/rts', { token: t9 })).status).toBe(403)
    // Admin Desa memilih RT lewat X-RT
    expect((await j('/api/data', { token: admin, rt: '09' })).data.collections.warga.map((w) => w.nama)).toEqual(['Warga 9'])
    expect((await j('/api/data', { token: admin, rt: '08' })).data.collections.warga.map((w) => w.nama)).toEqual(['Siti'])
    expect((await j('/api/data', { token: admin, rt: '99' })).status).toBe(400)
    const rts = (await j('/api/rts', { token: admin })).data.rts
    expect(rts.length).toBe(17)
    expect(rts.find((r) => r.rt === '09').warga).toBe(1)
    // pengaturan per RT
    await j('/api/ops', { method: 'POST', token: t9, body: { ops: [{ t: 'settings', settings: { rt: 'RT 09' } }] } })
    expect((await j('/api/data', { token: admin, rt: '08' })).data.settings.rt).toBe('RT 08')
    // pulihkan cadangan RT 09 tidak menghapus RT 08
    expect((await j('/api/restore', { method: 'POST', token: t9, body: { warga: [] } })).status).toBe(200)
    expect((await j('/api/data', { token: admin, rt: '08' })).data.collections.warga.length).toBe(1)
  })
  it('gabungan desa hanya untuk Admin Desa', async () => {
    const d = await j('/api/desa', { token: admin })
    expect(d.status).toBe(200)
    expect(d.data.rts.length).toBe(17)
    expect(d.data.rts.find((r) => r.rt === '08').warga.length).toBe(1)
    expect(d.data.rts.find((r) => r.rt === '09').warga.length).toBe(0) // RT 09 sudah dipulihkan kosong di tes sebelumnya
    expect((await j('/api/desa', { token: editor })).status).toBe(403)
  })
  it('pembatas percobaan login', async () => {
    let last = 0
    for (let i = 0; i < 10; i++) last = (await j('/api/login', { method: 'POST', body: { username: 'brute', password: 'x' + i } })).status
    expect(last).toBe(429)
  })
})
