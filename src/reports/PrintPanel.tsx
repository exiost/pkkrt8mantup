import { RotateCcw } from 'lucide-react'
import { Button, Card, Field, Input, Segmented, Toggle } from '@/components/ui'
import { PAPER_MM, TEMPLATES } from '@/sheet/engine'
import { pageGeometry, type PrintSettings } from './usePrint'

interface Props {
  tplId: string
  ps: PrintSettings
  set: (p: Partial<PrintSettings>) => void
  reset: () => void
  eff: number
  pagesAcross: number
  pagesDown: number
  shrunk?: boolean
}

const PAPERS: [number, string][] = [[9, 'A4'], [5, 'Legal'], [100, 'F4 / Folio'], [1, 'Letter'], [8, 'A3']]

export default function PrintPanel({ tplId, ps, set, reset, eff, pagesAcross, pagesDown, shrunk }: Props) {
  const excel = TEMPLATES[tplId].page
  const g = pageGeometry(ps)
  const num = (v: string) => (v === '' ? 0 : Number(v))
  return (
    <Card className="no-print mt-3 border-violet-200 p-4 dark:border-violet-500/30">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-sm font-bold">Pengaturan cetak</h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          Skala {Math.round(eff * 100)}% · kira-kira {pagesAcross} × {pagesDown} halaman
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset}>Samakan dengan Excel</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-3">
          <Field label="Ukuran kertas">
            <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800" value={ps.paper} onChange={(e) => set({ paper: +e.target.value })}>
              {PAPERS.map(([k, l]) => <option key={k} value={k}>{l} ({PAPER_MM[k][0]} × {PAPER_MM[k][1]} mm)</option>)}
            </select>
          </Field>
          <Field label="Arah kertas"><Segmented value={ps.orient} onChange={(v) => set({ orient: v })} options={[{ value: 'portrait', label: 'Tegak' }, { value: 'landscape', label: 'Mendatar' }]} /></Field>
        </div>
        <div className="space-y-3">
          <Field label="Skala (perbesar / perkecil)">
            <div className="flex flex-wrap gap-1.5">
              {([['excel', `Excel ${excel.scale}%`], ['lebar', 'Pas lebar'], ['halaman', 'Pas 1 halaman'], ['manual', 'Atur %']] as const).map(([m, l]) => (
                <button key={m} type="button" onClick={() => set({ mode: m, ...(m === 'excel' ? { pct: excel.scale } : {}) })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${ps.mode === m ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'}`}>{l}</button>
              ))}
            </div>
          </Field>
          {(ps.mode === 'manual' || ps.mode === 'excel') && (
            <div className="flex items-center gap-2">
              <input type="range" min={20} max={200} step={1} value={ps.pct} onChange={(e) => set({ mode: 'manual', pct: +e.target.value })} className="flex-1 accent-violet-600" />
              <Input type="number" className="w-20" min={10} max={400} value={ps.pct} onChange={(e) => set({ mode: 'manual', pct: num(e.target.value) || 100 })} />
              <span className="text-xs text-slate-500">%</span>
            </div>
          )}
          {shrunk && <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Pada skala Excel ({excel.scale}%) tabel lebih lebar dari kertas, jadi otomatis dikecilkan ke {Math.round(eff * 100)}% agar tidak terpotong. Pilih <b>Atur %</b> bila ingin ukuran lain.</p>}
          <p className="text-[11px] text-slate-400">Tabel terpotong? Kecilkan skala atau pilih <b>Pas lebar</b> / <b>Pas 1 halaman</b>.</p>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Margin (mm)</div>
          <div className="grid grid-cols-2 gap-2">
            {([['mt', 'Atas'], ['mb', 'Bawah'], ['ml', 'Kiri'], ['mr', 'Kanan']] as const).map(([k, l]) => (
              <label key={k} className="text-[11px] text-slate-500">{l}<Input type="number" min={0} max={60} step={1} value={ps[k]} onChange={(e) => set({ [k]: num(e.target.value) })} /></label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Area cetak {Math.round(g.printW / 3.78)} × {Math.round(g.printH / 3.78)} mm</p>
        </div>
        <div className="space-y-2">
          <Toggle checked={ps.areaOn} onChange={(b) => set({ areaOn: b })} label="Batasi area cetak" />
          {ps.areaOn && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-500">Kolom dari<Input value={ps.c1} onChange={(e) => set({ c1: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></label>
              <label className="text-[11px] text-slate-500">sampai<Input value={ps.c2} onChange={(e) => set({ c2: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></label>
              <label className="text-[11px] text-slate-500">Baris dari<Input type="number" min={1} value={ps.r1} onChange={(e) => set({ r1: Math.max(1, num(e.target.value)) })} /></label>
              <label className="text-[11px] text-slate-500">sampai<Input type="number" min={1} value={ps.r2} onChange={(e) => set({ r2: Math.max(1, num(e.target.value)) })} /></label>
            </div>
          )}
          <Toggle checked={ps.repeat} onChange={(b) => set({ repeat: b })} label="Ulangi judul tabel di tiap halaman" />
          <Toggle checked={ps.hc} onChange={(b) => set({ hc: b })} label="Tengahkan ke kiri-kanan" />
          <Toggle checked={ps.mono} onChange={(b) => set({ mono: b })} label="Hemat tinta (tanpa warna latar)" />
          <Toggle checked={ps.guides} onChange={(b) => set({ guides: b })} label="Tampilkan garis batas halaman" />
        </div>
      </div>
    </Card>
  )
}
