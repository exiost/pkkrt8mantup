import { useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight, Info, Save, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { BULAN } from '@/lib/options'
import { Button, Modal } from '@/components/ui'
import { ymOf } from '@/lib/rules'
import type { RiwayatIbu, StatusIbuLapor, Warga } from '@/lib/types'

const STATUS: StatusIbuLapor[] = ['Hamil', 'Melahirkan', 'Nifas', 'Menyusui']
const WARNA: Record<StatusIbuLapor, string> = {
  Hamil: 'from-fuchsia-500 to-pink-500', Melahirkan: 'from-rose-500 to-red-500', Nifas: 'from-violet-500 to-indigo-500', Menyusui: 'from-sky-500 to-cyan-500',
}
const sel = 'h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-slate-800'

/**
 * Catatan status ibu per bulan. Satu baris = satu bulan = satu entri sendiri.
 * Untuk persalinan SC: bulan melahirkan diisi "Melahirkan" + cara "SC" + centang "tetap dilaporkan Hamil",
 * sehingga laporan bulan itu tetap menulis Hamil (laporan tahunan), sedangkan data aslinya tetap tercatat.
 */
export default function RiwayatIbuModal({ w, onClose }: { w: Warga; onClose: () => void }) {
  const st = useStore()
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [rows, setRows] = useState<RiwayatIbu[]>(w.riwayatIbu ?? [])
  const [dari, setDari] = useState(0)
  const [sampai, setSampai] = useState(now.getMonth())
  const [isi, setIsi] = useState<StatusIbuLapor>('Hamil')

  const get = (b: number) => rows.find((r) => r.bulan === ymOf(tahun, b))
  const put = (b: number, p: Partial<RiwayatIbu> | null) => {
    const ym = ymOf(tahun, b)
    setRows((cur) => {
      const rest = cur.filter((r) => r.bulan !== ym)
      if (p === null) return rest
      const old = cur.find((r) => r.bulan === ym)
      const next: RiwayatIbu = { bulan: ym, status: 'Hamil', ...old, ...p }
      if (next.status !== 'Melahirkan') { delete next.cara; delete next.tetapHamil }
      if (next.status === 'Melahirkan' && p.cara === 'SC' && old?.cara !== 'SC') next.tetapHamil = true
      return [...rest, next].sort((a, b) => a.bulan.localeCompare(b.bulan))
    })
  }
  const isiRentang = () => {
    for (let b = Math.min(dari, sampai); b <= Math.max(dari, sampai); b++) put(b, { status: isi })
  }
  function simpan() {
    const patch: Partial<Warga> = { riwayatIbu: rows }
    // samakan saklar status ibu dengan catatan bulan ini (bila ada), supaya kartu & penanda tetap cocok
    const e = rows.find((r) => r.bulan === ymOf(now.getFullYear(), now.getMonth()))
    if (e) Object.assign(patch, { hamil: e.status === 'Hamil', melahirkan: e.status === 'Melahirkan', nifas: e.status === 'Nifas', menyusui: e.status === 'Menyusui' })
    st.update('warga', w.id, patch, w.nama)
    toast.success('Catatan bulanan ibu disimpan 🤰')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Catatan bulanan — ${w.nama}`} icon={CalendarRange} color="fuchsia" size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button icon={Save} onClick={simpan}>Simpan</Button></>}>
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-fuchsia-50 p-3 text-xs text-fuchsia-900 dark:bg-fuchsia-500/10 dark:text-fuchsia-100">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>Setiap bulan punya catatannya sendiri. Laporan memakai catatan bulan yang dipilih. Bulan tanpa catatan tidak dilaporkan. Untuk persalinan <b>SC</b>, pilih <b>Melahirkan</b> → cara <b>SC</b>; kotak <b>“tetap dilaporkan Hamil”</b> akan tercentang agar laporan tahunan tetap menulis Hamil.</p>
      </div>

      <div className="mb-3 flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" icon={ChevronLeft} aria-label="Tahun sebelumnya" onClick={() => setTahun(tahun - 1)}>{''}</Button>
        <div className="font-display text-lg font-extrabold tabular-nums">{tahun}</div>
        <Button size="sm" variant="outline" icon={ChevronRight} aria-label="Tahun berikutnya" onClick={() => setTahun(tahun + 1)}>{''}</Button>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-fuchsia-300 p-2.5 dark:border-fuchsia-500/40">
        <span className="flex items-center gap-1 text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300"><Wand2 size={14} /> Isi cepat</span>
        <select className={sel} value={dari} onChange={(e) => setDari(+e.target.value)}>{BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}</select>
        <span className="text-xs text-slate-400">sampai</span>
        <select className={sel} value={sampai} onChange={(e) => setSampai(+e.target.value)}>{BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}</select>
        <select className={sel} value={isi} onChange={(e) => setIsi(e.target.value as StatusIbuLapor)}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
        <Button size="sm" onClick={isiRentang}>Terapkan</Button>
      </div>

      <div className="space-y-1.5">
        {BULAN.map((nama, b) => {
          const r = get(b)
          return (
            <div key={nama} className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 transition ${r ? 'border-transparent bg-gradient-to-r text-white shadow ' + WARNA[r.status] : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'}`}>
              <span className={`w-20 text-sm font-bold ${r ? '' : 'text-slate-500'}`}>{nama}</span>
              <select className={`${sel} ${r ? 'text-slate-800' : ''}`} value={r?.status ?? ''} onChange={(e) => put(b, e.target.value ? { status: e.target.value as StatusIbuLapor } : null)}>
                <option value="">— tidak ada —</option>
                {STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
              {r?.status === 'Melahirkan' && (
                <>
                  <select className={`${sel} text-slate-800`} value={r.cara ?? ''} onChange={(e) => put(b, { cara: (e.target.value || undefined) as RiwayatIbu['cara'] })}>
                    <option value="">cara lahir…</option>
                    <option>Normal</option><option>SC</option><option>Lainnya</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <input type="checkbox" checked={!!r.tetapHamil} onChange={(e) => put(b, { tetapHamil: e.target.checked })} />
                    tetap dilaporkan Hamil
                  </label>
                </>
              )}
              {r && <input value={r.catatan ?? ''} onChange={(e) => put(b, { catatan: e.target.value })} placeholder="catatan (opsional)" className="h-9 min-w-[8rem] flex-1 rounded-xl border-0 bg-white/90 px-2 text-sm text-slate-800 outline-none" />}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
