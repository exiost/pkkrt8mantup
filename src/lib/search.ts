import type { Tag, Warga } from './types'
import { BULAN } from './options'
import { hitungUmur } from './rules'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Semua isian warga yang bisa dicari (nama, tempat lahir, alamat, pekerjaan, tanggal, umur, dll.) dalam satu teks */
export function bahanCari(w: Warga, acuan: string, tags: Tag[]): string {
  const u = hitungUmur(w.tglLahir, acuan)
  const [y, m, d] = (w.tglLahir || '').split('-')
  const tgl = w.tglLahir ? `${d}/${m}/${y} ${w.tglLahir} ${Number(d)} ${BULAN[Number(m) - 1] ?? ''} ${y}` : ''
  const parts: (string | number | undefined)[] = [
    w.nama, w.nik, w.noKK, w.noReg, w.tempatLahir, tgl, u !== null ? `${u} tahun ${u} th umur ${u}` : '', w.jk === 'L' ? 'laki-laki laki pria l' : 'perempuan wanita p',
    w.agama, w.pendidikan, w.pekerjaan, w.golDarah, w.statusKawin, w.statusKeluarga, w.catatan, w.dasawisma, w.alamat, w.desa, w.kecamatan, w.kabupaten,
    w.provinsi, w.dusun, w.jabatan, w.kegiatanDiikuti, w.kontrasepsi, w.riwayatSakit, w.berkebutuhanKhusus, w.jenisKoperasi, w.jenisUp2k,
    w.kerjaBaktiJenis, w.keagamaanJenis, w.statusWarga, w.ikutPKK ? 'ikut pkk' : 'tidak ikut pkk', w.hamil ? 'hamil' : '', w.menyusui ? 'menyusui' : '', w.nifas ? 'nifas' : '',
    w.tigaButa ? '3 buta' : '', ...w.paket, ...w.pekarangan.flatMap((p) => [p.kategori, p.komoditi]), ...w.irt.flatMap((p) => [p.kategori, p.komoditi]),
    ...tags.filter((t) => w.tags.includes(t.id)).map((t) => t.nama),
  ]
  return norm(parts.filter((x) => x !== undefined && x !== '').join(' | '))
}

/** Pencarian banyak kata: semua kata harus ada (urutan bebas). Contoh: "sleman 1990", "buruh perempuan" */
export function cocok(bahan: string, q: string): boolean {
  const toks = norm(q).split(/\s+/).filter(Boolean)
  return toks.every((t) => bahan.includes(t))
}
