import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LayoutDashboard, FileText, Sparkles, Archive, ArrowLeft, Eye, FileSpreadsheet, Minus, PencilLine, Plus, Printer, Settings2, Trash2, Users, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { REPORTS } from '@/reports/registry'
import { useStore, useLive } from '@/lib/store'
import { useSession } from '@/lib/session'
import { ymOf } from '@/lib/rules'
import { useEditor } from '@/components/EditorHost'
import { Avatar, Button, Card, Empty, Input, Modal, PageHeader, useConfirm } from '@/components/ui'
import SheetView, { SheetCtx, type PrintArea } from '@/sheet/SheetView'
import { TEMPLATES, colIndex } from '@/sheet/engine'
import type { Ctx, ReportOpts, ReportParams } from '@/reports/common'
import ReportControls, { ManualKB } from '@/reports/ReportControls'
import { makeCtx } from '@/reports/ctx'
import WebReport from '@/reports/WebView'
import PrintPanel from '@/reports/PrintPanel'
import { effectiveScale, excelShrunk, pageGeometry, usePrintSettings } from '@/reports/usePrint'
import { eksporTabel } from '@/lib/excel'
import { hapusDenganUndo } from '@/lib/crud'
import { todayISO } from '@/lib/format'
import { BULAN } from '@/lib/options'
import type { Warga } from '@/lib/types'

let lastParams: ReportParams | null = null
const initialParams = (): ReportParams => {
  if (lastParams) return lastParams
  const d = new Date()
  return { acuan: todayISO(), bulan: d.getMonth(), tahun: d.getFullYear(), dawis: '', pick: '', semua: false, semuaPeriode: false }
}

export default function LaporanPage() {
  const { slug } = useParams()
  const def = REPORTS.find((r) => r.slug === slug)
  const nav = useNavigate()
  if (!def) return <Card><Empty title="Laporan tidak ditemukan" action={<Button onClick={() => nav('/laporan')}>Kembali</Button>} /></Card>
  if (def.slug === 'arsip') return <ArsipPage />
  return <ReportView key={def.slug} slug={def.slug} />
}

function ReportView({ slug }: { slug: string }) {
  const def = REPORTS.find((r) => r.slug === slug)!
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const st = useStore()
  const { openWarga } = useEditor()
  const warga = useLive('warga')
  const keluarga = useLive('keluarga')
  const kelahiran = useLive('kelahiran')
  const kematian = useLive('kematian')
  const pesertaKB = useLive('pesertaKB')
  const pusBaru = useLive('pusBaru')
  const dasawisma = useLive('dasawisma')
  const kbAll = useStore((s) => s.kampungKB)
  const settings = useStore((s) => s.settings)

  const [p, setPState] = useState<ReportParams>(() => {
    const x = initialParams()
    const kk = sp.get('kk')
    return kk ? { ...x, pick: kk, semua: false } : x
  })
  const setP = (x: Partial<ReportParams>) => setPState((o) => (lastParams = { ...o, ...x }))
  const [o, setOState] = useState<ReportOpts>({ barisKosong: def.defaults?.barisKosong ?? false, isiKosong: false })
  const setO = (x: Partial<ReportOpts>) => setOState((v) => ({ ...v, ...x }))
  const [ps, setPs, resetPs] = usePrintSettings(slug, def.tpl)
  const [view, setViewState] = useState<'web' | 'sheet'>(() => { try { return localStorage.getItem('siwarga-view') === 'sheet' ? 'sheet' : 'web' } catch { return 'web' } })
  const setView = (v: 'web' | 'sheet') => { setViewState(v); try { localStorage.setItem('siwarga-view', v) } catch { /* abaikan */ } }
  const web = view === 'web'
  const [panel, setPanel] = useState(false)
  const [editText, setEditText] = useState(false)
  const [drillState, setDrill] = useState<{ title: string; list: Warga[] } | null>(null)
  const [edit, setEdit] = useState<{ key: string; cur: string } | null>(null)
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [skin, setSkinState] = useState<boolean>(() => { try { return localStorage.getItem('siwarga-skin') !== 'excel' } catch { return true } })
  const setSkin = (b: boolean) => { setSkinState(b); try { localStorage.setItem('siwarga-skin', b ? 'cantik' : 'excel') } catch { /* abaikan */ } }
  const [nat, setNat] = useState({ w: 0, h: 0 })
  const [stageW, setStageW] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)

  // dasawisma wajib untuk rekap per dasawisma
  useEffect(() => {
    if (def.uses.includes('dawisWajib') && !p.dawis && dasawisma[0]) setP({ dawis: dasawisma[0].nama })
  }, [def, p.dawis, dasawisma])

  // akun viewer selalu memakai tanggal yang dikunci admin (atau hari ini bila belum dikunci) dan tidak melihat kontrol tanggal
  const viewer = useSession((s) => s.server && s.user?.role === 'viewer')
  const isAdmin = useSession((s) => !s.server || s.user?.role === 'admin')
  const kunci = settings.kunci
  const pe: ReportParams = useMemo(() => (viewer && kunci?.aktif ? { ...p, acuan: kunci.acuan, bulan: kunci.bulan, tahun: kunci.tahun } : p), [viewer, kunci, p])
  const periode = ymOf(pe.tahun, pe.bulan)
  const ym = def.uses.includes('bulan') || def.uses.includes('tahun') ? periode : def.uses.includes('acuan') ? pe.acuan.slice(0, 7) : periode
  const ctx: Ctx = useMemo(
    () => makeCtx({ warga, keluarga, kelahiran, kematian, pesertaKB, pusBaru, dasawisma, kampungKB: kbAll, settings }, pe, o, ym),
    [pe, o, ym, warga, keluarga, kelahiran, kematian, pesertaKB, pusBaru, dasawisma, kbAll, settings],
  )
  const pages = useMemo(() => def.build(ctx), [def, ctx])

  const tpl = TEMPLATES[def.tpl]
  const area: PrintArea | null = ps.areaOn ? { c1: Math.max(0, colIndex(ps.c1 || 'A')), c2: Math.max(0, colIndex(ps.c2 || 'A')), r1: ps.r1, r2: ps.r2 } : null
  const g = pageGeometry(ps)
  const eff = effectiveScale(ps, nat)
  const pagesAcross = nat.w ? Math.max(1, Math.ceil((nat.w * eff) / g.printW - 0.001)) : 1
  const pagesDown = nat.h ? Math.max(1, Math.ceil((nat.h * eff) / g.printH - 0.001)) : 1
  const fitZoom = stageW && nat.w ? Math.min(1, (stageW - 24) / nat.w) : 1
  const screenZoom = web ? 1 : panel && ps.guides ? eff : zoom === 'fit' ? (stageW > 0 && stageW < 640 ? Math.max(fitZoom, 0.55) : fitZoom) : zoom

  // ukuran asli tabel (tanpa zoom) untuk perhitungan skala
  useLayoutEffect(() => {
    const el = zoomRef.current
    if (!el) return
    let w = tpl.cols.reduce((a, b) => a + b, 0)
    if (area) w = tpl.cols.slice(area.c1, area.c2 + 1).reduce((a, b) => a + b, 0)
    let h = 0
    // tinggi asli dihitung dari rasio lebar (tidak tergantung zoom layar/cetak)
    el.querySelectorAll<HTMLElement>('.sheet-page > table').forEach((t) => { const r = t.getBoundingClientRect(); if (r.width > 0) h = Math.max(h, (r.height * w) / r.width) })
    setNat((x) => (Math.abs(x.w - w) < 1 && Math.abs(x.h - h) < 1 ? x : { w, h }))
  })
  // cubit dua jari untuk memperbesar / memperkecil lembar di HP
  const zoomNow = useRef(1)
  zoomNow.current = screenZoom
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    let d0 = 0, z0 = 1
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const start = (e: TouchEvent) => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = zoomNow.current } }
    const move = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !d0) return
      e.preventDefault()
      setZoom(Math.min(2, Math.max(0.2, +(z0 * (dist(e.touches) / d0)).toFixed(2))))
    }
    const end = () => { d0 = 0 }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end) }
  }, [])
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageW(el.clientWidth))
    ro.observe(el)
    setStageW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const printCss = `@page { size: ${g.pageW}mm ${g.pageH}mm; margin: ${ps.mt}mm ${ps.mr}mm ${ps.mb}mm ${ps.ml}mm; } @media print { .sheet-zoom { zoom: ${eff} !important; } }`

  const overrides = settings.teks
  const actions = useMemo(() => ({ drill: (title: string, list: Warga[]) => setDrill({ title, list }), editWarga: (id: string) => { if (!viewer) openWarga(id) } }), [openWarga, viewer])

  function arsipkan() {
    if (!zoomRef.current) return
    const label = `${BULAN[pe.bulan]} ${pe.tahun}`
    st.create('arsip', { judul: `${def.title} — ${label}`, jenis: def.slug, periode: label, html: zoomRef.current.innerHTML, deletedAt: null }, def.title)
    toast.success('Laporan disimpan ke Arsip 📁')
  }

  const single = pages.length === 1
  return (
    <SheetCtx.Provider value={actions}>
      <style>{printCss}</style>
      <div className="no-print mb-3">
        <button onClick={() => nav('/laporan')} className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-violet-600"><ArrowLeft size={16} /> Semua laporan</button>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg"><def.icon size={22} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-extrabold leading-tight sm:text-xl">{def.title}</h1>
            <p className="text-xs text-slate-500">Sama dengan sheet Excel: <i>{def.sheet}</i></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!web && <Button variant={skin ? 'soft' : 'outline'} icon={Sparkles} size="sm" aria-label="Tampilan cantik" title="Tampilan layar cantik (cetak tetap seperti Excel)" onClick={() => setSkin(!skin)}><span className="hidden sm:inline">{skin ? 'Tampilan cantik' : 'Seperti Excel'}</span></Button>}
            {!web && !viewer && <Button variant={editText ? 'soft' : 'outline'} icon={PencilLine} onClick={() => setEditText(!editText)} size="sm" aria-label="Ubah teks"><span className="hidden sm:inline">Ubah teks</span></Button>}
            <Button variant="outline" icon={FileSpreadsheet} size="sm" aria-label="Excel" onClick={() => zoomRef.current && (eksporTabel(zoomRef.current, def.title) ? toast.success('File Excel diunduh') : toast.error('Tidak ada tabel'))}><span className="hidden sm:inline">Excel</span></Button>
            {def.uses.includes('bulan') && !viewer && <Button variant="outline" icon={Archive} size="sm" aria-label="Arsipkan" onClick={arsipkan}><span className="hidden sm:inline">Arsipkan</span></Button>}
            <Button variant={!web && panel ? 'soft' : 'outline'} icon={Settings2} size="sm" aria-label="Atur cetak" onClick={() => { if (web) { setView('sheet'); setPanel(true) } else setPanel(!panel) }}>Atur cetak</Button>
            <Button icon={Printer} size="sm" onClick={() => window.print()}>Cetak / PDF</Button>
          </div>
        </div>
        <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/10" role="tablist">
          {([['web', 'Tampilan', LayoutDashboard], ['sheet', 'Lembar cetak', FileText]] as const).map(([k, l, I]) => (
            <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === k ? 'bg-white text-violet-700 shadow dark:bg-violet-600 dark:text-white' : 'text-slate-500'}`}><I size={14} />{l}</button>
          ))}
        </div>
        {!web && editText && <p className="mt-2 rounded-xl bg-violet-50 p-2 text-xs text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">Mode ubah teks: klik teks tetap di lembar (judul, RT, desa, dll.) untuk menggantinya. Perubahan berlaku untuk semua cetakan laporan ini.</p>}
        <ReportControls uses={def.uses} p={p} setP={setP} o={o} setO={setO} ctx={ctx} viewer={!!viewer} admin={isAdmin} />
        {def.uses.includes('manualKB') && !viewer && <ManualKB periode={periode} />}
        {!web && panel && <PrintPanel tplId={def.tpl} ps={ps} set={setPs} reset={resetPs} eff={eff} pagesAcross={pagesAcross} pagesDown={pagesDown} shrunk={excelShrunk(ps, nat)} />}
        {!web && <div className="mt-3 flex items-center justify-end gap-1 text-xs text-slate-500">
          <ZoomIn size={14} /> <span className="hidden sm:inline">Tampilan layar</span><span className="sm:hidden">Cubit untuk zoom</span>
          <Button size="sm" variant="outline" aria-label="Perkecil" onClick={() => setZoom(Math.max(0.2, +(screenZoom - 0.1).toFixed(2)))}>{''}<Minus size={14} /></Button>
          <span className="w-12 text-center font-semibold tabular-nums">{Math.round(screenZoom * 100)}%</span>
          <Button size="sm" variant="outline" aria-label="Perbesar" onClick={() => setZoom(Math.min(2, +(screenZoom + 0.1).toFixed(2)))}>{''}<Plus size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setZoom('fit')}>Pas layar</Button>
          <Button size="sm" variant="ghost" onClick={() => setZoom(1)}>100%</Button>
        </div>}
      </div>

      {web && (
        <div className="no-print mt-4 space-y-8">
          {pages.length === 0 && <Empty title="Tidak ada data" />}
          {pages.map((pg) => <WebReport key={pg.key} page={pg} def={def} />)}
          <p className="text-center text-xs text-slate-400">Ini tampilan layar. Tombol <b>Cetak / PDF</b> mencetak lembar seperti di Excel (atur di <b>Atur cetak</b>).</p>
        </div>
      )}

      <div ref={stageRef} style={{ touchAction: 'pan-x pan-y' }} className={`sheet-stage mt-2 ${web ? 'sheet-offscreen' : ''} ${editText ? 'xl-edit-mode' : ''} ${ps.hc ? 'hc' : ''}`}>
        <div ref={zoomRef} className={`sheet-zoom ${skin ? 'xl-skin' : ''} ${ps.mono ? 'mono' : ''}`} style={{ zoom: screenZoom }}>
          {pages.length === 0 && <Empty title="Tidak ada data" />}
          {pages.map((pg) => (
            <div key={pg.key} className="sheet-page">
              <SheetView {...pg} overrides={overrides} editText={editText} onEditText={(key, cur) => setEdit({ key, cur })} area={area} repeatHeader={ps.repeat} />
              {single && panel && ps.guides && nat.w > 0 && (
                <>
                  {Array.from({ length: Math.max(0, pagesAcross - 1) }, (_, i) => <div key={'v' + i} className="sheet-guide-v no-print" data-label={`hal. kolom ${i + 2}`} style={{ left: ((i + 1) * g.printW) / eff }} />)}
                  {Array.from({ length: Math.max(0, pagesDown - 1) }, (_, i) => <div key={'h' + i} className="sheet-guide-h no-print" data-label={`hal. ${i + 2}`} style={{ top: ((i + 1) * g.printH) / eff }} />)}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!drillState} onClose={() => setDrill(null)} title={`${drillState?.title ?? ''} (${drillState?.list.length ?? 0})`} icon={Users}>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {drillState?.list.map((w) => (
            <button key={w.id} onClick={() => { setDrill(null); if (!viewer) openWarga(w.id) }} className="flex w-full items-center gap-3 py-2 text-left hover:bg-violet-50 dark:hover:bg-white/5">
              <Avatar nama={w.nama} jk={w.jk} />
              <div><div className="text-sm font-semibold">{w.nama}</div><div className="text-xs text-slate-500">{w.statusKeluarga} · {w.dasawisma}</div></div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Ubah teks lembar" size="sm" icon={PencilLine}
        footer={<>
          {edit && overrides[edit.key] !== undefined && <Button variant="ghost" onClick={() => { const t = { ...overrides }; delete t[edit.key]; st.setSettings({ teks: t }); setEdit(null) }}>Kembalikan ke Excel</Button>}
          <Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button>
          <Button onClick={() => { if (edit) { st.setSettings({ teks: { ...overrides, [edit.key]: edit.cur } }); toast.success('Teks diubah'); setEdit(null) } }}>Simpan</Button>
        </>}>
        <Input autoFocus value={edit?.cur ?? ''} onChange={(e) => edit && setEdit({ ...edit, cur: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && edit && (st.setSettings({ teks: { ...overrides, [edit.key]: edit.cur } }), setEdit(null))} />
        <p className="mt-2 text-xs text-slate-400">Cell: {edit?.key}</p>
      </Modal>
    </SheetCtx.Provider>
  )
}

function ArsipPage() {
  const viewer = useSession((s) => s.server && s.user?.role === 'viewer')
  const arsip = useLive('arsip').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [view, setView] = useState<string | null>(null)
  const confirm = useConfirm()
  const a = arsip.find((x) => x.id === view)
  return (
    <div>
      <PageHeader title="Arsip Laporan" subtitle="Laporan bulanan yang sudah disimpan (angka terkunci)" icon={Archive} color="slate" />
      {arsip.length === 0 ? <Card><Empty title="Belum ada arsip" desc='Buka laporan yang ada pilihan bulan, lalu klik "Arsipkan".' icon={Archive} /></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {arsip.map((x) => (
            <Card key={x.id} className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/10"><Archive size={18} /></div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{x.judul}</div><div className="text-xs text-slate-500">Disimpan {new Date(x.createdAt).toLocaleString('id-ID')}</div></div>
              <Button size="sm" variant="soft" icon={Eye} onClick={() => setView(x.id)}>Lihat</Button>
              {!viewer && <Button size="sm" variant="ghost" icon={Trash2} aria-label="Hapus" onClick={async () => { if (await confirm({ title: 'Hapus arsip?', message: x.judul, danger: true, okText: 'Hapus' })) hapusDenganUndo('arsip', x.id, x.judul) }}>{''}</Button>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!a} onClose={() => setView(null)} title={a?.judul ?? ''} size="full" footer={<Button icon={Printer} onClick={() => window.print()}>Cetak</Button>}>
        <div className="sheet-stage"><div className="sheet-zoom" dangerouslySetInnerHTML={{ __html: a?.html ?? '' }} /></div>
      </Modal>
    </div>
  )
}
