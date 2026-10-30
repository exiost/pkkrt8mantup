import { useMemo, useState } from 'react'
import { Sprout, Factory, Pencil, Save, Printer, Home, PawPrint, Fish, Carrot, Leaf, Apple, Flower2, ChefHat, Scissors, Gem, Palette, Package, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { Avatar, Button, Card, Chip, Empty, IconBtn, Modal, PageHeader, SearchBox, Toggle, StatCard } from '@/components/ui'
import { ItemEditor } from '@/components/WargaForm'
import type { ItemIRT, ItemPekarangan, Warga } from '@/lib/types'

/** Ikon & warna per kategori supaya langsung terbaca */
const KAT_PK: Record<string, { icon: LucideIcon; color: string }> = {
  Peternakan: { icon: PawPrint, color: 'amber' }, Perikanan: { icon: Fish, color: 'sky' }, 'Warung Hidup': { icon: Carrot, color: 'orange' },
  Toga: { icon: Leaf, color: 'emerald' }, 'Tanaman Buah': { icon: Apple, color: 'rose' }, 'Tanaman lain lain': { icon: Flower2, color: 'fuchsia' },
}
const KAT_IRT: Record<string, { icon: LucideIcon; color: string }> = {
  'Pangan / Catering': { icon: ChefHat, color: 'orange' }, Jahit: { icon: Scissors, color: 'violet' }, Payet: { icon: Gem, color: 'pink' },
  'Jasa Payet': { icon: Gem, color: 'fuchsia' }, Kerajinan: { icon: Palette, color: 'teal' }, Lainnya: { icon: Package, color: 'slate' },
}
const ik = (m: Record<string, { icon: LucideIcon; color: string }>, k: string, fb: { icon: LucideIcon; color: string }) => m[k] ?? fb

export default function Pekarangan() {
  const warga = useLive('warga')
  const [q, setQ] = useState('')
  const [semua, setSemua] = useState(false)
  const [edit, setEdit] = useState<Warga | null>(null)
  const nav = useNavigate()
  const list = warga
    .filter((w) => semua || w.pekarangan.length || w.irt.length)
    .filter((w) => !q || w.nama.toLowerCase().includes(q.toLowerCase()) || JSON.stringify(w.pekarangan).toLowerCase().includes(q.toLowerCase()) || JSON.stringify(w.irt).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.pekarangan.length + b.irt.length) - (a.pekarangan.length + a.irt.length) || a.nama.localeCompare(b.nama, 'id'))
  const rekap = useMemo(() => {
    const m = new Map<string, number>()
    warga.forEach((w) => w.pekarangan.forEach((p) => m.set(p.kategori, (m.get(p.kategori) ?? 0) + 1)))
    return [...m.entries()]
  }, [warga])
  const nIRT = warga.filter((w) => w.irt.length).length
  return (
    <div>
      <PageHeader title="Pekarangan & IRT" subtitle="HATINYA PKK (pemanfaatan tanah pekarangan) & Industri Rumah Tangga" icon={Sprout} color="lime"
        actions={<Button variant="outline" icon={Printer} onClick={() => nav('/laporan/ht-irt')}>Cetak</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {rekap.map(([k, n], i) => { const x = ik(KAT_PK, k, { icon: Sprout, color: 'lime' }); return <StatCard key={k} label={k} value={n} icon={x.icon} color={x.color} i={i} /> })}
        <StatCard label="Pelaku IRT" value={nIRT} icon={Factory} color="orange" i={rekap.length} />
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder="Cari warga atau komoditi…" /></div>
        <Toggle checked={semua} onChange={setSemua} label="Tampilkan semua warga" />
      </div>
      {list.length === 0 ? <Card><Empty title="Belum ada data pekarangan / IRT" icon={Sprout} /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
              <Card tone={w.irt.length && !w.pekarangan.length ? 'orange' : 'lime'} className="h-full p-4">
                <div className="flex items-center gap-3">
                  <Avatar nama={w.nama} jk={w.jk} />
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold">{w.nama}</div><div className="flex items-center gap-1 text-xs text-slate-500"><Home size={11} /> {w.dasawisma}</div></div>
                  <IconBtn icon={Pencil} label="Ubah" onClick={() => setEdit(w)} />
                </div>
                {w.pekarangan.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-lime-700 dark:text-lime-300"><Sprout size={11} /> Pekarangan</div>
                    <div className="flex flex-wrap gap-1.5">
                      {w.pekarangan.map((p, i) => { const x = ik(KAT_PK, p.kategori, { icon: Sprout, color: 'lime' }); return <Chip key={i} color={x.color} icon={x.icon}>{p.komoditi}{p.jumlah ? ` · ${p.jumlah}` : ''}</Chip> })}
                    </div>
                  </div>
                )}
                {w.irt.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300"><Factory size={11} /> Industri Rumah Tangga</div>
                    <div className="flex flex-wrap gap-1.5">
                      {w.irt.map((p, i) => { const x = ik(KAT_IRT, p.kategori, { icon: Factory, color: 'orange' }); return <Chip key={'x' + i} color={x.color} icon={x.icon}>{p.komoditi}{p.volume ? ` · ${p.volume}` : ''}</Chip> })}
                    </div>
                  </div>
                )}
                {!w.pekarangan.length && !w.irt.length && <div className="mt-3 text-xs text-slate-400">Belum ada data. Klik ✏️ untuk menambah.</div>}
              </Card>
            </motion.div>
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
