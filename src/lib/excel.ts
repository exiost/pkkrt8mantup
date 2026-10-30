import * as XLSX from 'xlsx'
import type { Kelahiran, Kematian, Keluarga, Warga, ItemIRT, ItemPekarangan, JK, YT } from './types'
import { blankKeluarga, blankWarga } from './factories'
import { uid } from './format'

const col = (letter: string) => XLSX.utils.decode_col(letter)
const s = (x: unknown) => (x === null || x === undefined ? '' : String(x).replace(/\s+/g, ' ').trim())
const cap = (x: string) => x.replace(/\b\w/g, (c) => c.toUpperCase())

/** "Ya", "ya ", "YA" → Ya; "Tidak ", "tidak" → Tidak; kosong → '' */
export function yt(x: unknown): YT {
  const t = s(x).toLowerCase()
  if (!t || t === '0') return ''
  if (t === 'tidak' || t === 'tdk' || t === 't') return 'Tidak'
  return 'Ya'
}

function tgl(x: unknown): string {
  if (!x) return ''
  if (x instanceof Date) {
    const d = new Date(x.getTime() + 12 * 3600 * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  if (typeof x === 'number') {
    const p = XLSX.SSF.parse_date_code(x)
    return p ? `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}` : ''
  }
  const t = s(x)
  const m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : ''
}

const jk = (x: unknown): JK => (/^p/i.test(s(x)) ? 'P' : 'L')

function statusKeluarga(x: unknown) {
  const t = s(x).toLowerCase()
  if (t.includes('kepala')) return 'Kepala Keluarga'
  if (!t) return ''
  return cap(t)
}

/** "Cabe, 2 pot; Pandan, 1 pot;" → item (logika makro TampilkanDataHT_IRT) */
export function uraiPekarangan(teks: string, kategori: string): ItemPekarangan[] {
  return teks
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((item) => {
      const i = item.indexOf(',')
      return i > 0
        ? { kategori, komoditi: item.slice(0, i).trim(), jumlah: item.slice(i + 1).trim() }
        : { kategori, komoditi: item, jumlah: '' }
    })
}

export function uraiIRT(kat: string, kom: string, vol: string): ItemIRT[] {
  const split = (t: string) => t.split(';').map((x) => x.trim().replace(/,$/, '').trim()).filter(Boolean)
  const a = split(kat), b = split(kom), c = split(vol)
  const n = Math.max(a.length, b.length, c.length)
  return Array.from({ length: n }, (_, i) => ({ kategori: a[i] ?? '', komoditi: b[i] ?? '', volume: c[i] ?? '' }))
}

type WithMeta<T> = T & { createdAt: string; updatedAt: string }
export interface HasilImpor {
  warga: WithMeta<Warga>[]
  keluarga: WithMeta<Keluarga>[]
  kelahiran: WithMeta<Kelahiran>[]
  kematian: WithMeta<Kematian>[]
  dasawisma: string[]
  peringatan: string[]
}

export function imporExcel(buf: ArrayBuffer): HasilImpor {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws = wb.Sheets['DATA WARGA']
  if (!ws) throw new Error('Sheet "DATA WARGA" tidak ditemukan di file ini.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' })
  const now = new Date().toISOString()
  const peringatan: string[] = []
  const warga: WithMeta<Warga>[] = []
  const keluarga: WithMeta<Keluarga>[] = []
  const dws = new Set<string>()
  const nikSeen = new Map<string, number>()
  const KAT_PEKARANGAN = ['BW', 'BX', 'BY', 'BZ', 'CA', 'CB']
  const header = (rows[0] ?? []) as unknown[]

  // Keluarga = baris-baris di bawah satu "Kepala Keluarga" sampai baris berikutnya yang kolom B-nya berisi angka
  // (sama dengan kolom DE / ID_Keluarga_Dawis yang diisi makro).
  let fam: WithMeta<Keluarga> | null = null
  let famHasKepala = new Map<string, boolean>()

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[]
    const g = (L: string) => row[col(L)]
    const nama = s(g('E'))
    if (!nama) continue
    const baris = r + 1
    const nomorB = s(g('B'))
    const w = { ...blankWarga(), id: uid(), createdAt: now, updatedAt: now, deletedAt: null } as WithMeta<Warga>
    w.urut = warga.length + 1
    w.noReg = Number(s(g('A'))) || warga.length + 1
    w.noKK = s(g('C')).replace(/\D/g, '')
    w.nik = s(g('D')).replace(/\D/g, '')
    w.nama = nama
    w.jk = jk(g('F'))
    w.tempatLahir = s(g('G'))
    w.tglLahir = tgl(g('H'))
    w.agama = s(g('I'))
    w.pendidikan = s(g('J'))
    w.pekerjaan = s(g('K'))
    w.golDarah = s(g('L')).toUpperCase()
    w.statusKawin = s(g('M'))
    w.tglNikahCerai = tgl(g('N'))
    w.statusKeluarga = statusKeluarga(g('O'))
    w.catatan = s(g('P'))
    w.ikutPKK = !/tidak ikut/i.test(s(g('Q')))
    w.kontrasepsi = s(g('R'))
    w.riwayatSakit = s(g('S'))
    w.ppp = yt(g('T'))
    w.kegiatanDiikuti = s(g('U')).replace(/,\s*$/, '')
    w.kerjaBakti = yt(g('V'))
    w.kerjaBaktiJenis = s(g('W'))
    w.rukunKematian = yt(g('X'))
    w.rukunKematianJenis = s(g('Y'))
    w.keagamaan = yt(g('Z'))
    w.keagamaanJenis = s(g('AA'))
    w.jimpitan = yt(g('AB'))
    w.arisan = yt(g('AG'))
    w.barkas = yt(g('AH'))
    w.apotekHidup = yt(g('AI'))
    w.alamat = s(g('AJ'))
    w.desa = s(g('AK'))
    w.kecamatan = s(g('AL'))
    w.kabupaten = s(g('AM'))
    w.provinsi = s(g('AN'))
    w.dasawisma = s(g('AV'))
    w.dusun = s(g('AW'))
    w.up2k = yt(g('BA'))
    w.jenisUp2k = s(g('BB'))
    w.jumantik = yt(g('BC'))
    w.jabatan = s(g('BD')) || 'Anggota'
    w.hamil = /hamil/i.test(s(g('BE')))
    w.hamilKe = s(g('BF'))
    w.melahirkan = s(g('BG')) !== ''
    w.menyusui = /menyusui|ya/i.test(s(g('BH')))
    w.nifas = s(g('BI')) !== ''
    w.hpl = tgl(g('BJ'))
    w.tigaButa = s(g('BU')) !== ''
    w.berkebutuhanKhusus = s(g('BV'))
    w.posyandu = yt(g('CC'))
    w.frekPosyandu = s(g('CD'))
    w.bkb = yt(g('CE'))
    w.tabungan = yt(g('CF'))
    w.kelompokBelajar = yt(g('CG'))
    w.paket = ['CH', 'CI', 'CJ', 'CK'].filter((L) => yt(g(L)) === 'Ya').map((L) => s(header[col(L)]))
    w.paud = yt(g('CL'))
    w.koperasi = yt(g('CM'))
    w.jenisKoperasi = s(g('CN'))
    w.pendidikanKetrampilan = yt(g('CO'))
    w.perencanaanSehat = yt(g('CP'))
    w.sandang = yt(g('CQ'))
    w.pekarangan = KAT_PEKARANGAN.flatMap((L) => uraiPekarangan(s(g(L)), s(header[col(L)]) || L))
    w.irt = uraiIRT(s(g('CS')), s(g('CT')), s(g('CU')))

    // ----- keluarga (ID keluarga) -----
    if (nomorB !== '' || !fam) {
      fam = { ...blankKeluarga(), id: uid(), createdAt: now, updatedAt: now, deletedAt: null, nomor: Number(nomorB) || keluarga.length + 1 } as WithMeta<Keluarga>
      keluarga.push(fam)
      // data rumah & sanitasi dari baris kepala keluarga (baris pertama keluarga)
      fam.sumberAir = s(g('AO'))
      fam.spal = yt(g('AP'))
      fam.kamarMandi = s(g('AQ'))
      fam.jumlahWC = s(g('AR'))
      fam.makananPokok = s(g('AT'))
      fam.kriteriaRumah = s(g('AX'))
      fam.rumahSehat = s(g('AY'))
      fam.tps = s(g('AZ'))
    }
    w.keluargaId = fam.id
    if (/kepala/i.test(w.statusKeluarga)) famHasKepala.set(fam.id, true)

    if (w.dasawisma) dws.add(w.dasawisma)
    if (w.dasawisma === 'Drupadi') peringatan.push(`Baris ${baris} (${nama}): dasawisma hanya "Drupadi" tanpa I/II — perbaiki lewat Ubah Massal.`)
    if (!w.noKK) peringatan.push(`Baris ${baris} (${nama}): No KK kosong.`)
    if (w.nik && w.nik.length !== 16) peringatan.push(`Baris ${baris} (${nama}): NIK tidak 16 digit.`)
    if (!w.tglLahir) peringatan.push(`Baris ${baris} (${nama}): tanggal lahir kosong/tidak terbaca.`)
    if (w.nik) {
      if (nikSeen.has(w.nik)) peringatan.push(`Baris ${baris} (${nama}): NIK sama dengan baris ${nikSeen.get(w.nik)}.`)
      else nikSeen.set(w.nik, baris)
    }
    warga.push(w)
  }
  for (const k of keluarga) if (!famHasKepala.get(k.id)) peringatan.push(`Keluarga nomor ${k.nomor}: tidak ada anggota berstatus "Kepala Keluarga".`)

  // ----- sheet "bayi lahir" -> Kelahiran & Kematian -----
  const kelahiran: WithMeta<Kelahiran>[] = []
  const kematian: WithMeta<Kematian>[] = []
  const wsB = wb.Sheets['bayi lahir '] ?? wb.Sheets['bayi lahir']
  if (wsB) {
    const rb = XLSX.utils.sheet_to_json<unknown[]>(wsB, { header: 1, raw: true, defval: '' })
    for (const row of rb.slice(1)) {
      const g = (L: string) => (row as unknown[])[col(L)]
      const meta = { id: uid(), createdAt: now, updatedAt: now, deletedAt: null }
      if (s(g('G')))
        kelahiran.push({ ...meta, dasawisma: s(g('A')), namaIbu: s(g('B')), namaSuami: s(g('C')), namaBayi: s(g('G')), jk: yt(g('I')) === 'Ya' ? 'P' : 'L', tglLahir: tgl(g('J')), akte: yt(g('K')) === 'Ya', keterangan: s(g('U')) })
      ;([['L', 'Ibu'], ['M', 'Balita'], ['N', 'Bayi']] as const).forEach(([L, kategori]) => {
        if (s(g(L))) kematian.push({ ...meta, id: uid(), kategori, dasawisma: s(g('A')), nama: s(g(L)), namaIbu: s(g('B')), jk: jk(g('R')), tgl: tgl(g('S')), sebab: s(g('T')), keterangan: s(g('U')) })
      })
    }
  }

  return { warga, keluarga, kelahiran, kematian, dasawisma: [...dws], peringatan }
}

/** Ekspor ke .xlsx dengan nama kolom seperti sheet DATA WARGA lama (+ nomor keluarga) */
export function eksporWarga(warga: Warga[], keluarga: Keluarga[]) {
  const kk = new Map(keluarga.map((k) => [k.id, k]))
  const data = [...warga].sort((a, b) => a.urut - b.urut).map((w) => {
    const k = kk.get(w.keluargaId)
    const kepala = /kepala/i.test(w.statusKeluarga)
    return {
      NO: w.noReg, 'Nomor Urut ': kepala ? k?.nomor ?? '' : '', 'No Kartu Keluarga': w.noKK, NIK: w.nik, 'Nama Lengkap': w.nama,
      'Jenis Kelamin': w.jk === 'L' ? 'Laki - Laki' : 'Perempuan', 'Tempat Lahir': w.tempatLahir, 'Tanggal Lahir': w.tglLahir, Agama: w.agama,
      Pendidikan: w.pendidikan, Pekerjaan: w.pekerjaan, 'Gol Dar': w.golDarah, 'Status Perkawinan': w.statusKawin, 'Nikah/ Cerai': w.tglNikahCerai,
      'Status Dalam Keluarga': w.statusKeluarga, Catatan: w.catatan, 'Kegiatan PKK': w.ikutPKK ? '' : 'Tidak Ikut PKK', Kontrasepsi: w.kontrasepsi,
      'Riwayat Sakit': w.riwayatSakit, PPP: w.ppp, 'kegiatan yang diikuti': w.kegiatanDiikuti, 'Kerja Bakti': w.kerjaBakti, Jenis: w.kerjaBaktiJenis,
      'Rukun Kematian': w.rukunKematian, 'jenis ': w.rukunKematianJenis, Keagamaan: w.keagamaan, 'Jenis  ': w.keagamaanJenis, Jimpitan: w.jimpitan,
      Arisan: w.arisan, barkas: w.barkas, 'Apotek Hidup': w.apotekHidup, 'Alamat ': w.alamat, Desa: w.desa, Kecamatan: w.kecamatan, Kabupaten: w.kabupaten,
      Provinsi: w.provinsi, 'Sumber Air': k?.sumberAir ?? '', 'SPAL ': k?.spal ?? '', 'Kamar mandi': k?.kamarMandi ?? '', 'JUMlah wc': k?.jumlahWC ?? '',
      'makanan pokok': k?.makananPokok ?? '', Dasawisma: w.dasawisma, 'Dusun ': w.dusun, 'Kriteria Rumah u/ catatan kel': k?.kriteriaRumah ?? '',
      'Kriteria Rumah u/ data kel': k?.rumahSehat ?? '', TPS: k?.tps ?? '', UP2K: w.up2k, 'Jenis UP2K': w.jenisUp2k, Jumatik: w.jumantik, Jabatan: w.jabatan,
      'ibu hamil': w.hamil ? 'hamil' : '', 'hamil ke': w.hamilKe, 'ibu melahirkan': w.melahirkan ? 'ya' : '', 'ibu menyusui': w.menyusui ? 'ya' : '',
      'ibu nifas ': w.nifas ? 'ya' : '', hpl: w.hpl, '3 buta': w.tigaButa ? 'ya' : '', 'berkebutuhan khusus': w.berkebutuhanKhusus,
      Peternakan: w.pekarangan.filter((p) => /ternak/i.test(p.kategori)).map((p) => `${p.komoditi}, ${p.jumlah};`).join(' '),
      'Perikanan ': w.pekarangan.filter((p) => /ikan/i.test(p.kategori)).map((p) => `${p.komoditi}, ${p.jumlah};`).join(' '),
      'Warung Hidup': w.pekarangan.filter((p) => /warung/i.test(p.kategori)).map((p) => `${p.komoditi}, ${p.jumlah};`).join(' '),
      Toga: w.pekarangan.filter((p) => /toga/i.test(p.kategori)).map((p) => `${p.komoditi}, ${p.jumlah};`).join(' '),
      'Tanaman Buah': w.pekarangan.filter((p) => /buah/i.test(p.kategori)).map((p) => `${p.komoditi}, ${p.jumlah};`).join(' '),
      'Tanaman lain lain': w.pekarangan.filter((p) => /lain/i.test(p.kategori)).map((p) => `${p.komoditi}, ${p.jumlah};`).join(' '),
      'Aktif Dalam Posyandu (Ibu dan Anak )': w.posyandu, 'frekuensi posyandu ': w.frekPosyandu, 'Bina Keluarga Balita (Ibu saja )': w.bkb,
      'memiliki Tabungan (84)': w.tabungan, 'Mengikuti Kelompok Belajar': w.kelompokBelajar, 'Paket A': w.paket.includes('Paket A') ? 'Ya' : '',
      'Paket B': w.paket.includes('Paket B') ? 'Ya' : '', 'Paket C': w.paket.includes('Paket C') ? 'Ya' : '', KF: w.paket.includes('KF') ? 'Ya' : '',
      'Mengikuti PAUD/ Sejenis': w.paud, 'ikut dalam keg koperasi ': w.koperasi, 'Jenis Koperasi (92)': w.jenisKoperasi, 'Pendidikan Ketrampilan': w.pendidikanKetrampilan,
      'Perencanaan Sehat': w.perencanaanSehat, 'Sandang cat keluarga': w.sandang,
      'IRT kategori': w.irt.map((x) => x.kategori).join('; '), 'IRT Komoditi': w.irt.map((x) => x.komoditi).join('; '), 'IRT Volume ': w.irt.map((x) => x.volume).join('; '),
      'Status Warga': w.statusWarga,
    }
  })
  const wsOut = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsOut, 'DATA WARGA')
  XLSX.writeFile(wb, `Data_Warga_RT08_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

/** Ekspor tabel HTML laporan ke .xlsx */
export function eksporTabel(el: HTMLElement, nama: string) {
  const wb = XLSX.utils.book_new()
  const tables = el.querySelectorAll('table')
  tables.forEach((t, i) => XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(t), `Tabel ${i + 1}`.slice(0, 31)))
  if (!tables.length) return false
  XLSX.writeFile(wb, `${nama.replace(/[^\w -]/g, '')}.xlsx`)
  return true
}
