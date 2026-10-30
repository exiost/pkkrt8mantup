import { useContext, useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, Info, Minus } from 'lucide-react'
import { Card, Chip } from '@/components/ui'
import { STYLES, TEMPLATES, colLetter, type CellObj, type Tpl, type Val } from '@/sheet/engine'
import { SheetCtx } from '@/sheet/SheetView'
import { hitungUmur } from '@/lib/rules'
import { tglIndo } from '@/lib/format'
import type { PageSpec } from './common'
import type { ReportDef } from './registry'

const isNum = (s: unknown) => typeof s === 'number' || /^\d+$/.test(String(s).trim())
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

/* ---------- sel ---------- */
function Cell({ v }: { v: Val }) {
  const act = useContext(SheetCtx)
  if (v === null || v === undefined || v === '') return <span className="text-slate-300">·</span>
  const o: CellObj = typeof v === 'object' ? v : { v }
  const t = String(o.v)
  if (t === 'V') return <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"><Check size={12} strokeWidth={3} /></span>
  if (o.w) return <button className="text-left font-semibold text-indigo-700 hover:underline dark:text-indigo-300" onClick={() => act.editWarga(o.w!)}>{t}</button>
  if (o.drill) return <button className="rounded-md bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-200" onClick={() => act.drill(o.drill!.title, o.drill!.list)}>{t}</button>
  if (typeof o.v === 'number' && o.v === 0) return <span className="text-slate-300">0</span>
  return <>{t}</>
}

const isRight = (v: Val) => v !== null && v !== undefined && v !== '' && (typeof v === 'number' || (typeof v === 'object' && (typeof v.v === 'number' || v.num)))

/* ---------- baca struktur template ---------- */
interface Block { heading?: string; header: { text: string[]; col: number }[]; cols: number[]; regionId: string; footer: Record<string, Val>[]; labels: Map<number, string[]> }

function analyse(tplId: string, page: PageSpec) {
  const tpl: Tpl = TEMPLATES[tplId]
  const bordered = (s: number) => { const x = STYLES[s]; return !!(x.bt || x.bb || x.bl || x.br) }
  // baris header tabel = banyak sel bergaris yang hurufnya tebal (kotak isian formulir tidak dihitung)
  // baris yang tertutup sel gabungan ke bawah (rowspan) dari sel header bergaris
  const covered = new Set<number>()
  for (const r of tpl.rows) for (const c of r.c) if ((c.rs ?? 1) > 1 && bordered(c.s) && c.v !== undefined) for (let k = 1; k < (c.rs ?? 1); k++) covered.add(r.r + k)
  const rowBordered = (r: Tpl['rows'][number]) => {
    if (covered.has(r.r)) return true
    const bc = r.c.filter((c) => bordered(c.s))
    if (bc.length < 2) return false
    if (bc.some((c) => (c.rs ?? 1) > 1 && c.v !== undefined)) return true
    // baris bergaris selebar tabel (hampir semua kolom) = bagian header tabel
    if (bc.reduce((a, c) => a + (c.cs ?? 1), 0) >= tpl.cols.length * 0.6) return true
    if (bc.some((c) => STYLES[c.s].b)) return bc.filter((c) => STYLES[c.s].b || c.v === undefined).length >= 2
    // baris kosong bergaris / baris nomor kolom (1, 2, 3 …) di bawah header
    return bc.every((c) => c.v === undefined || /^\(?\d+\)?$/.test(String(c.v).trim()))
  }
  const staticText = (r: Tpl['rows'][number], c: Tpl['rows'][number]['c'][number]) => {
    const key = `${colLetter(c.c)}${r.r}`
    const ov = page.values && key in page.values ? page.values[key] : undefined
    const v = ov !== undefined ? (typeof ov === 'object' && ov ? String(ov.v) : ov === null ? '' : String(ov)) : c.v !== undefined ? String(c.v) : ''
    return clean(v)
  }
  const regs = [...tpl.regions].sort((a, b) => a.start - b.start)
  const blocks: Block[] = []
  const infoRows: string[] = []
  let title = ''
  const notes: string[] = []
  let cursor = 1
  const rowsIn = (a: number, b: number) => tpl.rows.filter((r) => r.r >= a && r.r <= b)
  regs.forEach((reg, i) => {
    const span = rowsIn(cursor, reg.start - 1)
    // header tabel = deretan baris bergaris yang menempel tepat di atas data (bukan kotak isian di bagian atas formulir)
    let hs = span.length
    const isNumRow = (r: Tpl['rows'][number]) => { const bc = r.c.filter((c) => bordered(c.s) && c.v !== undefined); return bc.length >= 2 && bc.every((c) => /^\(?\d+\)?$/.test(String(c.v).trim())) }
    while (hs > 0 && (rowBordered(span[hs - 1]) || (hs < span.length && isNumRow(span[hs]) && span[hs - 1].c.filter((c) => bordered(c.s)).length >= 2))) hs--
    const headerRows = span.slice(hs)
    const topRows = span.slice(0, hs)
    const heading: string[] = []
    topRows.forEach((r) => {
      const line = r.c.map((c) => staticText(r, c)).filter(Boolean).join(' ')
      if (!line) return
      if (i === 0 && !title && r.c.length <= 3) title = line
      else if (i === 0) infoRows.push(line)
      else heading.push(line)
    })
    const labels = new Map<number, string[]>()
    headerRows.forEach((r) => r.c.forEach((c) => {
      const t = staticText(r, c)
      if (!t || isNum(t)) return
      for (let k = c.c; k < c.c + (c.cs ?? 1); k++) { const a = labels.get(k) ?? []; if (!a.includes(t)) a.push(t); labels.set(k, a) }
    }))
    const next = regs[i + 1]
    const after = rowsIn(reg.start + 1, next ? next.start - 1 : tpl.rows[tpl.rows.length - 1].r).filter((r) => r.r > reg.end)
    const footer: Record<string, Val>[] = []
    after.forEach((r) => {
      if (next && r.r >= cursorOf(next, regs, tpl)) return
      const rec: Record<string, Val> = {}
      r.c.forEach((c) => {
        const L = colLetter(c.c)
        const ov = page.values?.[`${L}${r.r}`]
        const v = ov !== undefined ? ov : c.v !== undefined && !c.d ? c.v : undefined
        if (v !== undefined && v !== '') rec[L] = v
      })
      if (Object.keys(rec).length && rowBordered(r)) footer.push(rec)
      else {
        const line = r.c.map((c) => staticText(r, c)).filter(Boolean).join(' ')
        if (line) notes.push(line)
      }
    })
    blocks.push({ heading: heading.join(' · ') || undefined, header: [], cols: [], regionId: reg.id, footer, labels })
    cursor = reg.end + 1
  })
  return { tpl, blocks, title, infoRows, notes }
}
// baris pertama setelah region sebelum judul blok berikutnya dianggap milik blok berikutnya
function cursorOf(next: { start: number }, _r: unknown, tpl: Tpl) {
  let r = next.start
  // mundur melewati baris judul/header blok berikutnya
  const rows = tpl.rows.filter((x) => x.r < next.start).map((x) => x.r)
  const set = new Set(rows)
  while (set.has(r - 1) && r - 1 > 0 && isHeaderish(tpl, r - 1)) r--
  return r
}
function isHeaderish(tpl: Tpl, r: number) {
  const row = tpl.rows.find((x) => x.r === r)
  return !!row && row.c.some((c) => c.v !== undefined && !c.d && (STYLES[c.s].bt || STYLES[c.s].bb || STYLES[c.s].b))
}

/* ---------- tabel generik ---------- */
function RegionTable({ b, rows, tplId }: { b: Block; rows: Record<string, Val>[]; tplId: string }) {
  const tpl = TEMPLATES[tplId]
  const data = rows.filter((r) => Object.entries(r).some(([k, v]) => k !== 'A' && v !== '' && v !== null && v !== undefined))
  const hasNo = rows.some((r) => typeof r.A === 'number')
  const letters = tpl.cols.map((_, i) => colLetter(i))
  const cols = letters.filter((L, i) => b.labels.has(i) && (data.length === 0 || data.some((r) => r[L] !== undefined && r[L] !== '') || b.footer.some((f) => f[L] !== undefined)) || (L === 'A' && hasNo))
  if (!cols.length) return null
  const label = (L: string) => { const a = b.labels.get(letters.indexOf(L)) ?? (L === 'A' ? ['NO'] : []); return a }
  return (
    <div>
      {b.heading && <h3 className="mb-2 font-display text-sm font-bold text-violet-700 dark:text-violet-300">{b.heading}</h3>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {cols.map((L, i) => {
                const a = label(L)
                return (
                  <th key={L} className={`sticky top-0 z-10 whitespace-nowrap border-b border-violet-100 bg-gradient-to-b from-violet-50 to-violet-100/70 px-3 py-2 text-left align-bottom text-[11px] font-bold uppercase tracking-wide text-violet-800 dark:border-white/10 dark:from-violet-500/20 dark:to-violet-500/10 dark:text-violet-200 ${i === 0 ? 'rounded-tl-2xl' : ''} ${i === cols.length - 1 ? 'rounded-tr-2xl' : ''}`}>
                    {a.length > 1 && <div className="text-[9px] font-semibold normal-case tracking-normal text-violet-400">{a.slice(0, -1).join(' › ')}</div>}
                    {a[a.length - 1] ?? ''}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-sm text-slate-400">Belum ada data</td></tr>}
            {data.map((r, ri) => (
              <motion.tr key={ri} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(ri, 20) * 0.01 }} className="group even:bg-slate-50/60 hover:bg-violet-50/70 dark:even:bg-white/[0.03] dark:hover:bg-white/5">
                {cols.map((L) => (
                  <td key={L} className={`whitespace-nowrap border-b border-slate-100 px-3 py-2 dark:border-white/5 ${isRight(r[L]) ? 'text-right tabular-nums' : ''} ${L === 'A' ? 'w-10 text-slate-400' : ''}`}>
                    {L === 'A' && typeof r.A === 'number' ? ri + 1 : <Cell v={r[L]} />}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
          {b.footer.length > 0 && (
            <tfoot>
              {b.footer.map((f, fi) => (
                <tr key={fi} className="bg-violet-50/80 font-bold dark:bg-violet-500/10">
                  {cols.map((L) => <td key={L} className={`whitespace-nowrap px-3 py-2 ${isRight(f[L]) ? 'text-right tabular-nums' : ''}`}>{f[L] !== undefined ? <Cell v={f[L]} /> : ''}</td>)}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function Header({ title, lines, def }: { title: string; lines: string[]; def: ReportDef }) {
  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 p-4 text-white shadow-lg sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20"><def.icon size={22} /></div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-extrabold leading-tight sm:text-xl">{title || def.title}</h2>
          {lines.length > 0 && <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-white/85">{lines.map((l, i) => <span key={i}>{l}</span>)}</div>}
        </div>
      </div>
    </div>
  )
}

function Generic({ page, def, top, hideInfo }: { page: PageSpec; def: ReportDef; top?: ReactNode; hideInfo?: boolean }) {
  const { blocks, title, infoRows, notes } = useMemo(() => analyse(page.tplId, page), [page])
  return (
    <div className="space-y-4">
      <Header title={title} lines={hideInfo ? [] : infoRows} def={def} />
      {top}
      {blocks.map((b) => <RegionTable key={b.regionId} b={b} rows={page.regions?.[b.regionId] ?? []} tplId={page.tplId} />)}
      {notes.length > 0 && <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-white/5"><Info size={14} className="mt-0.5 shrink-0" /><div>{notes.map((n, i) => <div key={i}>{n}</div>)}</div></div>}
    </div>
  )
}

/* ---------- kartu kecil ---------- */
function Mini({ title, head, rows }: { title: string; head: string[]; rows: Val[][] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-transparent px-3 py-2 text-xs font-bold text-violet-800 dark:border-white/10 dark:from-violet-500/15 dark:text-violet-200">{title}</div>
      <table className="w-full text-sm">
        {head.length > 0 && <thead><tr>{head.map((h, i) => <th key={i} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-white/5">
              {r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j ? 'text-right tabular-nums' : ''} ${i === rows.length - 1 && r[0] === 'JUMLAH' ? 'font-bold' : ''}`}><Cell v={c} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/* ---------- Inventarisasi Kampung KB ---------- */
function KampungKBWeb({ page, def }: { page: PageSpec; def: ReportDef }) {
  const v = page.values ?? {}
  const g = (a: string): Val => v[a] ?? ''
  const t = (a: string) => clean(String(v[a] && typeof v[a] === 'object' ? (v[a] as CellObj).v : v[a] ?? ''))
  const lines = [t('A2'), t('A3'), 'PADUKUHAN : MANTUP', 'KALURAHAN : BATURETNO', 'KAPANEWON : BANGUNTAPAN']
  const rowsOf = (items: [string, string][]): Val[][] => items.map(([l, a]) => [l, g(a)])
  return (
    <div className="space-y-5">
      <Header title="INVENTARISASI DATA KAMPUNG KB" lines={lines} def={def} />
      <h3 className="font-display text-base font-bold text-slate-800 dark:text-white">I. Data Kependudukan</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Mini title="1. KK menurut jenis kelamin" head={['Jenis kelamin KK', 'Jumlah']} rows={rowsOf([['Laki-laki', 'C9'], ['Perempuan', 'C10'], ['JUMLAH', 'C11']])} />
        <Mini title="2. Penduduk menurut jenis kelamin" head={['Jenis kelamin', 'Jumlah']} rows={rowsOf([['Laki-laki', 'C15'], ['Perempuan', 'C16'], ['JUMLAH', 'C17']])} />
        <Mini title="3. KK menurut tingkat pendidikan" head={['Tingkat pendidikan', 'Jumlah']} rows={rowsOf([['Tidak sekolah', 'C21'], ['Tidak lulus SD', 'C22'], ['SD', 'C23'], ['SLTP', 'C24'], ['SLTA', 'C25'], ['Perguruan tinggi', 'C26']])} />
        <Mini title="4. Jiwa menurut kelompok umur" head={['Kelompok umur', 'Jumlah']} rows={rowsOf([['1 - < 2 th', 'C30'], ['2 - < 5 th', 'C31'], ['5 - 6 th', 'C32'], ['7 - 14 th', 'C33'], ['15 - 24 th', 'C34'], ['25 - 49 th', 'C35'], ['50 - < 65 th', 'C36'], ['> 65 th', 'C37']])} />
        <Mini title="5. Penduduk menurut usia tertentu" head={['Kelompok', 'Jumlah']} rows={rowsOf([['Usia 18-56 th', 'C41'], ['Remaja putri 12-17 th', 'C42'], ['Perempuan 15-49 th', 'C43']])} />
      </div>
      <h3 className="font-display text-base font-bold text-slate-800 dark:text-white">II. Data Keluarga Berencana</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Mini title="1. PUS menurut kelompok umur wanita" head={['Kelompok umur', 'Jumlah']} rows={rowsOf([['< 15 th', 'H9'], ['15 - 19 th', 'H10'], ['20 - 34 th', 'H11'], ['35 - 49 th', 'H12'], ['JUMLAH', 'H13']])} />
        <Mini title="2. Peserta KB per jenis kontrasepsi" head={['Kontrasepsi', 'Jumlah']} rows={rowsOf([['IUD', 'H17'], ['MOW', 'H18'], ['MOP', 'H19'], ['Implan', 'H20'], ['Suntik', 'H21'], ['Pil', 'H22'], ['Kondom', 'H23'], ['JUMLAH', 'H24']])} />
        <Mini title="3. PUS bukan peserta KB" head={['Uraian', 'Jumlah']} rows={rowsOf([['Hamil', 'H28'], ['Ingin anak segera', 'H29'], ['Ingin anak ditunda', 'H30'], ['Tidak ingin anak lagi', 'H31'], ['JUMLAH', 'H32']])} />
      </div>
      <h3 className="font-display text-base font-bold text-slate-800 dark:text-white">III. Data Ketahanan Keluarga</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Mini title="1. Balita ikut Posyandu & BKB" head={['Umur', 'Jumlah', 'Posyandu ikut', 'Tdk ikut', 'BKB ikut', 'Tdk ikut']} rows={[['1 - < 2 th', ...['L5', 'M5', 'N5', 'O5', 'P5'].map(g)], ['2 - < 5 th', ...['L6', 'M6', 'N6', 'O6', 'P6'].map(g)]]} />
        <Mini title="2. Remaja ikut PIK-R & BKR" head={['Umur', 'Jumlah', 'PIK-R ikut', 'Tdk ikut', 'BKR ikut', 'Tdk ikut']} rows={[['7 - 14 th', 11], ['15 - 19 th', 12], ['19 - 24 th', 13]].map(([l, r]) => [l as string, ...['L', 'M', 'N', 'O', 'P'].map((c) => g(c + r))])} />
        <Mini title="3. Lansia & keluarga lansia (BKL)" head={['Uraian', 'Jumlah', 'Ikut', 'Tdk ikut']} rows={[['Lansia', 17], ['Kelg. lansia', 18]].map(([l, r]) => [l as string, g('L' + r), g('M' + r), g('O' + r)])} />
        <Mini title="4. Kelompok UPPKA" head={['Nama kelompok', 'Jumlah anggota']} rows={[22, 23, 24, 25, 26].map((r) => [g('K' + r), g('L' + r)])} />
      </div>
    </div>
  )
}

/* ---------- Data Warga TP PKK ---------- */
function Field({ k, children }: { k: string; children: ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-dashed border-slate-100 py-1.5 text-sm dark:border-white/5"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{children || <span className="text-slate-300">—</span>}</span></div>
}
const YT = ({ v }: { v: string }) => (v === 'Ya' ? <Chip color="emerald">Ya</Chip> : v === 'Tidak' ? <Chip color="rose">Tidak</Chip> : <Minus size={14} className="inline text-slate-300" />)

function TPPKKWeb({ page, def }: { page: PageSpec; def: ReportDef }) {
  const w = page.warga!
  const acuan = new Date().toISOString().slice(0, 10)
  const act = useContext(SheetCtx)
  const u = hitungUmur(w.tglLahir, acuan)
  const keg: [string, string, string][] = [
    ['Penghayatan dan Pengamalan Pancasila', w.ppp, w.kegiatanDiikuti], ['Kerja Bakti', w.kerjaBakti, w.kerjaBaktiJenis], ['Rukun Kematian', w.rukunKematian, w.rukunKematianJenis],
    ['Kegiatan Keagamaan', w.keagamaan, w.keagamaanJenis], ['Jimpitan', w.jimpitan, ''], ['Arisan', w.arisan, ''], ['Pengumpulan Barang Bekas', w.barkas, ''], ['Apotek Hidup', w.apotekHidup, ''],
  ]
  return (
    <div className="space-y-4">
      <Header title="DATA WARGA TP PKK" lines={[`Dasa Wisma: ${w.dasawisma}`, `No Registrasi: ${w.noReg}`]} def={def} />
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4"><h4 className="mb-2 font-display text-sm font-bold text-violet-700">Identitas</h4>
          <Field k="Nama"><button className="font-semibold text-indigo-700 hover:underline" onClick={() => act.editWarga(w.id)}>{w.nama}</button></Field>
          <Field k="NIK / Jabatan">{w.nik} · {w.jabatan}</Field>
          <Field k="Jenis kelamin">{w.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</Field>
          <Field k="Tempat, tgl lahir / umur">{w.tempatLahir}{w.tglLahir ? `, ${tglIndo(w.tglLahir)}` : ''}{u !== null ? ` (${u} th)` : ''}</Field>
          <Field k="Status perkawinan">{w.statusKawin}</Field>
          <Field k="Status dalam keluarga">{w.statusKeluarga}</Field>
          <Field k="Agama">{w.agama}</Field>
        </Card>
        <Card className="p-4"><h4 className="mb-2 font-display text-sm font-bold text-violet-700">Alamat, pendidikan & pekerjaan</h4>
          <Field k="Alamat">{w.alamat}</Field>
          <Field k="Kelurahan / Kecamatan">{w.desa} / {w.kecamatan}</Field>
          <Field k="Kabupaten / Provinsi">{w.kabupaten} / {w.provinsi}</Field>
          <Field k="Pendidikan">{w.pendidikan}</Field>
          <Field k="Pekerjaan">{w.pekerjaan}</Field>
        </Card>
        <Card className="p-4 md:col-span-2"><h4 className="mb-2 font-display text-sm font-bold text-violet-700">Kesehatan, pendidikan & ekonomi</h4>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <Field k="Akseptor KB">{w.kontrasepsi ? <Chip color="emerald">{w.kontrasepsi}</Chip> : <YT v="Tidak" />}</Field>
            <Field k="Aktif posyandu"><YT v={w.posyandu} /> {w.frekPosyandu && `${w.frekPosyandu}x / bulan`}</Field>
            <Field k="Bina Keluarga Balita"><YT v={w.bkb} /></Field>
            <Field k="Memiliki tabungan"><YT v={w.tabungan} /></Field>
            <Field k="Kelompok belajar"><YT v={w.kelompokBelajar} /> {w.paket.join(', ')}</Field>
            <Field k="PAUD / sejenis"><YT v={w.paud} /></Field>
            <Field k="Kegiatan koperasi"><YT v={w.koperasi} /> {w.jenisKoperasi}</Field>
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-50 to-transparent px-4 py-2 font-display text-sm font-bold text-violet-700 dark:from-violet-500/15">Kegiatan warga</div>
        <table className="w-full text-sm"><thead><tr className="text-left text-[10px] font-bold uppercase text-slate-400"><th className="px-4 py-1.5">Kegiatan</th><th className="px-4">Aktivitas (Y/T)</th><th className="px-4">Keterangan</th></tr></thead>
          <tbody>{keg.map(([k, y, j]) => <tr key={k} className="border-t border-slate-100 dark:border-white/5"><td className="px-4 py-2">{k}</td><td className="px-4"><YT v={y} /></td><td className="px-4 text-slate-500">{j}</td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  )
}

/* ---------- Data Keluarga ---------- */
function DataKeluargaWeb({ page, def }: { page: PageSpec; def: ReportDef }) {
  const f = page.fam!
  const v = page.values ?? {}
  const n = (a: string) => (v[a] === undefined || v[a] === '' ? 0 : typeof v[a] === 'object' ? Number((v[a] as CellObj).v) : Number(v[a]))
  const k = f.k
  const stat = (l: string, x: number, c: string) => <div key={l} className={`rounded-xl px-3 py-2 text-center ${c}`}><div className="font-display text-xl font-extrabold tabular-nums">{x}</div><div className="text-[10px] font-semibold uppercase">{l}</div></div>
  return (
    <Generic page={page} def={def} hideInfo top={
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {stat('Anggota', f.ang.length, 'bg-indigo-50 text-indigo-700')}{stat('Laki-laki', n('G10'), 'bg-sky-50 text-sky-700')}{stat('Perempuan', n('G12'), 'bg-pink-50 text-pink-700')}
          {stat('KK', n('E13'), 'bg-amber-50 text-amber-700')}{stat('Balita', n('G14'), 'bg-yellow-50 text-yellow-700')}{stat('PUS', n('J14'), 'bg-rose-50 text-rose-700')}{stat('WUS', n('M14'), 'bg-fuchsia-50 text-fuchsia-700')}{stat('Lansia', n('O16'), 'bg-orange-50 text-orange-700')}
        </div>
        <Card className="p-4">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <Field k="Kepala rumah tangga">{f.kepala?.nama}</Field><Field k="Dasa wisma">{f.kepala?.dasawisma}</Field>
            <Field k="Alamat">{f.kepala?.alamat}</Field><Field k="Dusun / Desa">{f.kepala?.dusun} / {f.kepala?.desa}</Field>
            <Field k="Makanan pokok">{k.makananPokok}</Field><Field k="Sumber air">{k.sumberAir}</Field>
            <Field k="MCK & septic tank">{(Number(k.kamarMandi) || 0) > 0 ? `Ya (${k.jumlahWC} buah)` : 'Tidak'}</Field><Field k="Tempat sampah">{k.tps}</Field>
            <Field k="SPAL"><YT v={k.spal} /></Field><Field k="Kriteria rumah">{k.kriteriaRumah} · {k.rumahSehat}</Field>
            <Field k="UP2K"><YT v={f.kepala?.up2k ?? ''} /> {f.kepala?.jenisUp2k}</Field><Field k="Usaha kesehatan lingkungan"><YT v={f.kepala?.jumantik ?? ''} /></Field>
          </div>
        </Card>
      </div>
    } />
  )
}

/* ---------- pintu masuk ---------- */
export default function WebReport({ page, def }: { page: PageSpec; def: ReportDef }) {
  if (def.slug === 'kampung-kb') return <KampungKBWeb page={page} def={def} />
  if (def.slug === 'data-warga-tp-pkk' && page.warga) return <TPPKKWeb page={page} def={def} />
  if (def.slug === 'data-keluarga' && page.fam) return <DataKeluargaWeb page={page} def={def} />
  return <Generic page={page} def={def} />
}
