import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { House, Plus, Pencil, Trash2, Users, Droplets, Crown } from 'lucide-react'
import { useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Button, Card, Chip, Empty, IconBtn, PageHeader, SearchBox, Select, useConfirm } from '@/components/ui'
import { isKepala } from '@/lib/rules'
import { hapusDenganUndo } from '@/lib/crud'
import { maskNIK } from '@/lib/format'

export default function KeluargaPage() {
  const keluarga = useLive('keluarga')
  const warga = useLive('warga')
  const dasawisma = useLive('dasawisma')
  const { openKeluarga } = useEditor()
  const nav = useNavigate()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [dw, setDw] = useState('')

  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return keluarga
      .map((k) => {
        const ang = warga.filter((w) => w.noKK === k.noKK && w.statusWarga === 'Aktif')
        return { k, ang, kepala: ang.find(isKepala) }
      })
      .filter((r) => !dw || r.k.dasawisma === dw)
      .filter((r) => !s || r.k.noKK.includes(s) || r.ang.some((w) => w.nama.toLowerCase().includes(s)))
      .sort((a, b) => (a.kepala?.nama ?? 'zz').localeCompare(b.kepala?.nama ?? 'zz'))
  }, [keluarga, warga, q, dw])

  return (
    <div>
      <PageHeader title="Keluarga (KK)" subtitle={`${keluarga.length} kartu keluarga`} icon={House} color="amber" actions={<Button icon={Plus} onClick={() => openKeluarga()}>Tambah KK</Button>} />
      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row">
        <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder="Cari No KK atau nama anggota…" /></div>
        <div className="sm:w-48"><Select options={dasawisma.map((d) => d.nama)} value={dw} onChange={setDw} placeholder="Semua Dasawisma" /></div>
      </Card>
      {rows.length === 0 ? (
        <Card><Empty title="Belum ada keluarga" icon={House} action={<Button icon={Plus} onClick={() => openKeluarga()}>Tambah KK</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ k, ang, kepala }, i) => {
            const L = ang.filter((w) => w.jk === 'L').length
            return (
              <motion.div key={k.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.025 }} whileHover={{ y: -3 }}>
                <Card className="cursor-pointer p-4 transition hover:shadow-lg" onClick={() => nav(`/keluarga/${k.id}`)}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow"><House size={20} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate font-semibold text-slate-900 dark:text-white">{kepala ? <><Crown size={14} className="text-amber-500" />{kepala.nama}</> : <span className="text-red-500">Belum ada Kepala Keluarga</span>}</div>
                      <div className="tabular text-xs text-slate-400">KK {maskNIK(k.noKK)}</div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex">
                      <IconBtn icon={Pencil} label="Ubah" onClick={() => openKeluarga(k.id)} />
                      <IconBtn icon={Trash2} label="Hapus" onClick={async () => {
                        if (ang.length && !(await confirm({ title: 'KK masih punya anggota', message: `${ang.length} anggota tetap tersimpan sebagai warga, hanya data rumah KK ini yang dihapus. Lanjutkan?`, danger: true, okText: 'Hapus KK' }))) return
                        if (!ang.length && !(await confirm({ title: 'Hapus KK?', message: 'Data rumah & sanitasi KK ini dipindah ke Tempat Sampah.', danger: true, okText: 'Hapus' }))) return
                        hapusDenganUndo('keluarga', k.id, `KK ${k.noKK}`)
                      }} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Chip color={dasawisma.find((d) => d.nama === k.dasawisma)?.warna ?? 'slate'} icon={Users}>{k.dasawisma || '—'}</Chip>
                    <Chip color="indigo">{ang.length} jiwa · {L}L / {ang.length - L}P</Chip>
                    <Chip color="sky" icon={Droplets}>{k.sumberAir}</Chip>
                    <Chip color={k.rumahSehat === 'Sehat' ? 'emerald' : 'red'}>{k.rumahSehat}</Chip>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
