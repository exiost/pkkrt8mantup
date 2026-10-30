import { TEMPLATES, dt, n, V, type Val } from '@/sheet/engine'
import { hitungUmur, isPenduduk1559, isPUS, isWUS, kelompokUmurPUS, namaSuami, isKepala, isBalita, isLansia, kelompokUmurPUS as kup, statusIbuPada } from '@/lib/rules'
import { BULAN } from '@/lib/options'
import { dtText } from '@/sheet/engine'
import { type Builder, type Ctx, drill, inMonth, jkText, link, rowsOf, tglPanjang, yes } from './common'

const byDawis = (c: Ctx) => c.aktif.filter((w) => !c.p.dawis || w.dasawisma === c.p.dawis)
const size = (id: string, r = 0) => TEMPLATES[id].regions[r].size

export const bPenduduk: Builder = (c) => {
  const list = byDawis(c).filter((w) => isPenduduk1559(w, c.p.acuan))
  const nrows = c.o.barisKosong ? Math.max(list.length, size('penduduk')) : list.length
  const rows: Record<string, Val>[] = Array.from({ length: nrows }, (_, i) => {
    const w = list[i]
    return w
      ? { A: i + 1, B: link(w), C: w.nik, D: dt(w.tglLahir), E: jkText(w), F: c.o.isiKosong ? w.alamat : '', G: w.riwayatSakit }
      : { A: i + 1 }
  })
  return [{ key: 'penduduk', tplId: 'penduduk', regions: { main: rows }, rowsShown: { main: nrows } }]
}

export const bWUS: Builder = (c) => {
  const list = byDawis(c).filter((w) => isWUS(w, c.p.acuan))
  const nrows = rowsOf(list as never, size('wus'), c.o.barisKosong)
  const rows: Record<string, Val>[] = Array.from({ length: nrows }, (_, i) => {
    const w = list[i]
    return w ? { A: i + 1, B: w.nik, C: link(w), D: dt(w.tglLahir), E: hitungUmur(w.tglLahir, c.p.acuan) ?? '', F: w.statusKawin } : { A: i + 1 }
  })
  return [{ key: 'wus', tplId: 'wus', values: { A2: `TANGGAL / BULAN / TAHUN : ${tglPanjang(c.p.acuan)}` }, regions: { main: rows }, rowsShown: { main: nrows } }]
}

export const bPUS: Builder = (c) => {
  const list = byDawis(c).filter((w) => isPUS(w, c.p.acuan))
  const nrows = rowsOf(list as never, size('pus'), c.o.barisKosong)
  const rows: Record<string, Val>[] = Array.from({ length: nrows }, (_, i) => {
    const w = list[i]
    if (!w) return { A: i + 1 }
    const u = hitungUmur(w.tglLahir, c.p.acuan)
    const k = kelompokUmurPUS(u)
    return { A: i + 1, B: link(w), C: dt(w.tglLahir), D: u ?? '', E: k === '<15' ? 'V' : '', F: k === '15-19' ? 'V' : '', G: k === '20-34' ? 'V' : '', H: k === '35-49' ? 'V' : '', I: w.kontrasepsi }
  })
  return [{ key: 'pus', tplId: 'pus', values: { A2: `TANGGAL / BULAN / TAHUN : ${tglPanjang(c.p.acuan)}` }, regions: { main: rows }, rowsShown: { main: nrows } }]
}

export const bPencatatan: Builder = (c) => {
  const hamil = c.aktif.filter((w) => statusIbuPada(w, c.ym).hamil && w.ikutPKK)
  const sh = size('pencatatan', 0)
  const rowsH: Record<string, Val>[] = Array.from({ length: Math.max(hamil.length, sh) }, (_, i) => {
    const w = hamil[i]
    return w
      ? { A: i + 1, B: link(w), C: hitungUmur(w.tglLahir, c.p.acuan) ?? '', D: namaSuami(w, c.warga), E: w.hamilKe, F: dt(w.hpl) }
      : { A: i + 1 }
  })
  const kb = c.pesertaKB.filter((k) => inMonth(k.tglKB, { ...c.p, semuaPeriode: false }))
  const rowsK: Record<string, Val>[] = Array.from({ length: Math.max(kb.length, size('pencatatan', 1)) }, (_, i) => {
    const k = kb[i]
    return k ? { A: i + 1, B: k.namaIstri, C: k.umur, D: k.namaSuami, E: k.rt, F: k.jaminan, G: k.jumlahAnak, H: dt(k.tglKB), I: k.tempatKB, J: k.jenisAlkon } : { A: i + 1 }
  })
  const pus = c.pusBaru.filter((k) => inMonth(k.tanggal, { ...c.p, semuaPeriode: false }))
  const rowsP: Record<string, Val>[] = Array.from({ length: Math.max(pus.length, size('pencatatan', 2)) }, (_, i) => {
    const k = pus[i]
    return k ? { A: i + 1, B: k.namaIstri, C: k.umur, D: k.namaSuami, E: dt(k.tanggal), F: k.keterangan } : { A: i + 1 }
  })
  return [{ key: 'pencatatan', tplId: 'pencatatan', regions: { hamil: rowsH, kb: rowsK, pus: rowsP } }]
}

/** Register kelahiran & kematian = sheet "bayi lahir": satu baris per kejadian */
export const bRegister: Builder = (c) => {
  const lahir = c.kelahiran.filter((k) => (!c.p.dawis || k.dasawisma === c.p.dawis) && inMonth(k.tglLahir, c.p)).sort((a, b) => a.tglLahir.localeCompare(b.tglLahir))
  const mati = c.kematian.filter((k) => (!c.p.dawis || k.dasawisma === c.p.dawis) && inMonth(k.tgl, c.p)).sort((a, b) => a.tgl.localeCompare(b.tgl))
  const rows: Record<string, Val>[] = [
    ...lahir.map((k) => ({
      A: k.dasawisma, B: k.namaIbu, C: k.namaSuami, E: 'ya', G: k.namaBayi, H: k.jk === 'L' ? 'ya' : '', I: k.jk === 'P' ? 'ya' : '',
      J: dt(k.tglLahir), K: k.akte ? 'ya' : 'tidak', U: k.keterangan,
    })),
    ...mati.map((k) => ({
      A: k.dasawisma, B: k.namaIbu, L: k.kategori === 'Ibu' ? k.nama : '', M: k.kategori === 'Balita' ? k.nama : '', N: k.kategori === 'Bayi' ? k.nama : '',
      O: k.kategori === 'Ibu' ? 'ya' : '', P: k.kategori === 'Balita' ? 'ya' : '', Q: k.kategori === 'Bayi' ? 'ya' : '', R: k.jk === 'L' ? 'laki laki' : 'perempuan',
      S: dt(k.tgl), T: k.sebab, U: k.keterangan,
    })),
  ]
  return [{ key: 'register', tplId: 'registerlahir', regions: { main: rows }, rowsShown: { main: rows.length } }]
}

/* ---------- Inventarisasi Kampung KB ---------- */
export const bKampungKB: Builder = (c) => {
  const { p } = c
  const all = c.aktif
  const pkk = all.filter((w) => w.ikutPKK)
  const age = (w: (typeof all)[number]) => hitungUmur(w.tglLahir, p.acuan)
  const between = (a: number, b: number, set = pkk) => set.filter((w) => { const u = age(w); return u !== null && u >= a && u <= b })
  const kk = pkk.filter(isKepala)
  const pus = all.filter((w) => isPUS(w, p.acuan))
  const v: Record<string, Val> = {}
  const put = (addr: string, title: string, list: typeof all) => { v[addr] = n(list.length, drill(title, list)) }
  const sum = (addr: string, a: string[]) => { v[addr] = a.reduce((t, k) => t + (typeof v[k] === 'object' && v[k] ? Number((v[k] as { v: number }).v) : 0), 0) }

  v.A2 = `BULAN : ${BULAN[p.bulan]} `
  v.A3 = `TAHUN : ${p.tahun}`
  put('C9', 'KK laki-laki', kk.filter((w) => w.jk === 'L'))
  put('C10', 'KK perempuan', kk.filter((w) => w.jk === 'P'))
  sum('C11', ['C9', 'C10'])
  put('C15', 'Penduduk laki-laki', pkk.filter((w) => w.jk === 'L'))
  put('C16', 'Penduduk perempuan', pkk.filter((w) => w.jk === 'P'))
  sum('C17', ['C15', 'C16'])
  // pendidikan KK (aturan sama dengan rumus Excel)
  const kkp = kk
  const pend = (f: (s: string) => boolean) => kkp.filter((w) => f(w.pendidikan))
  put('C21', 'KK tidak sekolah', pend((s) => s === 'Tidak / Belum Sekolah'))
  put('C22', 'KK tidak lulus SD', pend((s) => s === 'Belum Tamat SD / Sederajat'))
  put('C23', 'KK SD', pend((s) => /SD/.test(s) && s !== 'Belum Tamat SD / Sederajat'))
  put('C24', 'KK SLTP', pend((s) => /SLTP/.test(s)))
  put('C25', 'KK SLTA', pend((s) => /SLTA/.test(s)))
  put('C26', 'KK perguruan tinggi', pend((s) => /Diploma|Strata/.test(s)))
  // kelompok umur (usia bulat, tanpa celah umur 6 th seperti di Excel)
  put('C30', '1 - < 2 th', between(1, 1))
  put('C31', '2 - < 5 th', between(2, 4))
  put('C32', '5 - 6 th', between(5, 6))
  put('C33', '7 - 14 th', between(7, 14))
  put('C34', '15 - 24 th', between(15, 24))
  put('C35', '25 - 49 th', between(25, 49))
  put('C36', '50 - < 65 th', between(50, 64))
  put('C37', '> 65 th', pkk.filter((w) => (age(w) ?? -1) >= 65))
  put('C41', 'Usia 18 - 56 th', between(18, 56))
  put('C42', 'Remaja putri 12 - 17 th', between(12, 17).filter((w) => w.jk === 'P'))
  put('C43', 'Perempuan 15 - 49 th', between(15, 49).filter((w) => w.jk === 'P'))
  // PUS per kelompok umur wanita
  put('H9', 'PUS < 15 th', pus.filter((w) => kup(age(w)) === '<15'))
  put('H10', 'PUS 15 - 19 th', pus.filter((w) => kup(age(w)) === '15-19'))
  put('H11', 'PUS 20 - 34 th', pus.filter((w) => kup(age(w)) === '20-34'))
  put('H12', 'PUS 35 - 49 th', pus.filter((w) => kup(age(w)) === '35-49'))
  sum('H13', ['H9', 'H10', 'H11', 'H12'])
  // peserta KB per alat kontrasepsi (istri, kawin tercatat, ikut PKK)
  const istri = pkk.filter((w) => /^istri$/i.test(w.statusKeluarga.trim()) && w.statusKawin === 'Kawin Tercatat')
  ;(['IUD', 'MOW', 'MOP', 'IMPLAN', 'SUNTIK', 'PIL', 'KONDOM'] as const).forEach((k, i) => put(`H${17 + i}`, `Peserta ${k}`, istri.filter((w) => w.kontrasepsi.trim().toUpperCase() === k)))
  sum('H24', ['H17', 'H18', 'H19', 'H20', 'H21', 'H22', 'H23'])
  const hamilIni = pkk.filter((w) => statusIbuPada(w, c.ym).hamil)
  v.H28 = n(Math.min(hamilIni.length, 5), drill('Ibu hamil', hamilIni))
  // isian manual (diketik tangan di Excel)
  const man = c.kb?.nilai ?? {}
  for (const [addr, val] of Object.entries(man)) if (val !== '' && val !== undefined) v[addr] = typeof val === 'number' ? n(val) : String(val)
  return [{ key: 'kb', tplId: 'kampungkb', values: v }]
}

export { V, yes, isBalita, isLansia, dtText }
