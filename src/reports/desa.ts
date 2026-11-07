/**
 * Laporan gabungan DESA MANTUP (RT 01–17), khusus Admin Desa.
 *
 * - Laporan rekap (baris = dasawisma): semua data digabung dan setiap RT diperlakukan sebagai satu
 *   "kelompok", sehingga rumus rekap yang sama menghasilkan satu baris per RT + JUMLAH desa.
 * - Laporan daftar nama: disusun per RT lalu disambung, dengan kolom RT tambahan setelah kolom NO.
 */
import { create } from 'zustand'
import { TEMPLATES, colIndex, colLetter, type CellObj, type Tpl, type TplCell, type Val } from '@/sheet/engine'
import { api } from '@/lib/api'
import { DEFAULT_SETTINGS } from '@/lib/store'
import type { Collections, Dasawisma, KampungKBManual, Settings } from '@/lib/types'
import { makeCtx, type ReportData } from './ctx'
import type { PageSpec, ReportOpts, ReportParams } from './common'
import type { ReportDef } from './registry'

export interface DataRT extends Pick<Collections, 'warga' | 'keluarga' | 'kelahiran' | 'kematian' | 'pesertaKB' | 'pusBaru' | 'dasawisma' | 'kampungKB'> { rt: string; settings: Settings | null }

/** cara tiap laporan digabung tingkat desa (laporan lain tetap per RT) */
export const GABUNGAN: Record<string, 'rekap' | 'daftar'> = {
  'rekap-catatan': 'rekap',
  'rekap-ibu-hamil': 'rekap',
  'kampung-kb': 'rekap',
  wus: 'daftar',
  pus: 'daftar',
  'anak-6-18': 'daftar',
  'penduduk-15-59': 'daftar',
  'register-kelahiran': 'daftar',
  'pencatatan-hamil-kb': 'daftar',
}

export const NAMA_DESA = 'DESA MANTUP'
const live = <T extends { deletedAt?: string | null }>(xs: T[] | undefined) => (xs ?? []).filter((x) => !x.deletedAt)

/* ---------- data semua RT (diambil dari server sekali, bisa dimuat ulang) ---------- */
interface DesaState { list: DataRT[] | null; loading: boolean; error: string; at: number; load: (force?: boolean) => Promise<void> }
export const useDataDesa = create<DesaState>()((set, get) => ({
  list: null, loading: false, error: '', at: 0,
  load: async (force = false) => {
    if (get().loading || (!force && get().list && Date.now() - get().at < 60000)) return
    set({ loading: true, error: '' })
    try { set({ list: (await api<{ rts: DataRT[] }>('/desa')).rts, at: Date.now() }) } catch (e) { set({ error: (e as Error).message }) } finally { set({ loading: false }) }
  },
}))

/** nilai manual Kampung KB dijumlahkan per periode */
function jumlahKB(list: DataRT[]): KampungKBManual[] {
  const per = new Map<string, KampungKBManual>()
  for (const d of list) for (const k of live(d.kampungKB)) {
    const cur = per.get(k.periode) ?? { ...k, id: `desa-${k.periode}`, nilai: {} }
    for (const [key, v] of Object.entries(k.nilai ?? {})) {
      const a = cur.nilai[key]
      if (typeof v === 'number') cur.nilai[key] = (typeof a === 'number' ? a : 0) + v
      else if (a === undefined) cur.nilai[key] = v
    }
    per.set(k.periode, cur)
  }
  return [...per.values()]
}

const labelRT = (rt: string) => `RT ${rt}`
const settingsDesa = (list: DataRT[]): Settings => ({ ...DEFAULT_SETTINGS, ...(list.find((d) => d.rt === '08')?.settings ?? {}), rt: NAMA_DESA, kunci: undefined })

/** semua RT jadi satu; per-RT = true: setiap RT menjadi satu "dasawisma" bernama "RT xx" */
export function dataGabungan(list: DataRT[], perRT = true): ReportData {
  const pakai = list
  if (!perRT) {
    const d = pakai[0]
    return { warga: live(d?.warga), keluarga: live(d?.keluarga), kelahiran: live(d?.kelahiran), kematian: live(d?.kematian), pesertaKB: live(d?.pesertaKB), pusBaru: live(d?.pusBaru), dasawisma: live(d?.dasawisma), kampungKB: live(d?.kampungKB), settings: { ...DEFAULT_SETTINGS, ...(d?.settings ?? {}) } }
  }
  const dws: Dasawisma[] = pakai.map((d) => ({ id: `rt-${d.rt}`, nama: labelRT(d.rt), ketua: '', warna: 'amber', createdAt: '', updatedAt: '', deletedAt: null } as unknown as Dasawisma))
  return {
    warga: pakai.flatMap((d, i) => live(d.warga).map((w) => ({ ...w, dasawisma: labelRT(d.rt), urut: i * 100000 + (w.urut ?? 0) }))),
    keluarga: pakai.flatMap((d) => live(d.keluarga)),
    kelahiran: pakai.flatMap((d) => live(d.kelahiran).map((x) => ({ ...x, dasawisma: labelRT(d.rt) }))),
    kematian: pakai.flatMap((d) => live(d.kematian).map((x) => ({ ...x, dasawisma: labelRT(d.rt) }))),
    pesertaKB: pakai.flatMap((d) => live(d.pesertaKB)),
    pusBaru: pakai.flatMap((d) => live(d.pusBaru)),
    dasawisma: dws,
    kampungKB: jumlahKB(pakai),
    settings: settingsDesa(pakai),
  }
}

/* ---------- templat dengan kolom RT tambahan (setelah kolom pertama) ---------- */
function denganKolomRT(tplId: string): string {
  const id = `${tplId}~rt`
  if (TEMPLATES[id]) return id
  const t: Tpl = TEMPLATES[tplId]
  const rows = t.rows.map((row) => {
    const c0 = row.c.find((c) => c.c === 0)
    const c1 = row.c.find((c) => c.c === 1)
    const out: TplCell[] = []
    for (const c of row.c) {
      if (c.c === 0) {
        if (c.cs && c.cs > 1) { out.push({ ...c, cs: c.cs + 1 }); continue }
        out.push(c)
        const judulKolom = typeof c.v === 'string' && c.v.trim() !== '' && typeof c1?.v === 'string' && c1.v.trim() !== ''
        const nomorKolom = typeof c.v === 'number' && typeof c1?.v === 'number'
        out.push({ c: 1, s: c.s, ...(c.rs ? { rs: c.rs } : {}), ...(c.d ? { d: 1 as const } : {}), ...(judulKolom ? { v: 'RT' } : nomorKolom ? { v: '' } : {}) })
      } else out.push({ ...c, c: c.c + 1 })
    }
    if (!c0 && c1 === undefined && row.c.length === 0) return row
    return { ...row, c: out }
  })
  TEMPLATES[id] = { ...t, cols: [t.cols[0], 34, ...t.cols.slice(1)], rows }
  return id
}
const geser = (L: string) => (colIndex(L) === 0 ? L : colLetter(colIndex(L) + 1))
const geserAddr = (a: string) => { const m = a.match(/^([A-Z]+)(\d+)$/); return m ? `${geser(m[1])}${m[2]}` : a }
const tanpaTautan = (v: Val): Val => (v && typeof v === 'object' && 'w' in v ? { ...(v as CellObj), w: undefined } : v)

/** judul lembar: "… RT 08 MANTUP" → "… DESA MANTUP", ": RT 08" → ": RT 01 – 17" */
function judulDesa(pages: PageSpec[], list: DataRT[]): PageSpec[] {
  const rentang = list.length ? `RT ${list[0].rt} – ${list[list.length - 1].rt}` : 'RT'
  return pages.map((pg) => {
    const tpl = TEMPLATES[pg.tplId]
    const values: Record<string, Val> = { ...(pg.values ?? {}) }
    for (const row of tpl.rows) for (const c of row.c) {
      if (typeof c.v !== 'string') continue
      const addr = `${colLetter(c.c)}${row.r}`
      if (addr in values) continue
      let v = c.v
      v = v.replace(/RT 08 MANTUP/gi, NAMA_DESA).replace(/RT 08 \/ Mantup/gi, `${rentang} / Mantup`).replace(/RT 08/g, rentang)
      v = v.replace(/^NAMA DASAWISMA$/i, 'NAMA RT').replace(/^DASA WISMA$/i, 'RT').replace(/^NAMA KELOMPOK$/i, 'NAMA')
      if (/^KELOMPOK PKK RT\s*$/i.test(v)) v = 'KELOMPOK PKK'
      if (/KELOMPOK PKK RT$/i.test(v)) v = v.replace(/KELOMPOK PKK RT$/i, `KELOMPOK PKK ${NAMA_DESA}`)
      if (v !== c.v) values[addr] = v
    }
    return { ...pg, values }
  })
}

/** susun laporan gabungan desa */
export function bangunDesa(def: ReportDef, list: DataRT[], p: ReportParams, o: ReportOpts, ym: string): PageSpec[] {
  const mode = GABUNGAN[def.slug]
  const pilih = p.dawis ? list.filter((d) => labelRT(d.rt) === p.dawis) : list
  if (mode === 'rekap') {
    const ctx = makeCtx(dataGabungan(pilih), { ...p, dawis: '' }, o, ym)
    return judulDesa(def.build(ctx), pilih)
  }
  // daftar: per RT lalu disambung, kolom RT disisipkan
  const perRT = pilih.map((d) => ({ rt: d.rt, pages: def.build(makeCtx(dataGabungan([d], false), { ...p, dawis: '' }, o, ym)) }))
  const first = perRT.find((x) => x.pages.length)?.pages[0] ?? def.build(makeCtx(dataGabungan([], false), { ...p, dawis: '' }, o, ym))[0]
  if (!first) return []
  const tplId = denganKolomRT(first.tplId)
  const regions: Record<string, Record<string, Val>[]> = {}
  const regIds = TEMPLATES[first.tplId].regions.map((r) => r.id)
  for (const id of regIds) {
    let no = 0
    regions[id] = perRT.flatMap(({ rt, pages }) => (pages[0]?.regions?.[id] ?? []).filter((r) => Object.keys(r).some((k) => k !== 'A')).map((r) => {
      const out: Record<string, Val> = { B: rt }
      for (const [k, v] of Object.entries(r)) out[geser(k)] = k === 'A' && typeof v === 'number' ? ++no : tanpaTautan(v)
      if (!('A' in r)) no++
      return out
    }))
  }
  const values: Record<string, Val> = {}
  for (const [k, v] of Object.entries(first.values ?? {})) values[geserAddr(k)] = v
  const rowsShown = Object.fromEntries(regIds.map((id) => [id, Math.max(1, regions[id].length)]))
  const page: PageSpec = { key: `${first.key}-desa`, tplId, values, regions, rowsShown }
  return judulDesa([page], pilih)
}
