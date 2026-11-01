import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { House, Plus, Pencil, Trash2, Users, Droplets, Crown } from 'lucide-react'
import { useLive, useStore } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Button, Card, Chip, Empty, IconBtn, PageHeader, SearchBox, Select, useConfirm, Avatar } from '@/components/ui'
import { isKepala } from '@/lib/rules'
import { hapusKeluargaDenganAnggota } from '@/lib/crud'

export default function KeluargaPage() {
  const keluarga = useLive('keluarga')
  const warga = useLive('warga')
  const dasawisma = useLive('dasawisma')
  const { openKeluarga } = useEditor()
  const nav = useNavigate()
  const confirm = useConfirm()
  const st = useStore()
  const [q, setQ] = useState('')
  const [dw, setDw] = useState('')

  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return keluarga
      .map((k) => {
        const ang = warga.filter((w) => w.keluargaId === k.id && w.statusWarga === 'Aktif').sort((a, b) => a.urut - b.urut)
        return { k, ang, kepala: ang.find(isKepala) ?? ang[0], kks: [...new Set(ang.map((w) => w.noKK).filter(Boolean))] }
      })
      .filter((r) => !dw || r.kepala?.dasawisma === dw)
      .filter((r) => !s || String(r.k.nomor) === s || r.kks.some((x) => x.includes(s)) || r.ang.some((w) => w.nama.toLowerCase().includes(s)))
      .sort((a, b) => a.k.nomor - b.k.nomor)
  }, [keluarga, warga, q, dw])

  return (
    <div>
      <PageHeader title="Keluarga" subtitle={`${keluarga.length} keluarga (ID keluarga seperti kolom DE di Excel)`} icon={House} color="amber" actions={<Button icon={Plus} onClick={() => openKeluarga()}>Tambah</Button>} />
      <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row">
        <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder="Cari nomor keluarga, No KK, atau nama anggota…" /></div>
        <div className="sm:w-48"><Select options={dasawisma.map((d) => d.nama)} value={dw} onChange={setDw} placeholder="Semua Dasawisma" /></div>
      </Card>
      {rows.length === 0 ? (
        <Card><Empty title="Belum ada keluarga" icon={House} action={<Button icon={Plus} onClick={() => openKeluarga()}>Tambah keluarga</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ k, ang, kepala, kks }, i) => {
            const L = ang.filter((w) => w.jk === 'L').length
            return (
              <motion.div key={k.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.025 }} whileHover={{ y: -3 }}>
                <Card tone={dasawisma.find((d) => d.nama === kepala?.dasawisma)?.warna ?? 'amber'} className="cursor-pointer p-4" onClick={() => nav(`/keluarga/${k.id}`)}>
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">{kepala ? <Avatar nama={kepala.nama} jk={kepala.jk} /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-slate-500"><House size={18} /></div>}<span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-1 text-[10px] font-extrabold text-white shadow ring-2 ring-white dark:ring-slate-900">{k.nomor}</span></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate font-semibold text-slate-900 dark:text-white">{kepala ? <><Crown size={14} className="shrink-0 text-amber-500" />{kepala.nama}</> : <span className="text-red-500">Belum ada anggota</span>}</div>
                      <div className="truncate text-xs text-slate-400">{kks.length ? `${kks.length} No KK` : 'tanpa No KK'}</div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex">
                      <IconBtn icon={Pencil} label="Ubah data rumah" onClick={() => openKeluarga(k.id)} />
                      <IconBtn icon={Trash2} label="Hapus keluarga" onClick={async () => {
                        if (await confirm({ title: 'Hapus keluarga?', message: ang.length ? `Keluarga ini beserta ${ang.length} anggotanya dipindah ke Tempat Sampah.` : 'Data rumah keluarga ini dipindah ke Tempat Sampah.', danger: true, okText: 'Hapus' })) hapusKeluargaDenganAnggota(st, k.id, kepala?.nama ?? `Keluarga ${k.nomor}`)
                      }} />
                    </div>
                  </div>
                  {ang.length > 0 && <div className="mt-3 flex -space-x-2">{ang.slice(0, 7).map((w) => <span key={w.id} title={`${w.nama} · ${w.statusKeluarga}`} className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 ${w.jk === 'P' ? 'from-pink-400 to-fuchsia-500' : 'from-sky-400 to-indigo-500'}`}>{w.nama.split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()}</span>)}{ang.length > 7 && <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900">+{ang.length - 7}</span>}</div>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Chip color={dasawisma.find((d) => d.nama === kepala?.dasawisma)?.warna ?? 'slate'} icon={Users}>{kepala?.dasawisma || '—'}</Chip>
                    <Chip color="indigo">{ang.length} jiwa · {L}L / {ang.length - L}P</Chip>
                    <Chip color="sky" icon={Droplets}>{k.sumberAir || '—'}</Chip>
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
