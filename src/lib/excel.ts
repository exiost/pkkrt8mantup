import * as XLSX from 'xlsx'
import type { Kelahiran, Keluarga, Warga, ItemIRT, ItemPekarangan, JK } from './types'
import { blankKeluarga, blankWarga } from './factories'
import { uid } from './format'

const col = (letter: string) => XLSX.utils.decode_col(letter)
const s = (x: unknown) => (x === null || x === undefined ? '' : String(x).replace(/\s+/g, ' ').trim())
const ya = (x: unknown) => /^(ya|ada|v|y|1)$/i.test(s(x))
const cap = (x: string) => x.replace(/\b\w/g, (c) => c.toUpperCase())

function tgl(x: unknown): string {
  if (!x) return ''
  if (x instanceof Date) {
    // SheetJS mengembalikan Date lokal; ambil komponen lokal agar tidak bergeser zona waktu
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

function jk(x: unknown): JK {
  return /^p/i.test(s(x)) ? 'P' : 'L'
}

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

type NoMetaW = Omit<Warga, 'createdAt' | 'updatedAt'>
type NoMetaK = Omit<Keluarga, 'createdAt' | 'updatedAt'>
type NoMetaL = Omit<Kelahiran, 'createdAt' | 'updatedAt'>

export interface HasilImpor {
  warga: NoMetaW[]
  keluarga: NoMetaK[]
  kelahiran: NoMetaL[]
  dasawisma: string[]
  peringatan: string[]
}

export function imporExcel(buf: ArrayBuffer): HasilImpor {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws = wb.Sheets['DATA WARGA']
  if (!ws) throw new Error('Sheet "DATA WARGA" tidak ditemukan di file ini.')
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' })
  const peringatan: string[] = []
  const warga: NoMetaW[] = []
  const kkMap = new Map<string, NoMetaK>()
  const dws = new Set<string>()
  const nikSeen = new Map<string, number>()
  const KAT_PEKARANGAN = ['BW', 'BX', 'BY', 'BZ', 'CA', 'CB']
  const header = (rows[0] ?? []) as unknown[]

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[]
    const g = (L: string) => row[col(L)]
    const nama = s(g('E'))
    if (!nama) continue
    const baris = r + 1
    const w = { ...blankWarga(), id: uid(), deletedAt: null } as NoMetaW
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
    w.ppp = ya(g('T'))
    w.kegiatanDiikuti = s(g('U')).replace(/,\s*$/, '')
    w.kerjaBakti = ya(g('V'))
    w.kerjaBaktiJenis = s(g('W'))
    w.rukunKematian = ya(g('X'))
    w.rukunKematianJenis = s(g('Y'))
    w.keagamaan = ya(g('Z'))
    w.keagamaanJenis = s(g('AA'))
    w.jimpitan = ya(g('AB'))
    w.arisan = ya(g('AG'))
    w.barkas = ya(g('AH'))
    w.apotekHidup = ya(g('AI'))
    w.alamat = s(g('AJ'))
    w.dasawisma = s(g('AV'))
    w.dusun = s(g('AW'))
    w.jumantik = ya(g('BC'))
    w.jabatan = s(g('BD')) || 'Anggota'
    w.hamil = /hamil|ya/i.test(s(g('BE')))
    w.hamilKe = s(g('BF'))
    w.melahirkan = ya(g('BG'))
    w.menyusui = ya(g('BH'))
    w.nifas = ya(g('BI'))
    w.hpl = tgl(g('BJ'))
    w.tigaButa = ya(g('BU'))
    w.berkebutuhanKhusus = ya(g('BV'))
    w.posyandu = ya(g('CC'))
    w.frekPosyandu = s(g('CD'))
    w.bkb = ya(g('CE'))
    w.tabungan = ya(g('CF'))
    w.kelompokBelajar = ya(g('CG'))
    w.jenisKelompokBelajar = ['CH', 'CI', 'CJ', 'CK'].filter((L) => ya(g(L))).map((L) => s(header[col(L)])).join(', ')
    w.paud = ya(g('CL'))
    w.koperasi = ya(g('CM'))
    w.jenisKoperasi = s(g('CN'))
    w.pendidikanKetrampilan = ya(g('CO'))
    w.perencanaanSehat = ya(g('CP'))
    w.sandang = ya(g('CQ'))
    w.pangan = s(g('AT')) !== ''
    w.pekarangan = KAT_PEKARANGAN.flatMap((L) => uraiPekarangan(s(g(L)), s(header[col(L)]) || L))
    w.irt = uraiIRT(s(g('CS')), s(g('CT')), s(g('CU')))

    if (w.dasawisma) dws.add(w.dasawisma)
    if (w.dasawisma === 'Drupadi') peringatan.push(`Baris ${baris} (${nama}): dasawisma hanya "Drupadi" tanpa I/II — silakan diperbaiki lewat Ubah Massal.`)
    if (!w.noKK) peringatan.push(`Baris ${baris} (${nama}): No KK kosong.`)
    if (w.nik && w.nik.length !== 16) peringatan.push(`Baris ${baris} (${nama}): NIK tidak 16 digit.`)
    if (!w.tglLahir) peringatan.push(`Baris ${baris} (${nama}): tanggal lahir kosong/tidak terbaca.`)
    if (w.nik) {
      if (nikSeen.has(w.nik)) peringatan.push(`Baris ${baris} (${nama}): NIK sama dengan baris ${nikSeen.get(w.nik)}.`)
      else nikSeen.set(w.nik, baris)
    }

    // data rumah per KK, diambil dari baris kepala keluarga (atau baris pertama)
    if (w.noKK && (!kkMap.has(w.noKK) || /kepala/i.test(w.statusKeluarga))) {
      const prev = kkMap.get(w.noKK)
      const k: NoMetaK = { ...blankKeluarga(), id: prev?.id ?? uid(), deletedAt: null }
      k.noKK = w.noKK
      k.dasawisma = w.dasawisma
      k.alamat = w.alamat
      k.sumberAir = s(g('AO')) || 'Sumur'
      k.spal = ya(g('AP'))
      k.kamarMandi = s(g('AQ')) !== '' && s(g('AQ')) !== '0'
      k.jumlahWC = s(g('AR')) || s(g('AQ'))
      k.mckSeptic = k.kamarMandi
      k.makananPokok = s(g('AT')) || 'Beras'
      k.kriteriaRumah = s(g('AX')) || 'Layak Huni'
      k.rumahSehat = s(g('AY')) || 'Sehat'
      k.tps = ya(g('AZ'))
      k.up2k = ya(g('BA'))
      k.jenisUp2k = s(g('BB'))
      kkMap.set(w.noKK, k)
    }
    warga.push(w)
  }

  for (const k of kkMap.values()) {
    if (!warga.some((w) => w.noKK === k.noKK && /kepala/i.test(w.statusKeluarga)))
      peringatan.push(`KK ${k.noKK}: tidak ada anggota berstatus "Kepala Keluarga".`)
  }

  const kelahiran: NoMetaL[] = []
  const wsB = wb.Sheets['bayi lahir '] ?? wb.Sheets['bayi lahir']
  if (wsB) {
    const rb = XLSX.utils.sheet_to_json<unknown[]>(wsB, { header: 1, raw: true, defval: '' })
    for (const row of rb.slice(1)) {
      const g = (L: string) => (row as unknown[])[col(L)]
      if (!s(g('G'))) continue
      kelahiran.push({
        id: uid(), deletedAt: null, dasawisma: s(g('A')), namaIbu: s(g('B')), namaSuami: s(g('C')), namaBayi: s(g('G')),
        jk: ya(g('I')) ? 'P' : 'L', tglLahir: tgl(g('J')), akte: ya(g('K')), keterangan: s(g('U')),
      })
    }
  }

  return { warga, keluarga: [...kkMap.values()], kelahiran, dasawisma: [...dws], peringatan }
}

/** Ekspor ke .xlsx dengan nama kolom seperti sheet DATA WARGA lama */
export function eksporWarga(warga: Warga[], keluarga: Keluarga[]) {
  const kk = new Map(keluarga.map((k) => [k.noKK, k]))
  const Y = (b: boolean) => (b ? 'Ya' : 'Tidak')
  const data = warga.map((w, i) => {
    const k = kk.get(w.noKK)
    return {
      NO: i + 1, 'No Kartu Keluarga': w.noKK, NIK: w.nik, 'Nama Lengkap': w.nama, 'Jenis Kelamin': w.jk === 'L' ? 'Laki - Laki' : 'Perempuan',
      'Tempat Lahir': w.tempatLahir, 'Tanggal Lahir': w.tglLahir, Agama: w.agama, Pendidikan: w.pendidikan, Pekerjaan: w.pekerjaan,
      'Gol Dar': w.golDarah, 'Status Perkawinan': w.statusKawin, 'Nikah/ Cerai': w.tglNikahCerai, 'Status Dalam Keluarga': w.statusKeluarga,
      Catatan: w.catatan, 'Kegiatan PKK': w.ikutPKK ? '' : 'Tidak Ikut PKK', Kontrasepsi: w.kontrasepsi, 'Riwayat Sakit': w.riwayatSakit,
      PPP: Y(w.ppp), 'kegiatan yang diikuti': w.kegiatanDiikuti, 'Kerja Bakti': Y(w.kerjaBakti), Jenis: w.kerjaBaktiJenis,
      'Rukun Kematian': Y(w.rukunKematian), Keagamaan: Y(w.keagamaan), 'Jenis Keagamaan': w.keagamaanJenis, Jimpitan: Y(w.jimpitan),
      Arisan: Y(w.arisan), barkas: Y(w.barkas), 'Apotek Hidup': Y(w.apotekHidup), Alamat: w.alamat, Dasawisma: w.dasawisma, Dusun: w.dusun,
      'Sumber Air': k?.sumberAir ?? '', SPAL: k ? Y(k.spal) : '', 'JUMlah wc': k?.jumlahWC ?? '', 'makanan pokok': k?.makananPokok ?? '',
      'Kriteria Rumah': k?.kriteriaRumah ?? '', 'Rumah Sehat': k?.rumahSehat ?? '', TPS: k ? (k.tps ? 'Ada' : 'Tidak') : '',
      UP2K: k ? Y(k.up2k) : '', 'Jenis UP2K': k?.jenisUp2k ?? '', Jumatik: Y(w.jumantik), Jabatan: w.jabatan,
      'ibu hamil': w.hamil ? 'hamil' : '', 'hamil ke': w.hamilKe, hpl: w.hpl, 'ibu melahirkan': w.melahirkan ? 'ya' : '',
      'ibu menyusui': w.menyusui ? 'ya' : '', 'ibu nifas': w.nifas ? 'ya' : '', '3 buta': w.tigaButa ? 'ya' : '',
      'berkebutuhan khusus': w.berkebutuhanKhusus ? 'ya' : '',
      Pekarangan: w.pekarangan.map((p) => `${p.kategori}: ${p.komoditi}, ${p.jumlah}`).join('; '),
      'Aktif Posyandu': Y(w.posyandu), 'frekuensi posyandu': w.frekPosyandu, BKB: Y(w.bkb), Tabungan: Y(w.tabungan),
      'Kelompok Belajar': w.kelompokBelajar ? w.jenisKelompokBelajar || 'Ya' : 'Tidak', PAUD: Y(w.paud),
      Koperasi: w.koperasi ? w.jenisKoperasi || 'Ya' : 'Tidak', 'Pendidikan Ketrampilan': Y(w.pendidikanKetrampilan),
      'Perencanaan Sehat': Y(w.perencanaanSehat), Sandang: Y(w.sandang),
      IRT: w.irt.map((x) => `${x.kategori}: ${x.komoditi} (${x.volume})`).join('; '), Status: w.statusWarga,
    }
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'DATA WARGA')
  XLSX.writeFile(wb, `Data_Warga_RT08_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

/** Ekspor tabel HTML laporan ke .xlsx */
export function eksporTabel(el: HTMLElement, nama: string) {
  const wb = XLSX.utils.book_new()
  const tables = el.querySelectorAll('table')
  tables.forEach((t, i) => XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(t), `Tabel ${i + 1}`))
  if (!tables.length) return false
  XLSX.writeFile(wb, `${nama.replace(/[^\w -]/g, '')}.xlsx`)
  return true
}
