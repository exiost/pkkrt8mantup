import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, Info } from 'lucide-react'
import { useLive } from '@/lib/store'
import { periksaData, urutTemuan, type Temuan } from '@/lib/periksa'
import { todayISO } from '@/lib/format'
import { Card, Chip, PageHeader } from '@/components/ui'

/** Halaman "Cek Data": daftar isian janggal di RT ini, dikelompokkan per jenis, langsung bisa dibuka & dibetulkan */
export default function CekData() {
  const warga = useLive('warga')
  const keluarga = useLive('keluarga')
  const dasawisma = useLive('dasawisma')
  const [saring, setSaring] = useState<'semua' | 'penting'>('semua')
  const temuan = useMemo(() => urutTemuan(periksaData(warga, keluarga, dasawisma, todayISO())), [warga, keluarga, dasawisma])
  const kelompok = useMemo(() => {
    const m = new Map<string, Temuan[]>()
    for (const t of temuan) if (saring === 'semua' || t.tingkat === 'penting') (m.get(t.judul) ?? m.set(t.judul, []).get(t.judul)!).push(t)
    return [...m.entries()]
  }, [temuan, saring])
  const penting = temuan.filter((t) => t.tingkat === 'penting').length

  return (
    <div>
      <PageHeader title="Cek Data" subtitle="Isian yang janggal atau belum lengkap di RT ini — klik untuk membetulkan" icon={ClipboardCheck} color="emerald" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setSaring('semua')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${saring === 'semua' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>Semua ({temuan.length})</button>
        <button onClick={() => setSaring('penting')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${saring === 'penting' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200'}`}>Penting ({penting})</button>
        <span className="flex items-center gap-1 text-xs text-slate-400"><Info size={12} /> Hanya memberi tahu — data tidak diubah otomatis. Warga nonaktif / pindah / meninggal tidak diperiksa.</span>
      </div>
      {kelompok.length === 0 && (
        <Card className="grid place-items-center gap-2 p-10 text-center">
          <CheckCircle2 size={44} className="text-emerald-500" />
          <div className="font-display text-lg font-extrabold">Data rapi 🎉</div>
          <div className="text-sm text-slate-500">Tidak ada isian janggal yang ditemukan.</div>
        </Card>
      )}
      <div className="space-y-4">
        {kelompok.map(([judul, xs]) => (
          <Card key={judul} className="overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold ${xs[0].tingkat === 'penting' ? 'bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-100' : 'bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100'}`}>
              <AlertTriangle size={16} className="shrink-0" /> <span className="min-w-0 flex-1">{judul}</span> <Chip color={xs[0].tingkat === 'penting' ? 'red' : 'amber'}>{xs.length}</Chip>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {xs.slice(0, 200).map((t, i) => (
                <Link key={`${t.kode}-${t.wargaId ?? t.keluargaId}-${i}`} to={t.keluargaId && !t.wargaId ? `/keluarga/${t.keluargaId}` : t.kode.startsWith('tanpa-kepala') || t.kode.startsWith('kepala-ganda') ? `/keluarga/${t.keluargaId}` : `/warga/${t.wargaId}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-violet-50/60 dark:hover:bg-white/5">
                  <div className="min-w-0 flex-1"><div className="font-semibold">{t.nama}</div><div className="text-xs text-slate-500">{t.pesan}</div></div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </Link>
              ))}
              {xs.length > 200 && <div className="px-4 py-2 text-xs text-slate-400">… dan {xs.length - 200} lainnya</div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
