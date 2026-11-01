import { motion } from 'framer-motion'
import { Code2, Database, FileSpreadsheet, Heart, Printer, ShieldCheck, Smartphone, Sparkles, UserRound } from 'lucide-react'
import { Card } from '@/components/ui'

const FITUR = [
  { icon: FileSpreadsheet, t: 'Laporan sesuai format dari Kelurahan', d: 'Lembar cetak mengikuti buku/Excel Dasawisma PKK.' },
  { icon: Sparkles, t: 'Hitung & rekap otomatis', d: 'Umur, golongan warga, rekap dasawisma dan RT dihitung sistem.' },
  { icon: Printer, t: 'Cetak, PDF & Excel', d: 'Siap dicetak, disimpan PDF, atau diunduh Excel.' },
  { icon: ShieldCheck, t: 'Akun & hak akses', d: 'Admin, editor dan viewer dengan riwayat perubahan.' },
  { icon: Database, t: 'Data tersimpan aman', d: 'Database di server, tempat sampah & cadangan data.' },
  { icon: Smartphone, t: 'Nyaman di HP & laptop', d: 'Tampilan menyesuaikan layar.' },
]

/** Halaman Tentang: identitas aplikasi & pembuatnya */
export default function Tentang() {
  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="shine relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-6 text-white shadow-xl">
        <Heart aria-hidden size={160} className="pointer-events-none absolute -bottom-10 -right-6 rotate-12 text-white/10" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <img src="./icon.svg" alt="" className="floaty h-16 w-16 rounded-2xl shadow-lg ring-2 ring-white/60" />
          <div>
            <h2 className="font-display text-2xl font-extrabold">SIWARGA PKK</h2>
            <p className="text-sm text-white/85">Sistem Informasi Data Warga Kelompok PKK RT 08 · Padukuhan Mantup, Baturetno</p>
            <p className="mt-1 text-xs text-white/70">Versi {new Date(__BUILD__).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
          </div>
        </div>
      </motion.div>

      <Card tone="fuchsia" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-lg"><UserRound size={28} /></div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">Created by</div>
            <div className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Etri Restu Lestari</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Untuk Kelompok PKK RT 08 Mantup, agar pendataan warga dan rekapitulasi lebih mudah, rapi, dan cepat.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FITUR.map((f) => (
          <Card key={f.t} tone="violet" className="p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow"><f.icon size={18} /></span>
              <div><div className="font-semibold text-slate-800 dark:text-white">{f.t}</div><div className="text-xs text-slate-500">{f.d}</div></div>
            </div>
          </Card>
        ))}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400"><Code2 size={14} /> © {new Date().getFullYear()} Etri Restu Lestari · Kelompok PKK RT 08 Mantup</p>
    </div>
  )
}
