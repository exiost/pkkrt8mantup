import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../index.mjs'
import { hashPassword, verifyPassword } from '../auth.mjs'

const siapkan = () => {
  const dir = mkdtempSync(join(tmpdir(), 'siwarga-reset-'))
  const { store } = createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' })
  return { dir, store }
}
const user = (store, nama) => store.q.userByName.get(nama)

describe('pemulihan darurat kata sandi lewat file di folder data', () => {
  it('isi kata sandi saja → semua Admin Desa direset, wajib ganti saat masuk, file berisi daftar nama pengguna', () => {
    const { dir, store } = siapkan()
    store.q.insUser.run('d1', 'desa', 'Admin Desa', hashPassword('lupaaaaa1'), 'admin', '2026-01-01', null)
    store.q.insUser.run('a8', 'admin', 'Admin', hashPassword('tetapsama1'), 'admin', '2026-01-01', '08')
    store.q.updUser.run('Admin Desa', 'admin', 0, null, 'd1') // bahkan bila akunnya nonaktif
    writeFileSync(join(dir, 'reset-admin-desa.txt'), 'SandiBaru2026\n')
    createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' }) // = RESTART di cPanel
    const d = user(store, 'desa')
    expect(verifyPassword('SandiBaru2026', d.pass)).toBe(true)
    expect(d.active).toBe(1)
    expect(d.ganti).toBe(1)
    expect(verifyPassword('tetapsama1', user(store, 'admin').pass)).toBe(true) // admin RT tidak tersentuh
    const hasil = readFileSync(join(dir, 'reset-admin-desa.txt'), 'utf8')
    expect(hasil).toMatch(/^BERHASIL/)
    expect(hasil).toMatch(/desa \(Admin Desa\)/)
    expect(hasil).not.toMatch(/SandiBaru2026/) // kata sandi tidak ditulis ulang
    // restart lagi: file yang sudah diproses tidak dijalankan ulang
    store.q.updPass.run(hashPassword('sudahdiganti1'), 'd1')
    createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' })
    expect(verifyPassword('sudahdiganti1', user(store, 'desa').pass)).toBe(true)
  })
  it('"namapengguna: sandi" → hanya akun itu; nama salah → GAGAL dengan daftar nama pengguna', () => {
    const { dir, store } = siapkan()
    store.q.insUser.run('a8', 'admin', 'Admin', hashPassword('lupaaaaa1'), 'admin', '2026-01-01', '08')
    writeFileSync(join(dir, 'reset-admin-desa.txt'), 'adminn: SandiBaru2026')
    createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' })
    expect(readFileSync(join(dir, 'reset-admin-desa.txt'), 'utf8')).toMatch(/GAGAL[\s\S]*admin \(RT 08, admin\)/)
    writeFileSync(join(dir, 'reset-admin-desa.txt'), 'admin: SandiBaru2026')
    createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' })
    expect(verifyPassword('SandiBaru2026', user(store, 'admin').pass)).toBe(true)
  })
  it('kata sandi terlalu pendek ditolak; belum ada Admin Desa → dibuat akun "desa"', () => {
    const { dir, store } = siapkan()
    writeFileSync(join(dir, 'reset-admin-desa.txt'), 'pendek')
    createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' })
    expect(readFileSync(join(dir, 'reset-admin-desa.txt'), 'utf8')).toMatch(/GAGAL.*minimal 8/)
    writeFileSync(join(dir, 'reset-admin-desa.txt'), 'SandiBaru2026')
    createApp({ dbFile: join(dir, 'siwarga.db'), distDir: '/nonexistent' })
    const d = user(store, 'desa')
    expect(d.role).toBe('admin')
    expect(d.rt).toBe(null)
    expect(verifyPassword('SandiBaru2026', d.pass)).toBe(true)
  })
})
