import { Trash2, RotateCcw, Users, House, Baby, HeartCrack, ShieldCheck, Tags, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { Button, Card, Empty, PageHeader, Chip, useConfirm } from '@/components/ui'
import type { CollectionName } from '@/lib/types'

const KOL: { k: CollectionName; label: string; icon: typeof Users; name: (r: Record<string, unknown>) => string }[] = [
  { k: 'warga', label: 'Warga', icon: Users, name: (r) => String(r.nama) },
  { k: 'keluarga', label: 'Keluarga', icon: House, name: (r) => `KK ${r.noKK}` },
  { k: 'kelahiran', label: 'Kelahiran', icon: Baby, name: (r) => String(r.namaBayi) },
  { k: 'kematian', label: 'Kematian', icon: HeartCrack, name: (r) => String(r.nama) },
  { k: 'pesertaKB', label: 'Peserta KB', icon: ShieldCheck, name: (r) => String(r.namaIstri) },
  { k: 'dasawisma', label: 'Dasawisma', icon: Users, name: (r) => String(r.nama) },
  { k: 'tags', label: 'Tag', icon: Tags, name: (r) => String(r.nama) },
  { k: 'arsip', label: 'Arsip', icon: Archive, name: (r) => String(r.judul) },
]

export default function Sampah() {
  const st = useStore()
  const confirm = useConfirm()
  const items = KOL.flatMap((c) => (st[c.k] as unknown as Record<string, unknown>[]).filter((r) => r.deletedAt).map((r) => ({ c, r })))
    .sort((a, b) => String(b.r.deletedAt).localeCompare(String(a.r.deletedAt)))
  return (
    <div>
      <PageHeader title="Tempat Sampah" subtitle="Data yang dihapus bisa dipulihkan kapan saja" icon={Trash2} color="red"
        actions={items.length > 0 && <Button variant="danger" icon={Trash2} onClick={async () => {
          if (await confirm({ title: 'Kosongkan Tempat Sampah?', message: `${items.length} data akan dihapus permanen.`, danger: true, okText: 'Hapus permanen' })) {
            items.forEach(({ c, r }) => st.purge(c.k, String(r.id), c.name(r)))
            toast.success('Tempat Sampah dikosongkan')
          }
        }}>Kosongkan</Button>} />
      {items.length === 0 ? <Card><Empty title="Tempat Sampah kosong ✨" icon={Trash2} /></Card> : (
        <Card className="divide-y divide-slate-100 dark:divide-white/5">
          {items.map(({ c, r }) => (
            <div key={c.k + r.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/15"><c.icon size={16} /></div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{c.name(r)}</div><div className="text-xs text-slate-500">Dihapus {new Date(String(r.deletedAt)).toLocaleString('id-ID')}</div></div>
              <Chip>{c.label}</Chip>
              <Button size="sm" variant="soft" icon={RotateCcw} onClick={() => { st.restore(c.k, String(r.id), c.name(r)); toast.success(`${c.name(r)} dipulihkan`) }}>Pulihkan</Button>
              <Button size="sm" variant="ghost" icon={Trash2} className="text-red-500" onClick={async () => {
                if (await confirm({ title: 'Hapus permanen?', message: c.name(r), danger: true, okText: 'Hapus' })) st.purge(c.k, String(r.id), c.name(r))
              }}>Permanen</Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
