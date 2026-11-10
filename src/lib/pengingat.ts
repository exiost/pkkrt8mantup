/** Pengingat bulan ini / tahun ini (HPL, genap 1/15/17 th, usia sekolah, usia lansia) — dipakai Beranda RT & Beranda Desa */
import type { Warga } from './types'

export interface Pengingat { kode: string; judul: string; warna: string; list: Warga[]; info: (w: Warga) => string }

export function buatPengingat(warga: Warga[], acuan: string, umurLansia: number): Pengingat[] {
  const aktif = warga.filter((w) => !w.deletedAt && w.statusWarga === 'Aktif')
  const now = new Date(acuan + 'T00:00:00')
  const th = now.getFullYear(), bl = now.getMonth()
  const lahir = (w: Warga) => (w.tglLahir ? new Date(w.tglLahir + 'T00:00:00') : null)
  const genap = (n: number, bulanSaja: boolean) => aktif.filter((w) => { const d = lahir(w); return !!d && th - d.getFullYear() === n && (!bulanSaja || d.getMonth() === bl) })
  const tanpa = () => ''
  return [
    { kode: 'hpl', judul: 'Perkiraan lahir (HPL) bulan ini', warna: 'fuchsia', list: aktif.filter((w) => w.hamil && w.hpl && Number(w.hpl.slice(0, 4)) === th && Number(w.hpl.slice(5, 7)) - 1 === bl), info: (w: Warga) => w.hpl.split('-').reverse().join('/') },
    { kode: '1th', judul: 'Genap 1 tahun bulan ini (imunisasi / posyandu)', warna: 'sky', list: genap(1, true), info: tanpa },
    { kode: '15th', judul: 'Genap 15 tahun bulan ini (masuk WUS)', warna: 'pink', list: genap(15, true).filter((w) => w.jk === 'P'), info: tanpa },
    { kode: '17th', judul: 'Genap 17 tahun bulan ini (bisa buat KTP)', warna: 'violet', list: genap(17, true), info: tanpa },
    { kode: 'sekolah', judul: 'Masuk usia sekolah (7 tahun) tahun ini', warna: 'emerald', list: genap(7, false), info: tanpa },
    { kode: 'lansia', judul: `Masuk usia lansia (${umurLansia} tahun) tahun ini`, warna: 'orange', list: genap(umurLansia, false), info: tanpa },
  ].filter((x) => x.list.length > 0)
}
