import { describe, it, expect } from 'vitest'
import { periksaData } from '@/lib/periksa'
import { blankWarga } from '@/lib/factories'
import type { Dasawisma, Keluarga, Warga } from '@/lib/types'

const w = (id: string, x: Partial<Warga>): Warga => ({ ...blankWarga(), id, createdAt: '', updatedAt: '', deletedAt: null, nama: id, nik: `340401000000${id.padStart(4, '0').slice(-4)}`, tglLahir: '1990-01-01', keluargaId: 'k1', dasawisma: 'Melati', ...x }) as Warga
const k = (id: string, nomor: number): Keluarga => ({ id, nomor, createdAt: '', updatedAt: '', deletedAt: null } as unknown as Keluarga)
const dws = [{ id: 'd', nama: 'Melati', deletedAt: null } as unknown as Dasawisma]
const kode = (ws: Warga[], ks = [k('k1', 1)]) => periksaData(ws, ks, dws, '2026-11-10').map((t) => `${t.kode}:${t.nama}`).sort()

describe('pemeriksa data', () => {
  it('data rapi: tidak ada temuan', () => {
    expect(kode([w('1', { statusKeluarga: 'Kepala Keluarga', statusKawin: 'Kawin Tercatat' }), w('2', { statusKeluarga: 'Istri', jk: 'P', statusKawin: 'Kawin Tercatat' }), w('3', { statusKeluarga: 'Anak', tglLahir: '2015-05-05' })])).toEqual([])
  })
  it('menemukan isian janggal', () => {
    const t = kode([
      w('1', { statusKeluarga: 'Kepala Keluarga', nik: '12345' }),
      w('2', { statusKeluarga: 'Istri', jk: 'P', statusKawin: 'Belum Kawin', nik: '3404010000000009' }),
      w('3', { statusKeluarga: 'Anak', tglLahir: '1985-01-01', nik: '3404010000000009' }),
      w('4', { keluargaId: '', tglLahir: '' }),
      w('5', { keluargaId: 'k1', dasawisma: 'Mawar', statusKeluarga: 'Famili Lain', hamil: true, jk: 'L' }),
      w('6', { statusWarga: 'Meninggal', nik: '' }), // tidak aktif: tidak diperiksa
    ])
    expect(t).toEqual([
      'anak-tua:3', 'dawis-tak-ada:5', 'ibu-laki:5', 'kawin-istri:2', 'lahir-kosong:4', 'nik-ganda:2', 'nik-ganda:3', 'nik-panjang:1', 'tanpa-keluarga:4',
    ])
  })
  it('keluarga tanpa kepala / kepala ganda, HPL lewat', () => {
    expect(kode([w('1', { statusKeluarga: 'Istri', jk: 'P', statusKawin: 'Kawin Tercatat', hamil: true, hpl: '2026-10-01' })])).toEqual(['hpl-lewat:1', 'tanpa-kepala:Keluarga no. 1'])
    expect(kode([w('1', { statusKeluarga: 'Kepala Keluarga' }), w('2', { statusKeluarga: 'Kepala Keluarga' })])).toEqual(['kepala-ganda:Keluarga no. 1'])
  })
})
