import type { Warga, Settings } from './types'

/** Umur dalam tahun penuh pada tanggal acuan (setara DATEDIF(...,"Y")). null jika lahir setelah acuan / kosong. */
export function hitungUmur(tglLahir: string, acuan: string): number | null {
  if (!tglLahir) return null
  const l = new Date(tglLahir + 'T00:00:00')
  const a = new Date(acuan + 'T00:00:00')
  if (isNaN(l.getTime()) || isNaN(a.getTime()) || l > a) return null
  let u = a.getFullYear() - l.getFullYear()
  const m = a.getMonth() - l.getMonth()
  if (m < 0 || (m === 0 && a.getDate() < l.getDate())) u--
  return u
}

/** Umur dalam bulan penuh (untuk balita 1 - <2 th dsb.). */
export function hitungUmurBulan(tglLahir: string, acuan: string): number | null {
  if (!tglLahir) return null
  const l = new Date(tglLahir + 'T00:00:00')
  const a = new Date(acuan + 'T00:00:00')
  if (isNaN(l.getTime()) || l > a) return null
  let b = (a.getFullYear() - l.getFullYear()) * 12 + (a.getMonth() - l.getMonth())
  if (a.getDate() < l.getDate()) b--
  return b
}

export const aktif = (w: Warga) => !w.deletedAt && w.statusWarga === 'Aktif'
export const isKepala = (w: Warga) => /kepala/i.test(w.statusKeluarga)

/** R2 — Penduduk 15–59 th yang ikut PKK */
export function isPenduduk1559(w: Warga, acuan: string) {
  const u = hitungUmur(w.tglLahir, acuan)
  return u !== null && u >= 15 && u <= 59 && w.ikutPKK
}

/** R3 — WUS: perempuan 15–49 th, ikut PKK */
export function isWUS(w: Warga, acuan: string) {
  const u = hitungUmur(w.tglLahir, acuan)
  return w.jk === 'P' && u !== null && u >= 15 && u <= 49 && w.ikutPKK
}

/** R4 — PUS: istri, kawin tercatat, umur ≤ 49, ikut PKK */
export function isPUS(w: Warga, acuan: string) {
  const u = hitungUmur(w.tglLahir, acuan)
  return /istri/i.test(w.statusKeluarga) && w.statusKawin === 'Kawin Tercatat' && u !== null && u <= 49 && w.ikutPKK
}

export function kelompokUmurPUS(u: number | null): '<15' | '15-19' | '20-34' | '35-49' | null {
  if (u === null) return null
  if (u < 15) return '<15'
  if (u <= 19) return '15-19'
  if (u <= 34) return '20-34'
  if (u <= 49) return '35-49'
  return null
}

export function isBalita(w: Warga, acuan: string, s: Pick<Settings, 'umurBalita'>) {
  const u = hitungUmur(w.tglLahir, acuan)
  return u !== null && u < s.umurBalita
}

export function isLansia(w: Warga, acuan: string, s: Pick<Settings, 'umurLansia'>) {
  const u = hitungUmur(w.tglLahir, acuan)
  return u !== null && u >= s.umurLansia
}

/** R7 — status ibu untuk tampilan (prioritas Hamil > Melahirkan > Nifas > Menyusui) */
export function statusIbu(w: Warga): string {
  if (w.hamil) return 'Hamil'
  if (w.melahirkan) return 'Melahirkan'
  if (w.nifas) return 'Nifas'
  if (w.menyusui) return 'Menyusui'
  return ''
}

/** R6 — nama suami = kepala keluarga laki-laki / suami dalam KK yang sama */
export function namaSuami(w: Warga, semua: Warga[]): string {
  if (!w.noKK) return ''
  const kk = semua.filter((x) => x.noKK === w.noKK && x.id !== w.id && !x.deletedAt)
  const s = kk.find((x) => /suami/i.test(x.statusKeluarga)) ?? kk.find((x) => isKepala(x) && x.jk === 'L')
  return s?.nama ?? ''
}

/** R11 — pemetaan pendidikan ke kelompok Kampung KB */
export function kelompokPendidikan(p: string): string {
  const s = p.toLowerCase()
  if (!s || s.includes('tidak / belum')) return 'TDK SEKOLAH'
  if (s.includes('belum tamat sd')) return 'TIDAK LULUS SD'
  if (s.includes('sd')) return 'SD'
  if (s.includes('sltp')) return 'SLTP'
  if (s.includes('slta')) return 'SLTA'
  return 'PERGURUAN TINGGI'
}

/** Ekstrak saran tanggal lahir & JK dari NIK (digit 7–12: DDMMYY, perempuan DD+40). */
export function infoDariNIK(nik: string): { tglLahir: string; jk: 'L' | 'P' } | null {
  if (!/^\d{16}$/.test(nik)) return null
  let dd = parseInt(nik.slice(6, 8), 10)
  const mm = parseInt(nik.slice(8, 10), 10)
  const yy = parseInt(nik.slice(10, 12), 10)
  const jk: 'L' | 'P' = dd > 40 ? 'P' : 'L'
  if (dd > 40) dd -= 40
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null
  const nowYY = new Date().getFullYear() % 100
  const yyyy = yy > nowYY ? 1900 + yy : 2000 + yy
  return { tglLahir: `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, jk }
}

export function hariMenujuHPL(hpl: string, acuan: string): number | null {
  if (!hpl) return null
  const d = (new Date(hpl).getTime() - new Date(acuan).getTime()) / 86400000
  return Math.round(d)
}
