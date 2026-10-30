import { describe, expect, it } from 'vitest'
import { selarasRiwayat, statusIbuPada, ymOf } from '@/lib/rules'
import { blankWarga } from '@/lib/factories'
import type { Warga } from '@/lib/types'

const w = (p: Partial<Warga>): Warga => ({ ...blankWarga(), id: 'x', createdAt: '', updatedAt: '', ...p }) as Warga

describe('status ibu per bulan (kasus melahirkan SC)', () => {
  const sc = w({
    hamil: false, nifas: false,
    riwayatIbu: [
      ...[1, 2, 3, 4, 5, 6, 7].map((m) => ({ bulan: `2026-${String(m).padStart(2, '0')}`, status: 'Hamil' as const })),
      { bulan: '2026-08', status: 'Melahirkan' as const, cara: 'SC' as const, tetapHamil: true },
      { bulan: '2026-09', status: 'Nifas' as const },
    ],
  })
  it('Januari–Juli hamil, Agustus (SC) dilaporkan Melahirkan di laporan bulanan', () => {
    expect(statusIbuPada(sc, ymOf(2026, 0)).hamil).toBe(true)
    expect(statusIbuPada(sc, '2026-07').hamil).toBe(true)
    expect(statusIbuPada(sc, '2026-08').melahirkan).toBe(true)
    expect(statusIbuPada(sc, '2026-08').hamil).toBe(false)
  })
  it('laporan rentang menghitung hamil dari Januari–Juli sekaligus melahirkan', () => {
    expect(statusIbuPada(sc, '2026-08~2026-08')).toMatchObject({ hamil: true, melahirkan: true }) // tetap hamil dicentang
    expect(statusIbuPada(sc, '2026-01~2026-07')).toMatchObject({ hamil: true, melahirkan: false })
  })
  it('bulan setelahnya mengikuti catatan; bulan tanpa catatan tidak dilaporkan', () => {
    expect(statusIbuPada(sc, '2026-09').nifas).toBe(true)
    expect(statusIbuPada(sc, '2026-12')).toEqual({ hamil: false, melahirkan: false, nifas: false, menyusui: false })
  })
  it('Melahirkan SC tanpa centang tidak ikut dihitung hamil di rentang', () => {
    const x = w({ riwayatIbu: [{ bulan: '2026-08', status: 'Melahirkan', cara: 'SC' }] })
    expect(statusIbuPada(x, '2026-08').melahirkan).toBe(true)
    expect(statusIbuPada(x, '2026-08~2026-08').hamil).toBe(false)
  })
  it('tanpa catatan bulanan: pakai saklar biasa (sama seperti Excel)', () => {
    expect(statusIbuPada(w({ hamil: true }), '2026-03').hamil).toBe(true)
  })
})

describe('rekap rentang bulan / tahunan', () => {
  const ibu = w({
    riwayatIbu: [
      { bulan: '2026-02', status: 'Hamil' },
      { bulan: '2026-08', status: 'Melahirkan', cara: 'SC', tetapHamil: true },
      { bulan: '2026-09', status: 'Nifas' },
      { bulan: '2026-11', status: 'Menyusui' },
    ],
  })
  it('Januari–Desember: ibu terhitung di semua status sekaligus', () => {
    expect(statusIbuPada(ibu, '2026-01~2026-12')).toEqual({ hamil: true, melahirkan: true, nifas: true, menyusui: true })
  })
  it('hanya rentang yang dipilih', () => {
    expect(statusIbuPada(ibu, '2026-01~2026-07')).toEqual({ hamil: true, melahirkan: false, nifas: false, menyusui: false })
    expect(statusIbuPada(ibu, '2026-09~2026-10')).toEqual({ hamil: false, melahirkan: false, nifas: true, menyusui: false })
  })
})

describe('saklar status ibu ↔ laporan', () => {
  const now = ymOf(new Date().getFullYear(), new Date().getMonth())
  it('bulan ini selalu mengikuti saklar, walau ibu punya catatan bulan lain', () => {
    const x = w({ hamil: true, menyusui: true, riwayatIbu: [{ bulan: '2020-01', status: 'Hamil' }] })
    expect(statusIbuPada(x, now)).toMatchObject({ hamil: true, menyusui: true })
  })
  it('mengubah saklar menyelaraskan catatan bulan ini', () => {
    const x = w({ hamil: true, menyusui: true })
    const r = selarasRiwayat(x)
    expect(r).toEqual([{ bulan: now, status: 'Hamil', juga: ['Menyusui'] }])
    expect(selarasRiwayat({ ...x, riwayatIbu: r, hamil: false, menyusui: false } as Warga)).toEqual([])
  })
  it('rentang yang memuat bulan ini ikut saklar', () => {
    const x = w({ menyusui: true, riwayatIbu: [{ bulan: '2020-01', status: 'Hamil' }] })
    const y = new Date().getFullYear()
    expect(statusIbuPada(x, `${y}-01~${y}-12`).menyusui).toBe(true)
  })
})
