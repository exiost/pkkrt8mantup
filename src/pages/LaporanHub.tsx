import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, FileText, Star } from 'lucide-react'
import { REPORTS, REPORT_GROUPS } from '@/lib/modules'
import { PageHeader, col } from '@/components/ui'
import { useStore } from '@/lib/store'
import { usePeran } from '@/components/Layout'

const FAV_KEY = 'siwarga-fav'
const readFav = (): string[] => { try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]') } catch { return [] } }

export default function LaporanHub() {
  const st = useStore()
  // favorit disimpan di pengaturan (sama untuk semua akun); urutan & isinya diatur admin
  const fav = (st.settings.favorit ?? readFav()).filter((s) => REPORTS.some((r) => r.slug === s && !r.hidden))
  const admin = usePeran() === 'admin'
  const simpan = (n: string[]) => st.setSettings({ favorit: n })
  const toggle = (s: string) => simpan(fav.includes(s) ? fav.filter((x) => x !== s) : [...fav, s])
  const geser = (s: string, d: number) => {
    const i = fav.indexOf(s), j = i + d
    if (i < 0 || j < 0 || j >= fav.length) return
    const n = [...fav];[n[i], n[j]] = [n[j], n[i]]
    simpan(n)
  }
  const groups: [string, typeof REPORTS][] = [
    ...(fav.length ? [['⭐ Favorit', fav.map((s) => REPORTS.find((r) => r.slug === s)!)] as [string, typeof REPORTS]] : []),
    ...REPORT_GROUPS.map((g) => [g, REPORTS.filter((r) => !r.hidden && r.group === g)] as [string, typeof REPORTS]),
  ]
  let i = 0
  return (
    <div>
      <PageHeader title="Laporan & Cetak" subtitle="Semua tab dari file Excel, siap dicetak atau disimpan sebagai PDF" icon={FileText} color="violet" />
      {groups.map(([g, rs]) => (
        <div key={g} className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-violet-600 dark:text-violet-300"><span className="h-1.5 w-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />{g}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rs.map((r) => {
              const c = col(r.color)
              return (
                <motion.div key={g + r.slug} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i++ * 0.03 }} whileHover={{ y: -4 }} className="relative">
                  <Link to={`/laporan/${r.slug}`} className={`group shine relative flex h-full items-start gap-3 overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br p-4 shadow-sm ring-1 transition hover:shadow-xl ${c.wash} ${c.ring} ${admin && g === '⭐ Favorit' ? 'pb-12' : ''}`}>
                    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 transition duration-500 group-hover:scale-150 ${c.grad}`} />
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition duration-300 group-hover:-rotate-6 group-hover:scale-110 ${c.grad}`}><r.icon size={22} /></div>
                    <div className="min-w-0 pr-6">
                      <div className="font-display font-bold text-slate-900 dark:text-white">{r.title}</div>
                      <div className="text-xs text-slate-500">{r.desc}</div>
                      <div className={`mt-2 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${c.soft} ${c.text}`}>tab: {r.sheet}</div>
                    </div>
                  </Link>
                  {admin ? (
                    <button onClick={() => toggle(r.slug)} className="absolute right-3 top-3 p-1" aria-label="Favorit" title={fav.includes(r.slug) ? 'Hapus dari favorit' : 'Jadikan favorit'}>
                      <Star size={16} className={fav.includes(r.slug) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'} />
                    </button>
                  ) : fav.includes(r.slug) && <Star size={16} className="absolute right-4 top-4 fill-amber-400 text-amber-400" />}
                  {admin && g === '⭐ Favorit' && (
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <button onClick={() => geser(r.slug, -1)} disabled={fav.indexOf(r.slug) === 0} aria-label="Naikkan" title="Naikkan urutan" className="grid h-7 w-7 place-items-center rounded-lg bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-violet-600 disabled:opacity-30 dark:bg-slate-800 dark:ring-white/10"><ArrowUp size={14} /></button>
                      <button onClick={() => geser(r.slug, 1)} disabled={fav.indexOf(r.slug) === fav.length - 1} aria-label="Turunkan" title="Turunkan urutan" className="grid h-7 w-7 place-items-center rounded-lg bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-violet-600 disabled:opacity-30 dark:bg-slate-800 dark:ring-white/10"><ArrowDown size={14} /></button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
