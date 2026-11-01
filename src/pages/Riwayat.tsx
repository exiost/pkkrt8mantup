import { History, Plus, Pencil, Trash2, RotateCcw, XCircle, type LucideIcon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Card, Chip, Empty, PageHeader } from '@/components/ui'

const WARNA: Record<string, string> = { Tambah: 'emerald', Ubah: 'sky', Hapus: 'red', Pulihkan: 'violet', 'Hapus Permanen': 'rose' }
const IKON: Record<string, [LucideIcon, string]> = { Tambah: [Plus, 'from-emerald-400 to-teal-500'], Ubah: [Pencil, 'from-sky-400 to-indigo-500'], Hapus: [Trash2, 'from-rose-400 to-red-500'], Pulihkan: [RotateCcw, 'from-violet-400 to-fuchsia-500'], 'Hapus Permanen': [XCircle, 'from-rose-500 to-red-700'] }
const NAMA: Record<string, string> = { warga: 'Warga', keluarga: 'Keluarga', kelahiran: 'Kelahiran', kematian: 'Kematian', pesertaKB: 'Peserta KB', pusBaru: 'PUS Baru', dasawisma: 'Dasawisma', tags: 'Tag', kampungKB: 'Kampung KB', arsip: 'Arsip' }

export default function Riwayat() {
  const audit = useStore((s) => s.audit).slice(0, 300)
  return (
    <div>
      <PageHeader title="Riwayat Perubahan" subtitle="300 aktivitas terakhir" icon={History} color="slate" />
      {audit.length === 0 ? <Card><Empty title="Belum ada aktivitas" icon={History} /></Card> : (
        <Card className="p-4">
          <ol className="relative ml-2 border-l-2 border-violet-100 dark:border-white/10">
            {audit.map((a) => (
              <li key={a.id} className="mb-4 ml-6">
                {(() => { const [I, g] = IKON[a.aksi] ?? [History, 'from-violet-500 to-fuchsia-500']; return <span className={`absolute -left-[15px] grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-white shadow ring-4 ring-white dark:ring-slate-900 ${g}`}><I size={13} /></span> })()}
                <div className="flex flex-wrap items-center gap-2 text-sm"><Chip color={WARNA[a.aksi]}>{a.aksi}</Chip><Chip>{NAMA[a.koleksi] ?? a.koleksi}</Chip><span className="font-semibold">{a.label}</span></div>
                <div className="text-xs text-slate-400">{new Date(a.waktu).toLocaleString('id-ID')}{a.oleh ? ` · oleh ${a.oleh}` : ''}</div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}
