import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { useMemo } from 'react'
import { useStore, useLive } from '@/lib/store'
import { BULAN } from '@/lib/options'
import { Button, Card, Field, Input, Select, Toggle } from '@/components/ui'
import { isKepala } from '@/lib/rules'
import { anggotaKeluarga } from '@/lib/rules'
import { KB_MANUAL, type ReportOpts, type ReportParams } from './common'
import type { Use } from './registry'
import { familiesOf } from './forms'
import type { Ctx } from './common'

interface Props {
  uses: Use[]
  p: ReportParams
  setP: (x: Partial<ReportParams>) => void
  o: ReportOpts
  setO: (x: Partial<ReportOpts>) => void
  ctx: Ctx
}

export default function ReportControls({ uses, p, setP, o, setO, ctx }: Props) {
  const dws = useLive('dasawisma')
  const sel = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800'
  const items = useMemo(() => {
    if (uses.includes('warga')) return ctx.aktif.filter((w) => !p.dawis || w.dasawisma === p.dawis).map((w) => ({ id: w.id, label: `${w.noReg}. ${w.nama}` }))
    if (uses.includes('htwarga')) return ctx.aktif.filter((w) => (w.pekarangan.length || w.irt.length) && (!p.dawis || w.dasawisma === p.dawis)).map((w) => ({ id: w.id, label: w.nama }))
    if (uses.includes('keluarga')) return familiesOf(ctx).map((x) => ({ id: x.k.id, label: `${x.k.nomor}. ${x.kepala?.nama ?? '?'} (${x.ang.length} jiwa)` }))
    return []
  }, [uses, ctx, p.dawis])
  const idx = Math.max(0, items.findIndex((i) => i.id === p.pick))
  const go = (d: number) => items[idx + d] && setP({ pick: items[idx + d].id })
  const picker = uses.includes('warga') || uses.includes('keluarga') || uses.includes('htwarga')

  return (
    <Card className="no-print mt-3 p-3">
      <div className="flex flex-wrap items-end gap-3">
        {uses.includes('acuan') && <Field label="Tanggal acuan (hitung umur)"><Input type="date" value={p.acuan} onChange={(e) => e.target.value && setP({ acuan: e.target.value })} /></Field>}
        {uses.includes('bulan') && (
          <>
            <Field label="Bulan"><select className={sel} value={p.bulan} onChange={(e) => setP({ bulan: +e.target.value })}>{BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}</select></Field>
            <Field label="Tahun"><Input type="number" className="w-24" value={p.tahun} onChange={(e) => setP({ tahun: +e.target.value })} /></Field>
          </>
        )}
        {uses.includes('tahun') && <Field label="Tahun"><Input type="number" className="w-24" value={p.tahun} onChange={(e) => setP({ tahun: +e.target.value })} /></Field>}
        {(uses.includes('dawis') || uses.includes('dawisWajib')) && (
          <Field label="Dasawisma">
            <select className={sel} value={p.dawis} onChange={(e) => setP({ dawis: e.target.value, pick: '' })}>
              {uses.includes('dawis') && <option value="">Semua</option>}
              {dws.map((d) => <option key={d.id} value={d.nama}>{d.nama}</option>)}
            </select>
          </Field>
        )}
        {uses.includes('semuaPeriode') && <div className="pb-2"><Toggle checked={p.semuaPeriode} onChange={(b) => setP({ semuaPeriode: b })} label="Semua periode" /></div>}
        {uses.includes('barisKosong') && <div className="pb-2"><Toggle checked={o.barisKosong} onChange={(b) => setO({ barisKosong: b })} label="Baris kosong seperti Excel" /></div>}
        {uses.includes('isiKosong') && <div className="pb-2"><Toggle checked={o.isiKosong} onChange={(b) => setO({ isiKosong: b })} label="Isi kotak yang di Excel kosong" /></div>}
      </div>
      {picker && items.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-2 dark:border-white/10 dark:bg-white/5">
          <Button size="sm" variant="outline" icon={ChevronLeft} disabled={p.semua || idx <= 0} onClick={() => go(-1)} aria-label="Sebelumnya">{''}</Button>
          <select disabled={p.semua} value={items[idx]?.id} onChange={(e) => setP({ pick: e.target.value })} className={`${sel} h-9 min-w-0 flex-1`}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
          <Button size="sm" variant="outline" icon={ChevronRight} disabled={p.semua || idx >= items.length - 1} onClick={() => go(1)} aria-label="Berikutnya">{''}</Button>
          <div className="flex items-center gap-2"><Layers size={16} className="text-violet-500" /><Toggle checked={p.semua} onChange={(b) => setP({ semua: b })} label={`Cetak semua (${items.length})`} /></div>
        </div>
      )}
      <p className="mt-2 hidden text-[11px] text-slate-400 sm:block">💡 Klik <b>angka</b> untuk melihat daftar nama, klik <b>nama</b> untuk mengubah datanya.</p>
    </Card>
  )
}

/** Isian manual Kampung KB (diketik tangan di Excel) — disimpan per bulan */
export function ManualKB({ periode }: { periode: string }) {
  const st = useStore()
  useLive('kampungKB')
  const rec = st.kampungKB.find((x) => x.periode === periode && !x.deletedAt)
  const set = (addr: string, val: string, text?: boolean) => {
    const nilai = { ...(rec?.nilai ?? {}) }
    if (val === '') delete nilai[addr]
    else nilai[addr] = text ? val : Number(val.replace(/\D/g, ''))
    if (rec) st.update('kampungKB', rec.id, { nilai }, `Kampung KB ${periode}`)
    else st.create('kampungKB', { periode, nilai, deletedAt: null }, `Kampung KB ${periode}`)
  }
  return (
    <Card className="no-print mt-3 p-3">
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Isian manual bulan ini (yang di Excel diketik tangan)</summary>
        <div className="mt-3 space-y-4">
          {KB_MANUAL.map((g) => (
            <div key={g.title}>
              <div className="mb-1 text-xs font-bold text-slate-500">{g.title}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {g.cells.map((c) => (
                  <label key={c.addr} className="text-[11px] text-slate-500">{c.label}
                    <Input value={String(rec?.nilai[c.addr] ?? '')} inputMode={c.text ? undefined : 'numeric'} onChange={(e) => set(c.addr, e.target.value, c.text)} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </Card>
  )
}

export { isKepala, anggotaKeluarga, Select }
