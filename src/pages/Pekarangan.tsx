import { useMemo, useState } from 'react'
import { Sprout, Factory, Pencil, Save, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { Avatar, Button, Card, Chip, Empty, IconBtn, Modal, PageHeader, SearchBox, Toggle, StatCard } from '@/components/ui'
import { ItemEditor } from '@/components/WargaForm'
import type { ItemIRT, ItemPekarangan, Warga } from '@/lib/types'

export default function Pekarangan() {
  const warga = useLive('warga')
  const [q, setQ] = useState('')
  const [semua, setSemua] = useState(false)
  const [edit, setEdit] = useState<Warga | null>(null)
  const nav = useNavigate()
  const list = warga
    .filter((w) => semua || w.pekarangan.length || w.irt.length)
    .filter((w) => !q || w.nama.toLowerCase().includes(q.toLowerCase()) || JSON.stringify(w.pekarangan).toLowerCase().includes(q.toLowerCase()))
  const rekap = useMemo(() => {
    const m = new Map<string, number>()
    warga.forEach((w) => w.pekarangan.forEach((p) => m.set(p.kategori, (m.get(p.kategori) ?? 0) + 1)))
    return [...m.entries()]
  }, [warga])
  const nIRT = warga.filter((w) => w.irt.length).length
  const COLORS = ['lime', 'emerald', 'teal', 'amber', 'orange', 'sky']
  return (
    <div>
      <PageHeader title="Pekarangan & IRT" subtitle="HATINYA PKK (pemanfaatan tanah pekarangan) & Industri Rumah Tangga" icon={Sprout} color="lime"
        actions={<Button variant="outline" icon={Printer} onClick={() => nav('/laporan/ht-irt')}>Cetak</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {rekap.map(([k, n], i) => <StatCard key={k} label={k} value={n} icon={Sprout} color={COLORS[i % COLORS.length]} i={i} />)}
        <StatCard label="Pelaku IRT" value={nIRT} icon={Factory} color="orange" i={rekap.length} />
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder="Cari warga atau komoditi…" /></div>
        <Toggle checked={semua} onChange={setSemua} label="Tampilkan semua warga" />
      </div>
      {list.length === 0 ? <Card><Empty title="Belum ada data pekarangan / IRT" icon={Sprout} /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar nama={w.nama} jk={w.jk} />
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{w.nama}</div><div className="text-xs text-slate-500">{w.dasawisma}</div></div>
                <IconBtn icon={Pencil} label="Ubah" onClick={() => setEdit(w)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {w.pekarangan.map((p, i) => <Chip key={i} color="lime" icon={Sprout}>{p.komoditi} · {p.jumlah}</Chip>)}
                {w.irt.map((p, i) => <Chip key={'x' + i} color="orange" icon={Factory}>{p.komoditi} · {p.volume}</Chip>)}
                {!w.pekarangan.length && !w.irt.length && <span className="text-xs text-slate-400">Belum ada</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && <EditItems w={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function EditItems({ w, onClose }: { w: Warga; onClose: () => void }) {
  const st = useStore()
  const P = st.settings.pilihan
  const [pk, setPk] = useState<ItemPekarangan[]>(w.pekarangan)
  const [irt, setIrt] = useState<ItemIRT[]>(w.irt)
  return (
    <Modal open onClose={onClose} title={`Pekarangan & IRT — ${w.nama}`} icon={Sprout} color="lime" size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button icon={Save} onClick={() => {
        st.update('warga', w.id, { pekarangan: pk.filter((x) => x.komoditi), irt: irt.filter((x) => x.komoditi || x.kategori) }, w.nama)
        toast.success('Data pekarangan & IRT disimpan 🌱')
        onClose()
      }}>Simpan</Button></>}>
      <h4 className="mb-2 flex items-center gap-2 font-display font-bold text-lime-700"><Sprout size={16} /> Pemanfaatan Pekarangan</h4>
      <div className="grid"><ItemEditor rows={pk} onChange={setPk} empty={{ kategori: 'Warung Hidup', komoditi: '', jumlah: '' }} cols={[{ key: 'kategori', label: 'Kategori', options: P.kategoriPekarangan }, { key: 'komoditi', label: 'Komoditi' }, { key: 'jumlah', label: 'Jumlah', placeholder: 'mis. 2 pot' }]} /></div>
      <h4 className="mb-2 mt-5 flex items-center gap-2 font-display font-bold text-orange-700"><Factory size={16} /> Industri Rumah Tangga</h4>
      <div className="grid"><ItemEditor rows={irt} onChange={setIrt} empty={{ kategori: 'Pangan / Catering', komoditi: '', volume: '' }} cols={[{ key: 'kategori', label: 'Kategori', options: P.kategoriIRT }, { key: 'komoditi', label: 'Komoditi' }, { key: 'volume', label: 'Volume', placeholder: 'mis. 20 pcs per hari' }]} /></div>
    </Modal>
  )
}
