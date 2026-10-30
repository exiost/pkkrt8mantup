import { TEMPLATES, n, dt, type Val, type CellObj } from '@/sheet/engine'
import { BULAN } from '@/lib/options'
import { isBalita, isKepala, isLansia, isPUS, isWUS, namaSuami, statusIbuPada, ymOf, catatanIbu } from '@/lib/rules'
import type { Keluarga, Warga } from '@/lib/types'
import { type Builder, type Ctx, drill, has, inMonth, link, yes } from './common'

type Col = Warga[] | number
const namaRentang = (c: Ctx) => (c.p.rentang ? (c.p.bulan === (c.p.bulanSampai ?? 11) ? BULAN[c.p.bulan] : `${BULAN[c.p.bulan]} – ${BULAN[c.p.bulanSampai ?? 11]}`) : BULAN[c.p.bulan])
const sehat = (k: Keluarga) => has(k.rumahSehat, 'sehat') && !has(k.rumahSehat, 'tidak')

/* ============ Rekap Catatan Data & Kegiatan — tingkat RT (baris = dasawisma) ============ */
function rtCols(ws: Warga[], c: Ctx): Col[] {
  const sI = (w: Warga) => statusIbuPada(w, c.ym)
  const s = c.settings, a = c.p.acuan
  const kepala = ws.filter(isKepala)
  const kc = (f: (k: Keluarga) => boolean) => kepala.filter((w) => { const k = c.fam.get(w.keluargaId); return !!k && f(k) })
  return [
    kepala, kepala,
    ws.filter((w) => w.jk === 'L'), ws.filter((w) => w.jk === 'P'),
    ws.filter((w) => w.jk === 'L' && isBalita(w, a, s)), ws.filter((w) => w.jk === 'P' && isBalita(w, a, s)),
    ws.filter((w) => isPUS(w, a)), ws.filter((w) => isWUS(w, a)), ws.filter((w) => sI(w).hamil), ws.filter((w) => sI(w).menyusui),
    ws.filter((w) => isLansia(w, a, s)), ws.filter((w) => w.tigaButa), ws.filter((w) => !!w.berkebutuhanKhusus),
    kc(sehat), kc((k) => has(k.rumahSehat, 'tidak')), kc((k) => has(k.tps, 'ada')), kc((k) => yes(k.spal)), kc((k) => (Number(k.kamarMandi) || 0) > 0),
    kc((k) => has(k.sumberAir, 'pdam')), kc((k) => has(k.sumberAir, 'sumur')),
    kc((k) => !!k.sumberAir && !has(k.sumberAir, 'sumur') && !has(k.sumberAir, 'pdam')),
    kc((k) => has(k.makananPokok, 'beras')), kc((k) => !!k.makananPokok && !has(k.makananPokok, 'beras')),
    ws.filter((w) => yes(w.up2k)), ws.filter((w) => yes(w.apotekHidup)), ws.filter((w) => w.irt.length > 0), ws.filter((w) => yes(w.kerjaBakti)),
  ]
}
const RT_LETTERS = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC']
const RT_NAMES = ['KRT', 'KK', 'Anggota L', 'Anggota P', 'Balita L', 'Balita P', 'PUS', 'WUS', 'Ibu hamil', 'Ibu menyusui', 'Lansia', '3 buta', 'Berkebutuhan khusus', 'Rumah sehat layak huni', 'Rumah tidak sehat', 'Punya tempat sampah', 'Punya SPAL', 'Punya MCK & septic tank', 'Air PDAM', 'Air sumur', 'Air lainnya', 'Makan beras', 'Makan non beras', 'UP2K', 'Pemanfaatan pekarangan', 'Industri rumah tangga', 'Kesehatan lingkungan']
const cell = (x: Col, title: string): Val => (typeof x === 'number' ? n(x) : n(x.length, drill(title, x)))

export const bRekapCatatan: Builder = (c) => {
  const pkk = c.aktif.filter((w) => w.ikutPKK)
  const rows: Record<string, Val>[] = c.dasawisma.map((d, i) => {
    const cols = rtCols(pkk.filter((w) => w.dasawisma === d.nama), c)
    const r: Record<string, Val> = { A: i + 1, B: d.nama, AD: '-' }
    RT_LETTERS.forEach((L, j) => (r[L] = cell(cols[j], `${RT_NAMES[j]} — ${d.nama}`)))
    return r
  })
  const values: Record<string, Val> = { U6: `: ${c.p.tahun}` }
  const sums = RT_LETTERS.map((_, j) => c.dasawisma.reduce((t, d) => {
    const x = rtCols(pkk.filter((w) => w.dasawisma === d.nama), c)[j]
    return { n: t.n + (typeof x === 'number' ? x : x.length), l: typeof x === 'number' ? t.l : [...t.l, ...x] }
  }, { n: 0, l: [] as Warga[] }))
  RT_LETTERS.forEach((L, j) => (values[`${L}31`] = n(sums[j].n, drill(`${RT_NAMES[j]} — seluruh RT`, sums[j].l))))
  return [{ key: 'rekapcatatan', tplId: 'rekapcatatan', values, regions: { main: rows } }]
}

/* ============ Rekap Catatan per Dasawisma (baris = kepala rumah tangga) ============ */
export const bRekapDawis: Builder = (c) => {
  const s = c.settings, a = c.p.acuan
  const dawis = c.p.dawis || c.dasawisma[0]?.nama || ''
  const kepalas = c.aktif.filter((w) => isKepala(w) && w.ikutPKK && w.dasawisma === dawis)
  const L = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB']
  const names = ['Jumlah KK', 'Anggota L', 'Anggota P', 'Balita L', 'Balita P', 'PUS', 'WUS', 'Ibu hamil', 'Ibu menyusui', 'Lansia', '3 buta', 'Berkebutuhan khusus']
  const sums = new Array(L.length).fill(0)
  const rows: Record<string, Val>[] = kepalas.map((k, i) => {
    const fam = c.warga.filter((w) => w.keluargaId === k.keluargaId && w.statusWarga === 'Aktif' && w.ikutPKK)
    const kel = c.fam.get(k.keluargaId)
    const m = (f: (w: Warga) => boolean) => fam.filter(f)
    const b = (x: boolean | undefined) => (x ? 1 : 0)
    const t = b(has(kel?.sumberAir ?? '', 'pdam')), u = b(has(kel?.sumberAir ?? '', 'sumur'))
    const lists: (Warga[] | number)[] = [
      1, m((w) => w.jk === 'L'), m((w) => w.jk === 'P'), m((w) => w.jk === 'L' && isBalita(w, a, s)), m((w) => w.jk === 'P' && isBalita(w, a, s)),
      m((w) => isPUS(w, a)), m((w) => isWUS(w, a)), m((w) => statusIbuPada(w, c.ym).hamil), m((w) => statusIbuPada(w, c.ym).menyusui), m((w) => isLansia(w, a, s)), m((w) => w.tigaButa), m((w) => !!w.berkebutuhanKhusus),
      b(!!kel && sehat(kel)), b(!!kel && has(kel.rumahSehat, 'tidak')), b(has(kel?.tps ?? '', 'ada')), b(yes(kel?.spal ?? '')), b((Number(kel?.kamarMandi) || 0) > 0),
      t, u, b(!t && !u && !!kel?.sumberAir), b(has(kel?.makananPokok ?? '', 'beras')), b(!!kel?.makananPokok && !has(kel.makananPokok, 'beras')),
      b(fam.some((w) => yes(w.up2k))), b(fam.some((w) => yes(w.apotekHidup))), b(fam.some((w) => w.irt.length > 0)), fam.filter((w) => yes(w.kerjaBakti)).length,
    ]
    const r: Record<string, Val> = { A: i + 1, B: link(k) }
    L.forEach((col, j) => {
      const x = lists[j]
      const val = typeof x === 'number' ? x : x.length
      sums[j] += val
      r[col] = typeof x === 'number' ? n(x) : n(val, j < names.length ? drill(`${names[j]} — ${k.nama}`, x) : undefined)
    })
    return r
  })
  const values: Record<string, Val> = { V3: `: ${dawis}`, V7: `: ${c.p.tahun}` }
  L.forEach((col, j) => (values[`${col}42`] = n(sums[j])))
  return [{ key: 'rekapdawis', tplId: 'rekapdawis', values, regions: { main: rows } }]
}

/* ============ Rekap Ibu Hamil / Melahirkan / Nifas — tingkat RT ============ */
export const bRekapIbuHamil: Builder = (c) => {
  const pkk = c.aktif.filter((w) => w.ikutPKK)
  const lahir = c.kelahiran.filter((k) => inMonth(k.tglLahir, c.p))
  const mati = c.kematian.filter((k) => inMonth(k.tgl, c.p))
  const sI = (w: Warga) => statusIbuPada(w, c.ym)
  const stat = (d: string) => {
    const ws = pkk.filter((w) => w.dasawisma === d)
    const cnt = <T extends { dasawisma: string }>(xs: T[], f: (x: T) => boolean) => xs.filter((x) => x.dasawisma === d && f(x)).length
    return [
      n(ws.filter((w) => sI(w).hamil).length, drill(`Ibu hamil — ${d}`, ws.filter((w) => sI(w).hamil))),
      n(ws.filter((w) => sI(w).melahirkan).length, drill(`Melahirkan — ${d}`, ws.filter((w) => sI(w).melahirkan))),
      n(ws.filter((w) => sI(w).nifas).length, drill(`Nifas — ${d}`, ws.filter((w) => sI(w).nifas))),
      n(cnt(mati, (m) => m.kategori === 'Ibu')),
      n(cnt(lahir, (k) => k.jk === 'L')), n(cnt(lahir, (k) => k.jk === 'P')), n(cnt(lahir, (k) => k.akte)), n(cnt(lahir, (k) => !k.akte)),
      n(cnt(mati, (m) => m.kategori === 'Bayi' && m.jk === 'L')), n(cnt(mati, (m) => m.kategori === 'Bayi' && m.jk === 'P')),
      n(cnt(mati, (m) => m.kategori === 'Balita' && m.jk === 'L')), n(cnt(mati, (m) => m.kategori === 'Balita' && m.jk === 'P')),
    ]
  }
  const LET = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
  // pilihan: hanya satu dari Hamil / Melahirkan / Nifas yang ditampilkan
  const hide = (j: number) => !!c.p.statusIbu && j < 3 && ['hamil', 'melahirkan', 'nifas'][j] !== c.p.statusIbu
  const rows: Record<string, Val>[] = c.dasawisma.map((d, i) => {
    const st = stat(d.nama)
    const r: Record<string, Val> = { A: i + 1, B: d.nama }
    LET.forEach((L, j) => (r[L] = hide(j) ? '' : st[j]))
    return r
  })
  const values: Record<string, Val> = { K4: namaRentang(c), K5: String(c.p.tahun) }
  LET.forEach((L, j) => (values[`${L}26`] = hide(j) ? '' : n(c.dasawisma.reduce((t, d) => t + Number((stat(d.nama)[j] as CellObj).v), 0))))
  return [{ key: 'rekapibuhamil', tplId: 'rekapibuhamil', values, regions: { main: rows } }]
}

/* ============ Catatan Ibu Hamil, Kelahiran & Kematian — per dasawisma ============ */
export const bIbuHamilDawis: Builder = (c) => {
  const dawis = c.p.dawis
  const inD = (d: string) => !dawis || d === dawis
  const sI = (w: Warga) => statusIbuPada(w, c.ym)
  const mothers = c.aktif.filter((w) => { const s = sI(w); return (s.hamil || s.melahirkan || s.nifas) && w.ikutPKK && inD(w.dasawisma) })
  const lahir = c.kelahiran.filter((k) => inD(k.dasawisma) && inMonth(k.tglLahir, c.p))
  const mati = c.kematian.filter((k) => inD(k.dasawisma) && inMonth(k.tgl, c.p))
  const left: Record<string, Val>[] = []
  const used = new Set<string>()
  const babyCols = (k?: (typeof lahir)[number]): Record<string, Val> =>
    k ? { E: k.namaBayi, F: k.jk === 'L' ? 'V' : '', G: k.jk === 'P' ? 'V' : '', H: dt(k.tglLahir), I: k.akte ? 'V' : '', J: !k.akte ? 'V' : '' } : {}
  for (const w of mothers) {
    const babies = lahir.filter((k) => k.namaIbu.trim().toLowerCase() === w.nama.trim().toLowerCase())
    babies.forEach((b) => used.add(b.id))
    const si = sI(w)
    const status = c.ym.includes('~')
      ? [si.hamil && 'Hamil', si.melahirkan && 'Melahirkan', si.nifas && 'Nifas', si.menyusui && 'Menyusui'].filter(Boolean).join(', ')
      : si.hamil ? 'Hamil' : si.nifas ? 'Nifas' : 'Melahirkan'
    const ket = catatanIbu(w, c.ym, BULAN)
    const base: Record<string, Val> = { B: link(w), C: namaSuami(w, c.warga), D: status, ...(ket ? { Q: ket } : {}) }
    if (!babies.length) left.push(base)
    babies.forEach((b, i) => left.push({ ...base, ...(i > 0 ? { Q: undefined } : {}), ...babyCols(b) }))
  }
  for (const k of lahir) if (!used.has(k.id)) left.push({ B: k.namaIbu, C: k.namaSuami, D: 'Melahirkan', ...babyCols(k) })
  const right: Record<string, Val>[] = mati.map((m) => ({
    K: m.nama, L: m.kategori.toUpperCase(), M: m.jk === 'L' ? 'V' : '', N: m.jk === 'P' ? 'V' : '', O: dt(m.tgl), P: m.sebab, Q: m.keterangan,
  }))
  // kolom KET. (Q) dipakai bersama: catatan ibu (kiri) dan keterangan kematian (kanan) digabung bila sebaris
  const rows = Array.from({ length: Math.max(left.length, right.length) }, (_, i) => {
    const l = left[i] ?? {}, r = right[i] ?? {}
    const q = [l.Q, r.Q].filter((x) => x !== undefined && x !== '').join(' · ')
    return { ...l, ...r, ...(q ? { Q: q } : {}) }
  })
  const cntL = lahir.filter((k) => k.jk === 'L').length, cntP = lahir.filter((k) => k.jk === 'P').length
  const values: Record<string, Val> = {
    L3: `: ${dawis || 'Semua'}`, A8: `BULAN : ${namaRentang(c)}`, A9: `TAHUN : ${c.p.tahun}`,
    F28: n(cntL), G28: n(cntP), I28: n(lahir.filter((k) => k.akte).length), J28: n(lahir.filter((k) => !k.akte).length),
    M28: n(mati.filter((m) => m.jk === 'L').length), N28: n(mati.filter((m) => m.jk === 'P').length),
    D31: `: ${mothers.filter((w) => sI(w).hamil).length}`, D32: `: ${mothers.filter((w) => !sI(w).hamil && !sI(w).nifas).length}`, D33: `: ${mothers.filter((w) => !sI(w).hamil && sI(w).nifas).length}`,
    D34: `: ${mati.filter((m) => m.kategori === 'Ibu').length}`, D35: `: ${lahir.length}`, D36: `: ${mati.filter((m) => m.kategori === 'Bayi').length}`, D37: `: ${mati.filter((m) => m.kategori === 'Balita').length}`,
  }
  return [{ key: 'ibuhamildawis', tplId: 'ibuhamildawis', values, regions: { main: rows }, rowsShown: { main: Math.max(rows.length, TEMPLATES.ibuhamildawis.regions[0].size) } }]
}

/* ============ Versi TAHUNAN (Ibu & Anak): status yang pernah dialami sepanjang tahun ============ */
const tahunan = (b: Builder): Builder => (c) => {
  const sampai = Math.max(c.p.bulan, c.p.bulanSampai ?? 11)
  return b({ ...c, p: { ...c.p, rentang: true, bulanSampai: sampai }, ym: `${ymOf(c.p.tahun, c.p.bulan)}~${ymOf(c.p.tahun, sampai)}` })
}
export const bRekapIbuHamilTahunan = tahunan(bRekapIbuHamil)
export const bIbuHamilDawisTahunan = tahunan(bIbuHamilDawis)
