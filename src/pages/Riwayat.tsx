import { History } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Card, Chip, Empty, PageHeader } from '@/components/ui'

const WARNA: Record<string, string> = { Tambah: 'emerald', Ubah: 'sky', Hapus: 'red', Pulihkan: 'violet', 'Hapus Permanen': 'rose' }
const NAMA: Record<string, string> = { warga: 'Warga', keluarga: 'Keluarga', kelahiran: 'Kelahiran', kematian: 'Kematian', pesertaKB: 'Peserta KB', dasawisma: 'Dasawisma', tags: 'Tag', kampungKB: 'Kampung KB', arsip: 'Arsip' }

export default function Riwayat() {
  const audit = useStore((s) => s.audit).slice(0, 300)
  return (
    <div>
      <PageHeader title="Riwayat Perubahan" subtitle="300 aktivitas terakhir" icon={History} color="slate" />
      {audit.length === 0 ? <Card><Empty title="Belum ada aktivitas" icon={History} /></Card> : (
        <Card className="p-4">
          <ol className="relative ml-2 border-l-2 border-violet-100 dark:border-white/10">
            {audit.map((a) => (
              <li key={a.id} className="mb-3 ml-5">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                <div className="flex flex-wrap items-center gap-2 text-sm"><Chip color={WARNA[a.aksi]}>{a.aksi}</Chip><Chip>{NAMA[a.koleksi] ?? a.koleksi}</Chip><span className="font-semibold">{a.label}</span></div>
                <div className="text-xs text-slate-400">{new Date(a.waktu).toLocaleString('id-ID')}</div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}
