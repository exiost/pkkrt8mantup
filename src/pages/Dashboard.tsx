import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, House, UserRound as Mars, PersonStanding as Venus, Baby, Flower2, HeartHandshake, Armchair, AlertTriangle, Sparkles, FileText, Database, Cake } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { useStore, useLive } from '@/lib/store'
import { Button, Card, Chip, Empty, Section, StatCard, Avatar, col } from '@/components/ui'
import { aktif, hariMenujuHPL, hitungUmur, isBalita, isKepala, isLansia, isPUS, isWUS } from '@/lib/rules'
import { todayISO } from '@/lib/format'
import { REPORTS } from '@/lib/modules'

const PIE = ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444', '#14b8a6', '#a855f7', '#64748b']

export default function Dashboard() {
  const nav = useNavigate()
  const s = useStore((x) => x.settings)
  const all = useLive('warga')
  const dws = useLive('dasawisma')
  const semuaAktif = all.filter(aktif)
  const warga = semuaAktif.filter((w) => w.ikutPKK) // yang tidak ikut PKK / nonaktif tidak dihitung
  const tidakIkut = semuaAktif.length - warga.length
  const acuan = todayISO()

  const d = useMemo(() => {
    const count = (f: (w: (typeof warga)[number]) => boolean) => warga.filter(f).length
    const groupBy = (f: (w: (typeof warga)[number]) => string) => {
      const m = new Map<string, number>()
      warga.forEach((w) => { const k = f(w) || 'Belum diisi'; m.set(k, (m.get(k) ?? 0) + 1) })
      return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    }
    const piramida = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65+'].map((g, i) => {
      const lo = i * 5, hi = i === 13 ? 200 : lo + 4
      const inG = (w: (typeof warga)[number]) => { const u = hitungUmur(w.tglLahir, acuan); return u !== null && u >= lo && u <= hi }
      return { g, L: count((w) => w.jk === 'L' && inG(w)), P: count((w) => w.jk === 'P' && inG(w)) }
    }).reverse()
    const perDw = dws.map((x) => ({ name: x.nama, L: count((w) => w.dasawisma === x.nama && w.jk === 'L'), P: count((w) => w.dasawisma === x.nama && w.jk === 'P') }))
    const perhatian: { label: string; color: string; to: string; n: number }[] = [
      { label: 'Ibu hamil HPL ≤ 30 hari', color: 'fuchsia', to: '/ibu-anak', n: count((w) => w.hamil && (hariMenujuHPL(w.hpl, acuan) ?? 99) <= 30) },
      { label: 'Warga tanpa tanggal lahir', color: 'amber', to: '/warga', n: count((w) => !w.tglLahir) },
      { label: 'Warga tanpa No KK', color: 'orange', to: '/warga', n: count((w) => !w.noKK) },
      { label: 'Dasawisma belum jelas / kosong', color: 'red', to: '/warga', n: count((w) => !dws.some((x) => x.nama === w.dasawisma)) },
      { label: 'NIK ganda', color: 'red', to: '/warga', n: (() => { const m = new Map<string, number>(); warga.forEach((w) => w.nik && m.set(w.nik, (m.get(w.nik) ?? 0) + 1)); return [...m.values()].filter((x) => x > 1).length })() },
    ].filter((x) => x.n > 0)
    const bulanIni = new Date().getMonth()
    const ultah = warga.filter((w) => w.tglLahir && new Date(w.tglLahir).getMonth() === bulanIni).sort((a, b) => a.tglLahir.slice(8).localeCompare(b.tglLahir.slice(8)))
    return {
      total: warga.length, kk: count(isKepala), L: count((w) => w.jk === 'L'), P: count((w) => w.jk === 'P'),
      balita: count((w) => isBalita(w, acuan, s)), wus: count((w) => isWUS(w, acuan)), pus: count((w) => isPUS(w, acuan)),
      hamil: count((w) => w.hamil), lansia: count((w) => isLansia(w, acuan, s)),
      pendidikan: groupBy((w) => w.pendidikan).slice(0, 8), pekerjaan: groupBy((w) => w.pekerjaan).slice(0, 8),
      piramida, perDw, perhatian, ultah,
    }
  }, [warga, dws, acuan, s])

  if (!all.length)
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-8 text-white">
          <Sparkles className="mb-3" />
          <h1 className="font-display text-3xl font-extrabold">Selamat datang di SIWARGA PKK 👋</h1>
          <p className="mt-2 max-w-xl text-white/85">Aplikasi pengganti file Excel Data Warga {s.rt} {s.padukuhan}. Mulai dengan mengimpor file Excel lama atau menambah warga satu per satu.</p>
        </div>
        <Empty title="Belum ada data" desc="Impor file .xlsm lama Anda — semua tab otomatis terisi." icon={Database}
          action={<div className="flex gap-2"><Button icon={Database} onClick={() => nav('/data')}>Impor dari Excel</Button><Button variant="outline" onClick={() => nav('/warga')}>Tambah manual</Button></div>} />
      </Card>
    )

  const stats = [
    { label: 'Total Warga', value: d.total, icon: Users, color: 'indigo', to: '/warga' },
    { label: 'Kepala Keluarga', value: d.kk, icon: House, color: 'amber', to: '/keluarga' },
    { label: 'Laki-laki', value: d.L, icon: Mars, color: 'sky', to: '/warga' },
    { label: 'Perempuan', value: d.P, icon: Venus, color: 'pink', to: '/warga' },
    { label: 'Balita', value: d.balita, icon: Baby, color: 'amber', to: '/warga?kategori=Balita' },
    { label: 'WUS', value: d.wus, icon: Flower2, color: 'fuchsia', to: '/laporan/wus' },
    { label: 'PUS', value: d.pus, icon: HeartHandshake, color: 'rose', to: '/laporan/pus' },
    { label: 'Ibu Hamil', value: d.hamil, icon: Baby, color: 'violet', to: '/ibu-anak' },
    { label: 'Lansia', value: d.lansia, icon: Armchair, color: 'orange', to: '/warga?kategori=Lansia' },
  ]

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-6 text-white shadow-xl shadow-fuchsia-500/20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
        <div className="relative">
          <div className="text-sm font-medium text-white/80">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Data Warga {s.rt} {s.padukuhan} ✨</h1>
          {(tidakIkut > 0 || all.length > semuaAktif.length) && <p className="text-xs text-white/80">Tidak dihitung: {tidakIkut} tidak ikut PKK, {all.length - semuaAktif.length} nonaktif/pindah/meninggal</p>}
          <p className="text-sm text-white/85">Kalurahan {s.kalurahan} · Kapanewon {s.kapanewon} · {s.kabupaten}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/laporan" className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/30"><FileText size={16} /> Buka laporan</Link>
            {dws.map((x) => <Link key={x.id} to={`/warga?dasawisma=${encodeURIComponent(x.nama)}`} className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25">{x.nama}</Link>)}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {stats.map((x, i) => <StatCard key={x.label} {...x} i={i} onClick={() => nav(x.to)} />)}
      </div>

      {d.perhatian.length > 0 && (
        <Section title="Perlu Perhatian" icon={AlertTriangle} color="red">
          <div className="flex flex-wrap gap-2">
            {d.perhatian.map((p) => (
              <Link key={p.label} to={p.to}><Chip color={p.color} pulse={p.color === 'fuchsia'} className="!px-3 !py-1.5 !text-xs">{p.label}: {p.n}</Chip></Link>
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Piramida Penduduk" icon={Users} color="indigo">
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={d.piramida.map((x) => ({ ...x, L: -x.L }))} layout="vertical" stackOffset="sign" margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => String(Math.abs(v))} fontSize={11} />
                <YAxis type="category" dataKey="g" fontSize={11} width={48} />
                <Tooltip formatter={(v: number) => Math.abs(v)} />
                <Legend />
                <Bar dataKey="L" name="Laki-laki" stackId="a" fill="#6366f1" radius={[6, 0, 0, 6]} animationDuration={900} />
                <Bar dataKey="P" name="Perempuan" stackId="a" fill="#ec4899" radius={[0, 6, 6, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Warga per Dasawisma" icon={House} color="teal">
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={d.perDw}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="L" name="Laki-laki" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                <Bar dataKey="P" name="Perempuan" fill="#f472b6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        {([['Pendidikan', d.pendidikan, 'amber'], ['Pekerjaan', d.pekerjaan, 'emerald']] as const).map(([t, data, c]) => (
          <Section key={t} title={t} icon={FileText} color={c}>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} animationDuration={900}>
                      {data.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-1 text-xs">
                {data.map((x, i) => (
                  <li key={x.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} /><span className="flex-1 truncate">{x.name}</span><b className="tabular">{x.value}</b></li>
                ))}
              </ul>
            </div>
          </Section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Ulang Tahun Bulan Ini 🎂" icon={Cake} color="pink">
          {d.ultah.length === 0 ? <p className="text-sm text-slate-400">Tidak ada.</p> : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {d.ultah.map((w) => (
                <Link key={w.id} to={`/warga/${w.id}`} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-pink-50 dark:hover:bg-white/5">
                  <Avatar nama={w.nama} jk={w.jk} />
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">{w.nama}</div>
                  <Chip color="pink">{w.tglLahir.slice(8)} · {(hitungUmur(w.tglLahir, acuan) ?? 0) + (w.tglLahir.slice(5) > acuan.slice(5) ? 1 : 0)} th</Chip>
                </Link>
              ))}
            </div>
          )}
        </Section>
        <div className="lg:col-span-2">
          <Section title="Akses Cepat Laporan" icon={FileText} color="violet">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REPORTS.slice(0, 12).map((r) => {
                const c = col(r.color)
                return (
                  <Link key={r.slug} to={`/laporan/${r.slug}`} className={`flex items-center gap-2 rounded-xl p-2 text-xs font-semibold transition hover:scale-[1.03] ${c.soft} ${c.text}`}>
                    <r.icon size={16} className="shrink-0" /> <span className="truncate">{r.title}</span>
                  </Link>
                )
              })}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
