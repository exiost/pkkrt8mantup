import { useState } from 'react'
import { toast } from 'sonner'
import { House, Save } from 'lucide-react'
import { useStore } from '@/lib/store'
import { blankKeluarga } from '@/lib/factories'
import type { Keluarga } from '@/lib/types'
import { Button, Field, Input, Modal, Select, YesNo } from './ui'

type Draft = Omit<Keluarga, 'id' | 'createdAt' | 'updatedAt'>

/** Data rumah & sanitasi satu keluarga (sama dengan kolom rumah di baris Kepala Keluarga pada DATA WARGA) */
export default function KeluargaForm({ id, onClose }: { id?: string; preset?: unknown; onClose: () => void }) {
  const st = useStore()
  const existing = id ? st.keluarga.find((k) => k.id === id) : undefined
  const [d, setD] = useState<Draft>(() => ({ ...blankKeluarga(), deletedAt: null, ...(existing ?? {}) }) as Draft)
  const [err, setErr] = useState('')
  const P = st.settings.pilihan
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  function save() {
    if (!d.nomor || d.nomor < 1) return setErr('Nomor keluarga harus angka ≥ 1')
    if (st.keluarga.some((k) => k.nomor === d.nomor && k.id !== id && !k.deletedAt)) return setErr('Nomor keluarga sudah dipakai')
    if (existing) {
      st.update('keluarga', existing.id, d, `Keluarga ${d.nomor}`)
      toast.success('Data keluarga diperbarui')
    } else {
      st.create('keluarga', d, `Keluarga ${d.nomor}`)
      toast.success('Keluarga baru ditambahkan 🏠')
    }
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="lg" title={existing ? `Ubah Keluarga ${existing.nomor}` : 'Tambah Keluarga'} icon={House} color="amber"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button icon={Save} onClick={save}>Simpan</Button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nomor urut keluarga (ID keluarga) *" error={err} hint="Semua warga dengan ID ini dihitung satu keluarga, walau No KK berbeda">
          <Input inputMode="numeric" value={d.nomor || ''} onChange={(e) => { setErr(''); set('nomor', Number(e.target.value.replace(/\D/g, '')) || 0) }} />
        </Field>
        <div />
        <Field label="Sumber Air"><Select options={P.sumberAir} value={d.sumberAir} onChange={(v) => set('sumberAir', v)} allowCustom /></Field>
        <Field label="Makanan Pokok"><Select options={P.makananPokok} value={d.makananPokok} onChange={(v) => set('makananPokok', v)} allowCustom /></Field>
        <Field label="Kriteria Rumah (catatan keluarga)"><Select options={P.kriteriaRumah} value={d.kriteriaRumah} onChange={(v) => set('kriteriaRumah', v)} /></Field>
        <Field label="Kriteria Rumah (data keluarga)"><Select options={P.rumahSehat} value={d.rumahSehat} onChange={(v) => set('rumahSehat', v)} /></Field>
        <Field label="Jumlah kamar mandi / MCK" hint="0 atau kosong = tidak punya"><Input inputMode="numeric" value={d.kamarMandi} onChange={(e) => set('kamarMandi', e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Jumlah WC / jamban"><Input inputMode="numeric" value={d.jumlahWC} onChange={(e) => set('jumlahWC', e.target.value.replace(/\D/g, ''))} /></Field>
        <YesNo label="Memiliki SPAL & penyerapan air" value={d.spal} onChange={(v) => set('spal', v)} />
        <Field label="Tempat pembuangan sampah"><Select options={['Ada', 'Tidak']} value={d.tps} onChange={(v) => set('tps', v)} /></Field>
      </div>
      <p className="mt-3 text-xs text-slate-500">UP2K dan kegiatan kesehatan lingkungan dicatat per warga (langkah "Pendidikan & Ekonomi" dan "Kegiatan PKK").</p>
    </Modal>
  )
}
