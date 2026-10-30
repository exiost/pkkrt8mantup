import type { Keluarga, Settings, Warga } from './types'

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

/** Umur dalam bulan penuh. */
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
export const isYa = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'ya'

/** AD — Penduduk 15–59 th (ikut PKK) */
export function isPenduduk1559(w: Warga, acuan: string) {
  const u = hitungUmur(w.tglLahir, acuan)
  return u !== null && u >= 15 && u <= 59 && w.ikutPKK
}

/** AE — WUS: perempuan 15–49 th, ikut PKK */
export function isWUS(w: Warga, acuan: string) {
  const u = hitungUmur(w.tglLahir, acuan)
  return w.jk === 'P' && u !== null && u >= 15 && u <= 49 && w.ikutPKK
}

/** AF — PUS: istri, kawin tercatat, umur ≤ 49, ikut PKK */
export function isPUS(w: Warga, acuan: string) {
  const u = hitungUmur(w.tglLahir, acuan)
  return /^istri$/i.test(w.statusKeluarga.trim()) && w.statusKawin === 'Kawin Tercatat' && u !== null && u <= 49 && w.ikutPKK
}

export function kelompokUmurPUS(u: number | null): '<15' | '15-19' | '20-34' | '35-49' | null {
  if (u === null) return null
  if (u < 15) return '<15'
  if (u <= 19) return '15-19'
  if (u <= 34) return '20-34'
  if (u <= 49) return '35-49'
  return null
}

/** Balita: lahir setelah (acuan − 5 tahun) dan ≤ acuan */
export function isBalita(w: Warga, acuan: string, s: Pick<Settings, 'umurBalita'>) {
  const u = hitungUmur(w.tglLahir, acuan)
  return u !== null && u < s.umurBalita
}

/** Lansia: di Excel = umur ≥ 50 (EDATE(acuan, -600)) */
export function isLansia(w: Warga, acuan: string, s: Pick<Settings, 'umurLansia'>) {
  const u = hitungUmur(w.tglLahir, acuan)
  return u !== null && u >= s.umurLansia
}

/** Status ibu untuk tampilan (prioritas Hamil > Melahirkan > Nifas > Menyusui) */
export function statusIbu(w: Warga): string {
  if (w.hamil) return 'Hamil'
  if (w.melahirkan) return 'Melahirkan'
  if (w.nifas) return 'Nifas'
  if (w.menyusui) return 'Menyusui'
  return ''
}

/** "YYYY-MM" dari tahun & bulan (0–11) */
export const ymOf = (tahun: number, bulan: number) => `${tahun}-${String(bulan + 1).padStart(2, '0')}`

export interface FlagIbu { hamil: boolean; melahirkan: boolean; nifas: boolean; menyusui: boolean }

/**
 * Status ibu yang DILAPORKAN pada bulan `ym` (YYYY-MM).
 * Bila ibu punya catatan per bulan, hanya catatan itu yang dipakai (bulan tanpa catatan = tidak dilaporkan,
 * dan "tetap hamil" membuat yang sudah melahirkan SC tetap tertulis Hamil). Tanpa catatan: pakai saklar biasa.
 */
export function statusIbuPada(w: Warga, ym: string): FlagIbu {
  const r = w.riwayatIbu
  if (!r?.length) return { hamil: w.hamil, melahirkan: w.melahirkan, nifas: w.nifas, menyusui: w.menyusui }
  if (ym.includes('~')) { const [a, b] = ym.split('~'); return statusIbuRentang(w, a, b) }
  const e = r.find((x) => x.bulan === ym)
  const s = e ? (e.tetapHamil ? 'Hamil' : e.status) : ''
  return { hamil: s === 'Hamil', melahirkan: s === 'Melahirkan', nifas: s === 'Nifas', menyusui: s === 'Menyusui' }
}

/**
 * Laporan RENTANG BULAN (mis. Januari–Desember = tahunan): seorang ibu dihitung di setiap status yang pernah
 * ia alami dalam rentang itu (hamil, melahirkan, nifas, menyusui bisa sekaligus). "Tetap dilaporkan hamil" ikut menghitung Hamil.
 */
export function statusIbuRentang(w: Warga, dari: string, sampai: string): FlagIbu {
  const r = w.riwayatIbu
  if (!r?.length) return { hamil: w.hamil, melahirkan: w.melahirkan, nifas: w.nifas, menyusui: w.menyusui }
  const o: FlagIbu = { hamil: false, melahirkan: false, nifas: false, menyusui: false }
  for (const e of r) {
    if (e.bulan < dari || e.bulan > sampai) continue
    if (e.status === 'Hamil' || e.tetapHamil) o.hamil = true
    if (e.status === 'Melahirkan') o.melahirkan = true
    if (e.status === 'Nifas') o.nifas = true
    if (e.status === 'Menyusui') o.menyusui = true
  }
  return o
}

/** Anggota satu keluarga (ID keluarga sama), urut seperti di DATA WARGA */
export function anggotaKeluarga(keluargaId: string, semua: Warga[]): Warga[] {
  return semua.filter((x) => x.keluargaId === keluargaId && !x.deletedAt).sort((a, b) => a.urut - b.urut)
}

export function kepalaKeluarga(keluargaId: string, semua: Warga[]): Warga | undefined {
  const a = anggotaKeluarga(keluargaId, semua)
  return a.find(isKepala) ?? a[0]
}

/** Nama suami = kepala keluarga dalam keluarga yang sama (rumus LOOKUP kepala terdekat di atas) */
export function namaSuami(w: Warga, semua: Warga[]): string {
  if (!w.keluargaId) return ''
  const k = anggotaKeluarga(w.keluargaId, semua).find(isKepala)
  return k && k.id !== w.id ? k.nama : (k ? '-' : '-')
}

/** Jumlah KK dalam satu keluarga = 1, jadi 2 jika ada anggota dengan No KK berbeda (rumus E13 "Data Keluarga") */
export function jumlahKK(anggota: Warga[]): number {
  if (!anggota.length) return 0
  const first = anggota[0].noKK
  return 1 + (anggota.slice(1).some((w) => w.noKK !== first) ? 1 : 0)
}

export function keluargaOf(w: Warga, keluarga: Keluarga[]): Keluarga | undefined {
  return keluarga.find((k) => k.id === w.keluargaId && !k.deletedAt)
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
