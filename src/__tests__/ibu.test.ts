import { describe, expect, it } from 'vitest'
import { statusIbuPada, ymOf } from '@/lib/rules'
import { blankWarga } from '@/lib/factories'
import type { Warga } from '@/lib/types'

const w = (p: Partial<Warga>): Warga => ({ ...blankWarga(), id: 'x', createdAt: '', updatedAt: '', ...p }) as Warga

describe('status ibu per bulan (kasus melahirkan SC)', () => {
  const sc = w({
    hamil: false, nifas: true,
    riwayatIbu: [
      ...[1, 2, 3, 4, 5, 6, 7].map((m) => ({ bulan: `2026-${String(m).padStart(2, '0')}`, status: 'Hamil' as const })),
      { bulan: '2026-08', status: 'Melahirkan' as const, cara: 'SC' as const, tetapHamil: true },
      { bulan: '2026-09', status: 'Nifas' as const },
    ],
  })
  it('Januari–Juli hamil, Agustus SC tetap dilaporkan hamil', () => {
    expect(statusIbuPada(sc, ymOf(2026, 0)).hamil).toBe(true)
    expect(statusIbuPada(sc, '2026-07').hamil).toBe(true)
    expect(statusIbuPada(sc, '2026-08').hamil).toBe(true)
    expect(statusIbuPada(sc, '2026-08').melahirkan).toBe(false)
  })
  it('bulan setelahnya mengikuti catatan; bulan tanpa catatan tidak dilaporkan', () => {
    expect(statusIbuPada(sc, '2026-09').nifas).toBe(true)
    expect(statusIbuPada(sc, '2026-12')).toEqual({ hamil: false, melahirkan: false, nifas: false, menyusui: false })
  })
  it('Melahirkan SC tanpa centang "tetap hamil" dilaporkan melahirkan', () => {
    const x = w({ riwayatIbu: [{ bulan: '2026-08', status: 'Melahirkan', cara: 'SC' }] })
    expect(statusIbuPada(x, '2026-08').melahirkan).toBe(true)
  })
  it('tanpa catatan bulanan: pakai saklar biasa (sama seperti Excel)', () => {
    expect(statusIbuPada(w({ hamil: true }), '2026-03').hamil).toBe(true)
  })
})
