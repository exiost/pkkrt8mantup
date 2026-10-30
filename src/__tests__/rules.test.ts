import { describe, expect, it } from 'vitest'
import { hitungUmur, infoDariNIK, isPUS, isWUS, isPenduduk1559, isLansia, isBalita, kelompokUmurPUS, jumlahKK } from '@/lib/rules'
import { uraiIRT, uraiPekarangan, yt } from '@/lib/excel'
import { blankWarga } from '@/lib/factories'
import type { Warga } from '@/lib/types'

const w = (p: Partial<Warga>): Warga => ({ ...blankWarga(), id: 'x', createdAt: '', updatedAt: '', ...p }) as Warga

describe('hitungUmur (setara DATEDIF "Y")', () => {
  it('menghitung tahun penuh', () => {
    expect(hitungUmur('1972-05-12', '2026-09-15')).toBe(54)
    expect(hitungUmur('2011-09-15', '2026-09-15')).toBe(15)
    expect(hitungUmur('2011-09-16', '2026-09-15')).toBe(14)
  })
  it('null bila lahir setelah tanggal acuan / kosong', () => {
    expect(hitungUmur('2027-01-01', '2026-09-15')).toBeNull()
    expect(hitungUmur('', '2026-09-15')).toBeNull()
  })
})

describe('WUS / PUS / Penduduk 15-59 / balita / lansia', () => {
  const acuan = '2026-09-15'
  it('WUS: perempuan 15–49 ikut PKK', () => {
    expect(isWUS(w({ jk: 'P', tglLahir: '1990-01-01' }), acuan)).toBe(true)
    expect(isWUS(w({ jk: 'P', tglLahir: '1976-09-15' }), acuan)).toBe(false) // tepat 50
    expect(isWUS(w({ jk: 'P', tglLahir: '1977-09-16' }), acuan)).toBe(true) // 48
    expect(isWUS(w({ jk: 'L', tglLahir: '1990-01-01' }), acuan)).toBe(false)
    expect(isWUS(w({ jk: 'P', tglLahir: '1990-01-01', ikutPKK: false }), acuan)).toBe(false)
  })
  it('PUS: istri, kawin tercatat, ≤ 49', () => {
    const base = { jk: 'P' as const, statusKeluarga: 'Istri', statusKawin: 'Kawin Tercatat' }
    expect(isPUS(w({ ...base, tglLahir: '1986-04-24' }), acuan)).toBe(true)
    expect(isPUS(w({ ...base, tglLahir: '1971-03-05' }), acuan)).toBe(false)
    expect(isPUS(w({ ...base, statusKawin: 'Cerai Mati', tglLahir: '1986-04-24' }), acuan)).toBe(false)
  })
  it('Penduduk 15–59', () => {
    expect(isPenduduk1559(w({ tglLahir: '1967-09-15' }), acuan)).toBe(true) // 59
    expect(isPenduduk1559(w({ tglLahir: '1966-09-15' }), acuan)).toBe(false) // 60
  })
  it('lansia = ≥ 50 th (sama dengan EDATE(acuan,-600) di Excel), balita < 5 th', () => {
    const s = { umurLansia: 50, umurBalita: 5 }
    expect(isLansia(w({ tglLahir: '1976-09-15' }), acuan, s)).toBe(true)
    expect(isLansia(w({ tglLahir: '1976-09-16' }), acuan, s)).toBe(false)
    expect(isBalita(w({ tglLahir: '2021-09-16' }), acuan, s)).toBe(true)
    expect(isBalita(w({ tglLahir: '2021-09-15' }), acuan, s)).toBe(false)
  })
  it('kelompok umur PUS', () => {
    expect(kelompokUmurPUS(14)).toBe('<15')
    expect(kelompokUmurPUS(19)).toBe('15-19')
    expect(kelompokUmurPUS(34)).toBe('20-34')
    expect(kelompokUmurPUS(49)).toBe('35-49')
  })
})

describe('keluarga & isian', () => {
  it('jumlah KK dalam satu keluarga: 1, atau 2 bila ada No KK berbeda', () => {
    expect(jumlahKK([w({ noKK: '1' }), w({ noKK: '1' })])).toBe(1)
    expect(jumlahKK([w({ noKK: '1' }), w({ noKK: '2' })])).toBe(2)
    expect(jumlahKK([])).toBe(0)
  })
  it('saran dari NIK', () => {
    expect(infoDariNIK('3402124503710002')).toEqual({ tglLahir: '1971-03-05', jk: 'P' })
    expect(infoDariNIK('3402121205720006')).toEqual({ tglLahir: '1972-05-12', jk: 'L' })
    expect(infoDariNIK('123')).toBeNull()
  })
  it('Ya/Tidak/kosong dibersihkan seperti isian Excel', () => {
    expect(yt('ya')).toBe('Ya')
    expect(yt('Ya  ')).toBe('Ya')
    expect(yt('Tidak ')).toBe('Tidak')
    expect(yt('tidak')).toBe('Tidak')
    expect(yt('')).toBe('')
    expect(yt(null)).toBe('')
  })
  it('urai teks pekarangan & IRT seperti makro VBA', () => {
    expect(uraiPekarangan('Cabe, 2 pot; Pandan, 1 pot;', 'Warung Hidup')).toEqual([
      { kategori: 'Warung Hidup', komoditi: 'Cabe', jumlah: '2 pot' },
      { kategori: 'Warung Hidup', komoditi: 'Pandan', jumlah: '1 pot' },
    ])
    expect(uraiIRT('Jahit; Payet;', 'Pembuatan Baju; Jasa Payet;', '2 pcs per hari;')).toEqual([
      { kategori: 'Jahit', komoditi: 'Pembuatan Baju', volume: '2 pcs per hari' },
      { kategori: 'Payet', komoditi: 'Jasa Payet', volume: '' },
    ])
  })
})
