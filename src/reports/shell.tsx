import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileSpreadsheet, Archive, Settings2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Button, Card, Field, Input, Modal, Segmented, Toggle, Avatar } from '@/components/ui'
import { eksporTabel } from '@/lib/excel'
import { BULAN } from '@/lib/options'
import { tglIndo, todayISO } from '@/lib/format'
import type { Warga } from '@/lib/types'
import type { ReportDef } from '@/lib/modules'

export interface ReportParams {
  acuan: string
  bulan: number // 0-11
  tahun: number
  dawis: string
}

/* ---------- drill-down & edit dari laporan ---------- */
const DrillCtx = createContext<(title: string, list: Warga[]) => void>(() => {})

/** Angka yang bisa diklik untuk melihat daftar nama di baliknya */
export function N({ list, title }: { list: Warga[]; title: string }) {
  const open = useContext(DrillCtx)
  if (!list.length) return <>0</>
  return <span className="drill" onClick={() => open(title, list)}>{list.length}</span>
}

/** Nama warga yang bisa diklik untuk ubah cepat */
export function NameLink({ w }: { w?: Warga }) {
  const { openWarga } = useEditor()
  if (!w) return null
  return <span className="edit-link" title="Klik untuk ubah data" onClick={() => openWarga(w.id)}>{w.nama}</span>
}

export function Kop({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <h2>{title}</h2>
      {sub && <div style={{ textAlign: 'center', fontWeight: 600 }}>{sub}</div>}
      {right && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>{right}</div>}
    </div>
  )
}

export function Wilayah({ extra }: { extra?: [string, string][] }) {
  const s = useStore((x) => x.settings)
  const rows: [string, string][] = [
    ...(extra ?? []),
    ['RT / Dusun', `${s.rt} / ${s.padukuhan}`],
    ['Kalurahan', s.kalurahan],
    ['Kapanewon', s.kapanewon],
    ['Kabupaten', s.kabupaten],
    ['Provinsi', s.provinsi],
  ]
  return (
    <table className="kv">
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a}><td style={{ width: 150 }}>{a}</td><td>: {b}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

export function TTD({ kiri = 'Mengetahui,\nKetua TP PKK', kanan = 'Pembuat Laporan', namaKiri, namaKanan }: { kiri?: string; kanan?: string; namaKiri?: string; namaKanan?: string }) {
  const s = useStore((x) => x.settings)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, breakInside: 'avoid' }}>
      <div style={{ textAlign: 'center', width: 220, whiteSpace: 'pre-line' }}>
        {kiri} {s.rt}
        <div style={{ height: 56 }} />
        <b>( {namaKiri ?? (s.ketuaPKK || '..............................')} )</b>
      </div>
      <div style={{ textAlign: 'center', width: 220, whiteSpace: 'pre-line' }}>
        {s.tempatTTD}, {tglIndo(todayISO())}{'\n'}{kanan}
        <div style={{ height: 56 }} />
        <b>( {namaKanan ?? (s.sekretaris || '..............................')} )</b>
      </div>
    </div>
  )
}

/* ---------- Shell ---------- */
type Paper = 'A4' | 'F4' | 'Legal'
export function ReportShell({
  def, params, setParams, orientation = 'portrait', controls, children, use = ['acuan'], multiPage,
}: {
  def: ReportDef
  params: ReportParams
  setParams: (p: Partial<ReportParams>) => void
  orientation?: 'portrait' | 'landscape'
  controls?: ReactNode
  children: ReactNode
  use?: ('acuan' | 'bulan' | 'dawis')[]
  multiPage?: boolean
}) {
  const nav = useNavigate()
  const st = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const [opt, setOpt] = useState(false)
  const [paper, setPaper] = useState<Paper>('A4')
  const [orient, setOrient] = useState(orientation)
  const [mono, setMono] = useState(false)
  const [hideNik, setHideNik] = useState(false)
  const [drill, setDrill] = useState<{ title: string; list: Warga[] } | null>(null)
  const { openWarga } = useEditor()

  function doPrint() {
    const size = paper === 'F4' ? '215mm 330mm' : paper
    const style = document.createElement('style')
    style.id = 'page-size'
    style.textContent = `@page { size: ${size} ${paper === 'F4' ? '' : orient}; margin: 10mm; }`
    if (paper === 'F4' && orient === 'landscape') style.textContent = `@page { size: 330mm 215mm; margin: 10mm; }`
    document.getElementById('page-size')?.remove()
    document.head.appendChild(style)
    document.body.classList.toggle('print-mono', mono)
    document.body.classList.toggle('hide-nik', hideNik)
    setOpt(false)
    setTimeout(() => window.print(), 300)
  }

  function arsipkan() {
    if (!ref.current) return
    const periode = `${BULAN[params.bulan]} ${params.tahun}`
    st.create('arsip', { judul: `${def.title} — ${periode}`, jenis: def.slug, periode, html: ref.current.innerHTML, deletedAt: null }, def.title)
    toast.success('Laporan disimpan ke Arsip 📁')
  }

  const dws = st.dasawisma.filter((d) => !d.deletedAt)
  return (
    <DrillCtx.Provider value={(title, list) => setDrill({ title, list })}>
      <div className="no-print mb-4">
        <button onClick={() => nav('/laporan')} className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-violet-600"><ArrowLeft size={16} /> Semua laporan</button>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg from-violet-500 to-fuchsia-500`}><def.icon size={22} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold">{def.title}</h1>
            <p className="text-xs text-slate-500">Pengganti sheet: <i>{def.sheet}</i></p>
          </div>
          <Button variant="outline" icon={FileSpreadsheet} onClick={() => ref.current && (eksporTabel(ref.current, def.title) ? toast.success('File Excel diunduh') : toast.error('Tidak ada tabel'))}>Excel</Button>
          {use.includes('bulan') && <Button variant="outline" icon={Archive} onClick={arsipkan}>Arsipkan</Button>}
          <Button icon={Printer} onClick={() => setOpt(true)}>Cetak / PDF</Button>
        </div>
        <Card className="mt-3 flex flex-wrap items-end gap-3 p-3">
          {use.includes('acuan') && <Field label="Tanggal acuan (hitung umur)"><Input type="date" value={params.acuan} onChange={(e) => setParams({ acuan: e.target.value })} /></Field>}
          {use.includes('bulan') && (
            <>
              <Field label="Bulan">
                <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800" value={params.bulan} onChange={(e) => setParams({ bulan: +e.target.value })}>
                  {BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}
                </select>
              </Field>
              <Field label="Tahun"><Input type="number" className="w-24" value={params.tahun} onChange={(e) => setParams({ tahun: +e.target.value })} /></Field>
            </>
          )}
          {use.includes('dawis') && (
            <Field label="Dasawisma">
              <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800" value={params.dawis} onChange={(e) => setParams({ dawis: e.target.value })}>
                <option value="">Semua (tingkat RT)</option>
                {dws.map((d) => <option key={d.id} value={d.nama}>{d.nama}</option>)}
              </select>
            </Field>
          )}
          {controls}
          <p className="ml-auto max-w-xs text-[11px] text-slate-400">💡 Klik <b>angka</b> untuk melihat daftar nama, klik <b>nama</b> untuk mengubah data.</p>
        </Card>
      </div>
      <div className="scroll-x -mx-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:px-0">
        <div ref={ref} className={multiPage ? 'paper-stack' : ''}>
          {multiPage ? children : <div className={`paper ${orient}`}>{children}</div>}
        </div>
      </div>

      <Modal open={opt} onClose={() => setOpt(false)} title="Pengaturan Cetak" icon={Settings2} size="sm"
        footer={<><Button variant="ghost" onClick={() => setOpt(false)}>Batal</Button><Button icon={Printer} onClick={doPrint}>Cetak sekarang</Button></>}>
        <div className="space-y-4">
          <Field label="Ukuran kertas"><Segmented value={paper} onChange={setPaper} options={[{ value: 'A4', label: 'A4' }, { value: 'F4', label: 'F4 / Folio' }, { value: 'Legal', label: 'Legal' }]} /></Field>
          <Field label="Orientasi"><Segmented value={orient} onChange={setOrient} options={[{ value: 'portrait', label: 'Potret' }, { value: 'landscape', label: 'Lanskap' }]} /></Field>
          <Toggle checked={mono} onChange={setMono} label="Hemat tinta (header tabel tanpa warna)" />
          <Toggle checked={hideNik} onChange={setHideNik} label="Sembunyikan kolom NIK" />
          <p className="rounded-xl bg-violet-50 p-3 text-xs text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            Di jendela cetak, pilih printer Anda atau <b>“Simpan sebagai PDF”</b>. Di HP Android pilih <b>Simpan sebagai PDF</b>; di iPhone gunakan <b>Bagikan → Cetak</b>.
          </p>
        </div>
      </Modal>

      <Modal open={!!drill} onClose={() => setDrill(null)} title={`${drill?.title ?? ''} (${drill?.list.length ?? 0})`} icon={Users}>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {drill?.list.map((w) => (
            <button key={w.id} onClick={() => { setDrill(null); openWarga(w.id) }} className="flex w-full items-center gap-3 py-2 text-left hover:bg-violet-50 dark:hover:bg-white/5">
              <Avatar nama={w.nama} jk={w.jk} />
              <div><div className="text-sm font-semibold">{w.nama}</div><div className="text-xs text-slate-500">{w.statusKeluarga} · {w.dasawisma}</div></div>
            </button>
          ))}
        </div>
      </Modal>
    </DrillCtx.Provider>
  )
}

export const defaultParams = (): ReportParams => {
  const d = new Date()
  return { acuan: todayISO(), bulan: d.getMonth(), tahun: d.getFullYear(), dawis: '' }
}
