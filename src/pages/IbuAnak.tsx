import { useState } from 'react'
import { Baby, HeartCrack, ShieldCheck, Stethoscope, CalendarHeart, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import SimpleCrud from '@/components/SimpleCrud'
import { Avatar, Card, Chip, Empty, Input, PageHeader, SearchBox, Segmented, Toggle } from '@/components/ui'
import { hariMenujuHPL, hitungUmur, isPUS, isWUS, namaSuami } from '@/lib/rules'
import { todayISO } from '@/lib/format'

type Tab = 'status' | 'kelahiran' | 'kematian' | 'kb' | 'pus'

export default function IbuAnak() {
  const [tab, setTab] = useState<Tab>('status')
  const st = useStore()
  const dasawisma = useLive('dasawisma').map((d) => d.nama)
  const warga = useLive('warga')
  const P = st.settings.pilihan
  const { openWarga } = useEditor()
  const ibuNames = warga.filter((w) => w.jk === 'P').map((w) => w.nama)
  return (
    <div>
      <PageHeader title="Ibu & Anak, KB" subtitle="Status ibu, kelahiran, kematian & peserta KB baru" icon={Baby} color="fuchsia" />
      <div className="mb-4 overflow-x-auto">
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'status', label: 'Status Ibu', icon: CalendarHeart },
          { value: 'kelahiran', label: 'Kelahiran', icon: Baby },
          { value: 'kematian', label: 'Kematian', icon: HeartCrack },
          { value: 'kb', label: 'Peserta KB Baru', icon: ShieldCheck },
          { value: 'pus', label: 'PUS Baru/Pindah', icon: Users },
        ]} />
      </div>
      {tab === 'status' && <StatusIbu />}
      {tab === 'kelahiran' && (
        <SimpleCrud koleksi="kelahiran" title="Kelahiran" icon={Baby} color="cyan" celebrate labelOf={(r) => String(r.namaBayi)}
          fields={[
            { key: 'namaBayi', label: 'Nama Bayi', required: true },
            { key: 'jk', label: 'Jenis Kelamin', type: 'jk' },
            { key: 'tglLahir', label: 'Tanggal Lahir', type: 'date', required: true },
            { key: 'akte', label: 'Akte Kelahiran Ada', type: 'bool' },
            { key: 'namaIbu', label: 'Nama Ibu', suggestions: ibuNames },
            { key: 'namaSuami', label: 'Nama Suami' },
            { key: 'dasawisma', label: 'Dasawisma', type: 'select', options: dasawisma },
            { key: 'keterangan', label: 'Keterangan', full: true, table: false },
          ]}
          afterSave={(r, isNew) => {
            if (!isNew) return
            const ibu = warga.find((w) => w.nama === r.namaIbu)
            toast('Tambahkan bayi sebagai warga?', {
              description: ibu ? `Masuk ke KK ${ibu.nama}` : undefined,
              action: { label: 'Tambahkan', onClick: () => openWarga(undefined, { nama: String(r.namaBayi), jk: r.jk as 'L' | 'P', tglLahir: String(r.tglLahir), keluargaId: ibu?.keluargaId ?? '', noKK: ibu?.noKK ?? '', alamat: ibu?.alamat ?? '', dusun: ibu?.dusun ?? '', desa: ibu?.desa ?? '', kecamatan: ibu?.kecamatan ?? '', kabupaten: ibu?.kabupaten ?? '', provinsi: ibu?.provinsi ?? '', dasawisma: String(r.dasawisma || ibu?.dasawisma || ''), statusKeluarga: 'Anak', pendidikan: 'Tidak / Belum Sekolah', pekerjaan: 'Belum / Tidak Bekerja', agama: ibu?.agama ?? 'Islam' }) },
              duration: 10000,
            })
          }} />
      )}
      {tab === 'kematian' && (
        <SimpleCrud koleksi="kematian" title="Kematian" icon={HeartCrack} color="slate" labelOf={(r) => String(r.nama)} defaults={{ kategori: 'Bayi' }}
          fields={[
            { key: 'kategori', label: 'Kategori', type: 'select', options: ['Ibu', 'Bayi', 'Balita'], required: true },
            { key: 'nama', label: 'Nama', required: true },
            { key: 'jk', label: 'Jenis Kelamin', type: 'jk' },
            { key: 'tgl', label: 'Tanggal Meninggal', type: 'date', required: true },
            { key: 'sebab', label: 'Sebab Meninggal' },
            { key: 'namaIbu', label: 'Nama Ibu (untuk bayi/balita)', suggestions: ibuNames },
            { key: 'dasawisma', label: 'Dasawisma', type: 'select', options: dasawisma },
            { key: 'keterangan', label: 'Keterangan', full: true, table: false },
          ]}
          afterSave={(r, isNew) => {
            const w = warga.find((x) => x.nama === r.nama)
            if (isNew && w && w.statusWarga === 'Aktif') {
              toast('Ubah status warga jadi "Meninggal"?', { action: { label: 'Ya', onClick: () => st.update('warga', w.id, { statusWarga: 'Meninggal' }, w.nama) } })
            }
          }} />
      )}
      {tab === 'pus' && (
        <SimpleCrud koleksi="pusBaru" title="PUS Baru/Pindah" icon={Users} color="rose" labelOf={(r) => String(r.namaIstri)}
          fields={[
            { key: 'namaIstri', label: 'Nama Istri', required: true, suggestions: ibuNames },
            { key: 'umur', label: 'Umur', type: 'number' },
            { key: 'namaSuami', label: 'Nama Suami' },
            { key: 'tanggal', label: 'Tanggal', type: 'date' },
            { key: 'keterangan', label: 'Keterangan (baru / pindah dari / pindah ke)', full: true },
          ]} />
      )}
      {tab === 'kb' && (
        <SimpleCrud koleksi="pesertaKB" title="Peserta KB Baru" icon={ShieldCheck} color="emerald" labelOf={(r) => String(r.namaIstri)} defaults={{ rt: st.settings.rt }}
          fields={[
            { key: 'namaIstri', label: 'Nama Istri', required: true, suggestions: ibuNames },
            { key: 'umur', label: 'Umur', type: 'number' },
            { key: 'namaSuami', label: 'Nama Suami' },
            { key: 'rt', label: 'RT' },
            { key: 'jaminan', label: 'Jaminan Kesehatan', type: 'select', options: P.jaminan },
            { key: 'jumlahAnak', label: 'Jumlah Anak', type: 'number' },
            { key: 'tglKB', label: 'Tanggal KB', type: 'date' },
            { key: 'tempatKB', label: 'Tempat KB', type: 'select', options: P.tempatKB },
            { key: 'jenisAlkon', label: 'Jenis Alkon', type: 'select', options: P.kontrasepsi },
          ]}
          afterSave={(r, isNew) => {
            const w = warga.find((x) => x.nama === r.namaIstri)
            if (isNew && w && r.jenisAlkon) st.update('warga', w.id, { kontrasepsi: String(r.jenisAlkon) }, w.nama)
          }} />
      )}
    </div>
  )
}

function StatusIbu() {
  const st = useStore()
  const warga = useLive('warga')
  const [q, setQ] = useState('')
  const [semua, setSemua] = useState(false)
  const acuan = todayISO()
  const list = warga
    .filter((w) => w.jk === 'P' && w.statusWarga === 'Aktif')
    .filter((w) => semua || w.hamil || w.melahirkan || w.nifas || w.menyusui || isPUS(w, acuan) || isWUS(w, acuan))
    .filter((w) => !q || w.nama.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id')) // urutan tetap supaya kartu tidak melompat saat saklar digeser
  const upd = (id: string, nama: string, p: Record<string, unknown>) => st.update('warga', id, p, nama)
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder="Cari nama ibu…" /></div>
        <Toggle checked={semua} onChange={setSemua} label="Tampilkan semua perempuan" />
      </div>
      {list.length === 0 ? <Card><Empty title="Tidak ada data" icon={Stethoscope} /></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((w) => {
            const d = hariMenujuHPL(w.hpl, acuan)
            return (
              <Card key={w.id} className={`p-4 ${w.hamil ? 'ring-2 ring-fuchsia-300' : ''}`}>
                <div className="flex items-center gap-3">
                  <Avatar nama={w.nama} jk="P" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{w.nama}</div>
                    <div className="text-xs text-slate-500">{hitungUmur(w.tglLahir, acuan) ?? '-'} th · Suami: {namaSuami(w, warga) || '-'} · {w.dasawisma}</div>
                  </div>
                  {w.hamil && d !== null && <Chip color={d <= 30 ? 'red' : 'fuchsia'} pulse={d <= 30}>HPL {d >= 0 ? `${d} hari lagi` : `lewat ${-d} hari`}</Chip>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Toggle checked={w.hamil} onChange={(b) => upd(w.id, w.nama, { hamil: b })} label="Hamil" />
                  <Toggle checked={w.melahirkan} onChange={(b) => upd(w.id, w.nama, { melahirkan: b, hamil: b ? false : w.hamil })} label="Melahirkan" />
                  <Toggle checked={w.nifas} onChange={(b) => upd(w.id, w.nama, { nifas: b })} label="Nifas" />
                  <Toggle checked={w.menyusui} onChange={(b) => upd(w.id, w.nama, { menyusui: b })} label="Menyusui" />
                </div>
                {w.hamil && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-500">Hamil ke-<Input value={w.hamilKe} onChange={(e) => upd(w.id, w.nama, { hamilKe: e.target.value })} /></label>
                    <label className="text-xs text-slate-500">HPL<Input type="date" value={w.hpl} onChange={(e) => upd(w.id, w.nama, { hpl: e.target.value })} /></label>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
