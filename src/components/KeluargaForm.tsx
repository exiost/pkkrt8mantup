import { useState } from 'react'
import { toast } from 'sonner'
import { House, Save } from 'lucide-react'
import { useStore, useLive } from '@/lib/store'
import { blankKeluarga } from '@/lib/factories'
import type { Keluarga } from '@/lib/types'
import { Button, Field, Input, Modal, Select, Toggle } from './ui'

type Draft = Omit<Keluarga, 'id' | 'createdAt' | 'updatedAt'>

export default function KeluargaForm({ id, preset, onClose }: { id?: string; preset?: { noKK?: string; dasawisma?: string }; onClose: () => void }) {
  const st = useStore()
  const existing = id ? st.keluarga.find((k) => k.id === id) : undefined
  const [d, setD] = useState<Draft>(() => ({ ...blankKeluarga(), deletedAt: null, ...(existing ?? {}), ...(preset ?? {}) }) as Draft)
  const [err, setErr] = useState('')
  const P = st.settings.pilihan
  const dasawisma = useLive('dasawisma')
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  function save() {
    if (!/^\d{16}$/.test(d.noKK)) return setErr('No KK harus 16 digit angka')
    if (st.keluarga.some((k) => k.noKK === d.noKK && k.id !== id && !k.deletedAt)) return setErr('No KK sudah terdaftar')
    if (existing) {
      if (existing.noKK !== d.noKK) {
        // ikutkan anggota ke No KK baru
        st.warga.filter((w) => w.noKK === existing.noKK).forEach((w) => st.update('warga', w.id, { noKK: d.noKK }, w.nama))
      }
      st.update('keluarga', existing.id, d, `KK ${d.noKK}`)
      toast.success('Data keluarga diperbarui')
    } else {
      st.create('keluarga', d, `KK ${d.noKK}`)
      toast.success('Keluarga baru ditambahkan 🏠')
    }
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="lg" title={existing ? `Ubah KK ${existing.noKK}` : 'Tambah Keluarga (KK)'} icon={House} color="amber"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button icon={Save} onClick={save}>Simpan</Button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="No Kartu Keluarga *" error={err}><Input inputMode="numeric" maxLength={16} value={d.noKK} onChange={(e) => { setErr(''); set('noKK', e.target.value.replace(/\D/g, '')) }} /></Field>
        <Field label="Dasawisma"><Select options={dasawisma.map((x) => x.nama)} value={d.dasawisma} onChange={(v) => set('dasawisma', v)} /></Field>
        <Field label="Alamat" className="sm:col-span-2"><Input value={d.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
        <Field label="Sumber Air"><Select options={P.sumberAir} value={d.sumberAir} onChange={(v) => set('sumberAir', v)} /></Field>
        <Field label="Makanan Pokok"><Select options={P.makananPokok} value={d.makananPokok} onChange={(v) => set('makananPokok', v)} /></Field>
        <Field label="Kriteria Rumah"><Select options={P.kriteriaRumah} value={d.kriteriaRumah} onChange={(v) => set('kriteriaRumah', v)} /></Field>
        <Field label="Rumah Sehat"><Select options={P.rumahSehat} value={d.rumahSehat} onChange={(v) => set('rumahSehat', v)} /></Field>
        <Field label="Jumlah Jamban / WC"><Input inputMode="numeric" value={d.jumlahWC} onChange={(e) => set('jumlahWC', e.target.value)} /></Field>
        <div />
        <Toggle checked={d.mckSeptic} onChange={(b) => set('mckSeptic', b)} label="Memiliki MCK & Septic Tank" />
        <Toggle checked={d.kamarMandi} onChange={(b) => set('kamarMandi', b)} label="Memiliki Kamar Mandi" />
        <Toggle checked={d.spal} onChange={(b) => set('spal', b)} label="Memiliki SPAL & Penyerapan Air" />
        <Toggle checked={d.tps} onChange={(b) => set('tps', b)} label="Memiliki Tempat Pembuangan Sampah" />
        <Toggle checked={d.kesehatanLingkungan} onChange={(b) => set('kesehatanLingkungan', b)} label="Kegiatan Usaha Kesehatan Lingkungan" />
        <Toggle checked={d.up2k} onChange={(b) => set('up2k', b)} label="Aktivitas UP2K" />
        {d.up2k && <Field label="Jenis usaha UP2K" className="sm:col-span-2"><Input value={d.jenisUp2k} onChange={(e) => set('jenisUp2k', e.target.value)} /></Field>}
      </div>
    </Modal>
  )
}
