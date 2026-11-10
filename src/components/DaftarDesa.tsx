import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BellRing, ChevronDown, ClipboardCheck, Loader2 } from 'lucide-react'
import { useDataDesa } from '@/reports/desa'
import { useSession } from '@/lib/session'
import { DEFAULT_SETTINGS } from '@/lib/store'
import { buatPengingat } from '@/lib/pengingat'
import { periksaData, urutTemuan, type Temuan } from '@/lib/periksa'
import { todayISO } from '@/lib/format'
import { Card, Chip } from '@/components/ui'

/** buka data warga / keluarga di RT-nya (Admin Padukuhan pindah RT dulu bila perlu) */
function useBuka() {
  const nav = useNavigate()
  const { rt: aktif, pilihRT } = useSession()
  return async (rt: string, to: string) => { if (rt !== aktif && !(await pilihRT(rt))) return; nav(to) }
}

/** Pengingat bulan ini di seluruh padukuhan (gabungan 17 RT) */
export function PengingatDesa() {
  const dd = useDataDesa()
  const buka = useBuka()
  useEffect(() => { void dd.load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const acuan = todayISO()
  const kelompok = useMemo(() => {
    const m = new Map<string, { judul: string; warna: string; isi: { rt: string; id: string; nama: string; info: string }[] }>()
    for (const d of dd.list ?? []) {
      const s = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) }
      for (const p of buatPengingat(d.warga, acuan, s.umurLansia)) {
        const g = m.get(p.kode) ?? m.set(p.kode, { judul: p.judul, warna: p.warna, isi: [] }).get(p.kode)!
        for (const w of p.list) g.isi.push({ rt: d.rt, id: w.id, nama: w.nama, info: p.info(w) })
      }
    }
    return [...m.values()]
  }, [dd.list, acuan])
  return (
    <Card className="mb-5 p-4">
      <div className="mb-1 flex items-center gap-2 font-display font-extrabold"><BellRing size={18} className="text-fuchsia-600" /> Pengingat se-padukuhan</div>
      <p className="mb-3 text-xs text-slate-500">Dari semua RT (warga aktif). Klik nama untuk membuka datanya.</p>
      {!dd.list ? <Memuat /> : kelompok.length === 0 ? <p className="text-sm italic text-slate-400">Tidak ada pengingat bulan ini.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kelompok.map((g) => <Kelompok key={g.judul} g={g} buka={buka} />)}
        </div>
      )}
    </Card>
  )
}
function Kelompok({ g, buka }: { g: { judul: string; warna: string; isi: { rt: string; id: string; nama: string; info: string }[] }; buka: (rt: string, to: string) => Promise<void> }) {
  const [semua, setSemua] = useState(false)
  const tampil = semua ? g.isi : g.isi.slice(0, 10)
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"><span className="min-w-0 flex-1">{g.judul}</span><Chip color={g.warna}>{g.isi.length}</Chip></div>
      <div className="flex flex-wrap gap-1.5">
        {tampil.map((x) => (
          <button key={`${x.rt}-${x.id}`} onClick={() => void buka(x.rt, `/warga/${x.id}`)} className="rounded-lg bg-slate-100 px-2 py-1 text-left text-xs font-semibold hover:bg-violet-100 dark:bg-white/10">
            <span className="text-amber-700 dark:text-amber-300">RT {x.rt}</span> · {x.nama}{x.info ? ` · ${x.info}` : ''}
          </button>
        ))}
        {g.isi.length > 10 && !semua && <button onClick={() => setSemua(true)} className="px-1 text-xs font-semibold text-violet-600">+{g.isi.length - 10} lagi</button>}
      </div>
    </div>
  )
}

/** Cek Data se-padukuhan: temuan dari semua RT, dikelompokkan per RT */
export function CekDesa() {
  const dd = useDataDesa()
  const buka = useBuka()
  const [hanyaPenting, setHanyaPenting] = useState(true)
  const [terbuka, setTerbuka] = useState<string | null>(null)
  useEffect(() => { void dd.load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const acuan = todayISO()
  const perRT = useMemo(() => (dd.list ?? []).map((d) => ({ rt: d.rt, temuan: urutTemuan(periksaData(d.warga, d.keluarga, d.dasawisma, acuan)) })).filter((x) => x.temuan.length), [dd.list, acuan])
  const total = perRT.reduce((t, x) => t + x.temuan.length, 0)
  const penting = perRT.reduce((t, x) => t + x.temuan.filter((y) => y.tingkat === 'penting').length, 0)
  const tujuan = (t: Temuan) => (t.kode === 'tanpa-kepala' || t.kode === 'kepala-ganda') && t.keluargaId ? `/keluarga/${t.keluargaId}` : `/warga/${t.wargaId}`
  return (
    <Card className="mb-5 p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-display font-extrabold"><ClipboardCheck size={18} className="text-emerald-600" /> Cek Data se-padukuhan</div>
        <button onClick={() => setHanyaPenting(true)} className={`rounded-full px-3 py-1 text-xs font-bold ${hanyaPenting ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200'}`}>Penting ({penting})</button>
        <button onClick={() => setHanyaPenting(false)} className={`rounded-full px-3 py-1 text-xs font-bold ${!hanyaPenting ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>Semua ({total})</button>
      </div>
      <p className="mb-3 text-xs text-slate-500">Isian janggal / belum lengkap di setiap RT (sama seperti menu Cek Data di RT). Klik RT untuk melihat daftarnya.</p>
      {!dd.list ? <Memuat /> : perRT.length === 0 ? <p className="text-sm italic text-slate-400">Semua RT rapi 🎉</p> : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
          {perRT.map(({ rt, temuan }) => {
            const xs = hanyaPenting ? temuan.filter((t) => t.tingkat === 'penting') : temuan
            const buka2 = terbuka === rt
            return (
              <div key={rt}>
                <button onClick={() => setTerbuka(buka2 ? null : rt)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                  <Chip color="amber">RT {rt}</Chip>
                  <span className="min-w-0 flex-1 text-xs text-slate-500">{[...new Set(xs.map((t) => t.judul))].slice(0, 3).join(' · ')}{new Set(xs.map((t) => t.judul)).size > 3 ? ' …' : ''}</span>
                  <Chip color={xs.some((t) => t.tingkat === 'penting') ? 'red' : 'slate'}>{xs.length}</Chip>
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${buka2 ? 'rotate-180' : ''}`} />
                </button>
                {buka2 && (
                  <div className="divide-y divide-slate-100 bg-slate-50/60 dark:divide-white/5 dark:bg-white/[0.03]">
                    {xs.slice(0, 100).map((t, i) => (
                      <button key={`${t.kode}-${i}`} onClick={() => void buka(rt, tujuan(t))} className="flex w-full items-start gap-2 px-4 py-2 text-left text-sm hover:bg-violet-50/70 dark:hover:bg-white/5">
                        <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${t.tingkat === 'penting' ? 'text-red-500' : 'text-amber-500'}`} />
                        <span className="min-w-0 flex-1"><b>{t.nama}</b> — {t.judul}<span className="block text-xs text-slate-500">{t.pesan}</span></span>
                      </button>
                    ))}
                    {xs.length > 100 && <div className="px-4 py-2 text-xs text-slate-400">… dan {xs.length - 100} lainnya (lihat menu Cek Data di RT {rt})</div>}
                    {xs.length === 0 && <div className="px-4 py-2 text-xs text-slate-400">Tidak ada temuan penting. Pilih “Semua” untuk melihat yang lain.</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
const Memuat = () => <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Memuat data semua RT…</div>
