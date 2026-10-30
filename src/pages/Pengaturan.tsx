import { useState } from 'react'
import AkunServer from './AkunServer'
import { Server as ServerIcon, Settings, MapPin, Users, Tags, ListChecks, Palette, Plus, Trash2, Pencil, Save, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { useUi } from '@/lib/ui'
import SimpleCrud from '@/components/SimpleCrud'
import { Button, Card, Chip, Field, IconBtn, Input, PageHeader, Section, Segmented, Toggle, useConfirm } from '@/components/ui'
import { PILIHAN_LABEL, WARNA } from '@/lib/options'
import type { Settings as S } from '@/lib/types'

type Tab = 'wilayah' | 'dasawisma' | 'tag' | 'pilihan' | 'tampilan' | 'akun'

export default function Pengaturan() {
  const [tab, setTab] = useState<Tab>('wilayah')
  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Kop laporan, dasawisma, tag, daftar pilihan & tampilan" icon={Settings} color="slate" />
      <div className="mb-4 overflow-x-auto">
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'wilayah', label: 'Wilayah & TTD', icon: MapPin },
          { value: 'dasawisma', label: 'Dasawisma', icon: Users },
          { value: 'tag', label: 'Tag', icon: Tags },
          { value: 'pilihan', label: 'Daftar Pilihan', icon: ListChecks },
          { value: 'tampilan', label: 'Tampilan', icon: Palette },
          { value: 'akun', label: 'Akun & Server', icon: ServerIcon },
        ]} />
      </div>
      {tab === 'wilayah' && <Wilayah />}
      {tab === 'dasawisma' && <Dasawisma />}
      {tab === 'tag' && (
        <SimpleCrud koleksi="tags" title="Tag" icon={Tags} color="pink" labelOf={(r) => String(r.nama)} defaults={{ warna: 'violet' }}
          fields={[
            { key: 'nama', label: 'Nama tag', required: true, render: (v, r) => <Chip color={String(r.warna)}>#{String(v)}</Chip> },
            { key: 'warna', label: 'Warna', type: 'color', options: [...WARNA] },
          ]} />
      )}
      {tab === 'pilihan' && <Pilihan />}
      {tab === 'tampilan' && <Tampilan />}
      {tab === 'akun' && <AkunServer />}
    </div>
  )
}

function Wilayah() {
  const st = useStore()
  const [d, setD] = useState(st.settings)
  const F = (k: keyof S, label: string) => (
    <Field label={label}><Input value={String(d[k] ?? '')} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></Field>
  )
  return (
    <Section title="Identitas Wilayah (isian awal data warga baru)" icon={MapPin} color="teal"
      actions={<Button size="sm" icon={Save} onClick={() => { st.setSettings({ ...d, umurBalita: Number(d.umurBalita) || 5, umurLansia: Number(d.umurLansia) || 60 }); toast.success('Pengaturan disimpan') }}>Simpan</Button>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {F('rt', 'RT')}{F('rw', 'RW')}{F('padukuhan', 'Padukuhan / Dusun')}{F('kalurahan', 'Kalurahan / Desa')}
        {F('kapanewon', 'Kapanewon / Kecamatan')}{F('kabupaten', 'Kabupaten')}{F('provinsi', 'Provinsi')}
        <Field label="Batas umur balita (< tahun)"><Input type="number" value={d.umurBalita} onChange={(e) => setD({ ...d, umurBalita: +e.target.value })} /></Field>
        <Field label="Umur lansia (≥ tahun)"><Input type="number" value={d.umurLansia} onChange={(e) => setD({ ...d, umurLansia: +e.target.value })} /></Field>
      </div>
    </Section>
  )
}

function Dasawisma() {
  const st = useStore()
  const warga = useLive('warga')
  return (
    <SimpleCrud koleksi="dasawisma" title="Dasawisma" icon={Users} color="teal" labelOf={(r) => String(r.nama)} defaults={{ warna: 'teal' }}
      fields={[
        { key: 'nama', label: 'Nama dasawisma', required: true, render: (v, r) => <Chip color={String(r.warna)}>{String(v)} · {warga.filter((w) => w.dasawisma === r.nama).length} warga</Chip> },
        { key: 'ketua', label: 'Nama ketua', suggestions: warga.map((w) => w.nama) },
        { key: 'warna', label: 'Warna', type: 'color', options: [...WARNA] },
      ]}
      afterSave={(r, isNew, prev) => {
        // ganti nama dasawisma → ikut diperbarui di semua warga & KK
        if (isNew || !prev || prev.nama === r.nama) return
        st.warga.filter((w) => w.dasawisma === prev.nama).forEach((w) => st.update('warga', w.id, { dasawisma: String(r.nama) }, w.nama))
      }} />
  )
}

function Pilihan() {
  const st = useStore()
  const confirm = useConfirm()
  const [grup, setGrup] = useState('pekerjaan')
  const [baru, setBaru] = useState('')
  const [edit, setEdit] = useState<{ i: number; v: string } | null>(null)
  const list = st.settings.pilihan[grup] ?? []
  const save = (l: string[]) => st.setSettings({ pilihan: { ...st.settings.pilihan, [grup]: l } })
  const fieldOf: Record<string, string> = { agama: 'agama', pendidikan: 'pendidikan', pekerjaan: 'pekerjaan', golDarah: 'golDarah', statusKawin: 'statusKawin', statusKeluarga: 'statusKeluarga', kontrasepsi: 'kontrasepsi', riwayatSakit: 'riwayatSakit', jabatan: 'jabatan', kerjaBaktiJenis: 'kerjaBaktiJenis', keagamaanJenis: 'keagamaanJenis' }
  const dipakai = (v: string) => (fieldOf[grup] ? st.warga.filter((w) => !w.deletedAt && (w as unknown as Record<string, string>)[fieldOf[grup]] === v).length : 0)
  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <Card className="p-2">
        {Object.keys(PILIHAN_LABEL).map((g) => (
          <button key={g} onClick={() => setGrup(g)} className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${g === grup ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'}`}>{PILIHAN_LABEL[g]}</button>
        ))}
      </Card>
      <Section title={PILIHAN_LABEL[grup]} icon={ListChecks} color="violet">
        <div className="mb-3 flex gap-2">
          <Input value={baru} onChange={(e) => setBaru(e.target.value)} placeholder="Tambah nilai baru…" onKeyDown={(e) => e.key === 'Enter' && baru.trim() && (save([...list, baru.trim()]), setBaru(''))} />
          <Button icon={Plus} onClick={() => { if (baru.trim()) { save([...list, baru.trim()]); setBaru(''); toast.success('Ditambahkan') } }}>Tambah</Button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {list.map((v, i) => (
            <div key={v + i} className="flex items-center gap-2 py-1.5">
              {edit?.i === i ? (
                <>
                  <Input autoFocus value={edit.v} onChange={(e) => setEdit({ i, v: e.target.value })} />
                  <IconBtn icon={Check} label="Simpan" onClick={() => {
                    const nv = edit.v.trim()
                    if (!nv) return
                    save(list.map((x, j) => (j === i ? nv : x)))
                    const f = fieldOf[grup]
                    if (f) st.warga.filter((w) => (w as unknown as Record<string, string>)[f] === v).forEach((w) => st.update('warga', w.id, { [f]: nv }, w.nama))
                    setEdit(null)
                    toast.success('Diganti — semua data yang memakai nilai ini ikut diperbarui')
                  }} />
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{v}</span>
                  {fieldOf[grup] && <Chip>{dipakai(v)} warga</Chip>}
                  <IconBtn icon={Pencil} label="Ganti nama" onClick={() => setEdit({ i, v })} />
                  <IconBtn icon={Trash2} label="Hapus" onClick={async () => {
                    const n = dipakai(v)
                    if (await confirm({ title: 'Hapus pilihan?', message: n ? `"${v}" masih dipakai ${n} warga. Data warga tidak berubah, hanya pilihan di dropdown yang hilang.` : `Hapus "${v}" dari daftar?`, danger: true, okText: 'Hapus' })) save(list.filter((_, j) => j !== i))
                  }} />
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Tampilan() {
  const ui = useUi()
  return (
    <Section title="Tampilan" icon={Palette} color="fuchsia">
      <div className="space-y-3">
        <Toggle checked={ui.dark} onChange={(b) => ui.set({ dark: b })} label="Mode gelap 🌙" />
        <Toggle checked={ui.reduceMotion} onChange={(b) => ui.set({ reduceMotion: b })} label="Kurangi animasi (lebih hemat baterai)" />
      </div>
    </Section>
  )
}
