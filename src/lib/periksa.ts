/**
 * Pemeriksa data otomatis: mencari isian yang janggal / kurang di satu RT
 * (NIK, tanggal lahir, keluarga, dasawisma, status kawin, status ibu).
 * Hanya memberi tahu — tidak mengubah data apa pun.
 */
import type { Dasawisma, Keluarga, Warga } from './types'
import { hitungUmur, isKepala } from './rules'

export type Tingkat = 'penting' | 'periksa'
export interface Temuan {
  kode: string
  judul: string
  tingkat: Tingkat
  /** warga yang bermasalah (atau kepala keluarga untuk temuan keluarga) */
  wargaId?: string
  keluargaId?: string
  nama: string
  pesan: string
}

const digit = (s: string | undefined) => (s ?? '').replace(/\D/g, '')

export function periksaData(warga: Warga[], keluarga: Keluarga[], dasawisma: Dasawisma[], acuan: string): Temuan[] {
  const out: Temuan[] = []
  const aktif = warga.filter((w) => !w.deletedAt && w.statusWarga === 'Aktif')
  const kel = new Map(keluarga.filter((k) => !k.deletedAt).map((k) => [k.id, k]))
  const dws = new Set(dasawisma.filter((d) => !d.deletedAt).map((d) => d.nama.trim().toLowerCase()))
  const tambah = (t: Omit<Temuan, 'nama'> & { w?: Warga; nama?: string }) => {
    const { w, ...rest } = t
    out.push({ ...rest, wargaId: t.wargaId ?? w?.id, nama: t.nama ?? w?.nama ?? '' })
  }

  // --- NIK ---
  const perNik = new Map<string, Warga[]>()
  for (const w of aktif) {
    const n = digit(w.nik)
    if (!n) tambah({ kode: 'nik-kosong', judul: 'NIK belum diisi', tingkat: 'periksa', w, pesan: 'NIK kosong' })
    else if (n.length !== 16) tambah({ kode: 'nik-panjang', judul: 'NIK tidak 16 angka', tingkat: 'penting', w, pesan: `NIK ${w.nik} (${n.length} angka)` })
    else (perNik.get(n) ?? perNik.set(n, []).get(n)!).push(w)
  }
  for (const [n, ws] of perNik) if (ws.length > 1) for (const w of ws) tambah({ kode: 'nik-ganda', judul: 'NIK sama dipakai lebih dari satu warga', tingkat: 'penting', w, pesan: `NIK ${n} juga dipakai ${ws.filter((x) => x !== w).map((x) => x.nama).join(', ')}` })

  // --- tanggal lahir ---
  for (const w of aktif) {
    const u = hitungUmur(w.tglLahir, acuan)
    if (!w.tglLahir) tambah({ kode: 'lahir-kosong', judul: 'Tanggal lahir belum diisi', tingkat: 'penting', w, pesan: 'Umur tidak bisa dihitung, warga tidak masuk laporan umur (WUS, PUS, balita, lansia)' })
    else if (w.tglLahir > acuan) tambah({ kode: 'lahir-depan', judul: 'Tanggal lahir di masa depan', tingkat: 'penting', w, pesan: `Lahir ${w.tglLahir}` })
    else if (u !== null && u > 110) tambah({ kode: 'lahir-tua', judul: 'Umur lebih dari 110 tahun', tingkat: 'periksa', w, pesan: `Umur ${u} tahun (lahir ${w.tglLahir})` })
  }

  // --- keluarga ---
  const anggota = new Map<string, Warga[]>()
  for (const w of aktif) {
    if (!w.keluargaId || !kel.has(w.keluargaId)) tambah({ kode: 'tanpa-keluarga', judul: 'Belum masuk keluarga', tingkat: 'penting', w, pesan: 'Tidak terhitung di Data Keluarga / Catatan Keluarga / Rekap KK' })
    else (anggota.get(w.keluargaId) ?? anggota.set(w.keluargaId, []).get(w.keluargaId)!).push(w)
  }
  for (const [kid, ws] of anggota) {
    const k = kel.get(kid)!
    const kepala = ws.filter(isKepala)
    if (kepala.length === 0) tambah({ kode: 'tanpa-kepala', judul: 'Keluarga tanpa kepala keluarga', tingkat: 'penting', keluargaId: kid, w: ws[0], nama: `Keluarga no. ${k.nomor}`, pesan: `Anggota: ${ws.map((x) => x.nama).join(', ')}` })
    if (kepala.length > 1) tambah({ kode: 'kepala-ganda', judul: 'Lebih dari satu kepala keluarga', tingkat: 'penting', keluargaId: kid, w: kepala[0], nama: `Keluarga no. ${k.nomor}`, pesan: `Kepala: ${kepala.map((x) => x.nama).join(', ')}` })
    // anak lebih tua / hampir seumur dengan orang tuanya
    const ortu = ws.filter((x) => isKepala(x) || /^(istri|suami)$/i.test(x.statusKeluarga)).map((x) => hitungUmur(x.tglLahir, acuan)).filter((x): x is number => x !== null)
    if (ortu.length) {
      const termuda = Math.min(...ortu)
      for (const a of ws.filter((x) => /^anak$/i.test(x.statusKeluarga))) {
        const ua = hitungUmur(a.tglLahir, acuan)
        if (ua !== null && ua > termuda - 12) tambah({ kode: 'anak-tua', judul: 'Umur anak tidak wajar dibanding orang tua', tingkat: 'periksa', w: a, keluargaId: kid, pesan: `Anak ${ua} th, orang tua termuda ${termuda} th — cek tanggal lahir / status dalam keluarga` })
      }
    }
  }

  // --- dasawisma ---
  for (const w of aktif) {
    if (!w.ikutPKK) continue
    if (!w.dasawisma?.trim()) tambah({ kode: 'dawis-kosong', judul: 'Dasawisma belum diisi', tingkat: 'periksa', w, pesan: 'Tidak masuk rekap per dasawisma' })
    else if (!dws.has(w.dasawisma.trim().toLowerCase())) tambah({ kode: 'dawis-tak-ada', judul: 'Dasawisma tidak terdaftar', tingkat: 'periksa', w, pesan: `"${w.dasawisma}" tidak ada di daftar Dasawisma (Pengaturan → Dasawisma)` })
  }

  // --- status kawin & keluarga ---
  for (const w of aktif) {
    const u = hitungUmur(w.tglLahir, acuan)
    if (/^(istri|suami)$/i.test(w.statusKeluarga) && /belum kawin/i.test(w.statusKawin)) tambah({ kode: 'kawin-istri', judul: 'Istri/suami tetapi "Belum Kawin"', tingkat: 'periksa', w, pesan: `Status dalam keluarga ${w.statusKeluarga}, status kawin ${w.statusKawin}` })
    if (u !== null && u < 15 && /kawin/i.test(w.statusKawin) && !/belum/i.test(w.statusKawin)) tambah({ kode: 'kawin-muda', judul: 'Berstatus kawin di bawah 15 tahun', tingkat: 'periksa', w, pesan: `Umur ${u} th, ${w.statusKawin}` })
  }

  // --- status ibu ---
  for (const w of aktif) {
    const u = hitungUmur(w.tglLahir, acuan)
    const ibu = w.hamil || w.melahirkan || w.nifas || w.menyusui
    if (ibu && w.jk === 'L') tambah({ kode: 'ibu-laki', judul: 'Status ibu pada laki-laki', tingkat: 'penting', w, pesan: 'Laki-laki ditandai hamil/melahirkan/nifas/menyusui' })
    else if (w.hamil && u !== null && (u < 12 || u > 55)) tambah({ kode: 'hamil-umur', judul: 'Hamil di umur tidak wajar', tingkat: 'periksa', w, pesan: `Umur ${u} th` })
    if (w.hamil && w.hpl && w.hpl < acuan) tambah({ kode: 'hpl-lewat', judul: 'Masih hamil, padahal HPL sudah lewat', tingkat: 'periksa', w, pesan: `HPL ${w.hpl} — bila sudah melahirkan, ubah status ibu & catat kelahiran` })
  }
  return out
}

/** urutan tampilan: penting dulu */
export const urutTemuan = (xs: Temuan[]) => [...xs].sort((a, b) => Number(a.tingkat !== 'penting') - Number(b.tingkat !== 'penting') || a.judul.localeCompare(b.judul) || a.nama.localeCompare(b.nama))
