import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowUpWideNarrow, Baby, CalendarRange, Droplets, HeartCrack, HeartPulse, Milk, ShieldCheck, Stethoscope, CalendarHeart, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import SimpleCrud from '@/components/SimpleCrud'
import { Avatar, Button, Card, Chip, Empty, Input, PageHeader, SearchBox, Segmented, StatCard, Toggle } from '@/components/ui'
import RiwayatIbuModal from '@/components/RiwayatIbu'
import type { Warga } from '@/lib/types'
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

const STATUS_KEYS = [
  { key: 'hamil', label: 'Hamil', icon: Baby, grad: 'from-fuchsia-500 to-pink-500' },
  { key: 'melahirkan', label: 'Melahirkan', icon: HeartPulse, grad: 'from-rose-500 to-red-500' },
  { key: 'nifas', label: 'Nifas', icon: Droplets, grad: 'from-violet-500 to-indigo-500' },
  { key: 'menyusui', label: 'Menyusui', icon: Milk, grad: 'from-sky-500 to-cyan-500' },
] as const

/** Makin banyak status & info terisi, makin besar nilainya (tampil paling atas) */
function skorIbu(w: Warga, ym: string) {
  const n = STATUS_KEYS.filter((k) => w[k.key]).length
  const bobot = (w.hamil ? 8 : 0) + (w.melahirkan ? 4 : 0) + (w.nifas ? 2 : 0) + (w.menyusui ? 1 : 0)
  const info = (w.hpl ? 1 : 0) + (w.hamilKe ? 1 : 0) + (w.riwayatIbu?.some((r) => r.bulan === ym) ? 1 : 0)
  return n * 100 + (n ? info * 10 : 0) + bobot
}

function StatusIbu() {
  const st = useStore()
  const warga = useLive('warga')
  const [q, setQ] = useState('')
  const [semua, setSemua] = useState(false)
  const [riwayat, setRiwayat] = useState<Warga | null>(null)
  const dws = useLive('dasawisma').map((d) => d.nama)
  const acuan = todayISO()
  const ym = acuan.slice(0, 7)
  const base = warga
    .filter((w) => w.jk === 'P' && w.statusWarga === 'Aktif')
    .filter((w) => semua || w.hamil || w.melahirkan || w.nifas || w.menyusui || w.riwayatIbu?.length || isPUS(w, acuan) || isWUS(w, acuan))
    .filter((w) => !q || w.nama.toLowerCase().includes(q.toLowerCase()))
  // urutan diperbarui sebentar setelah saklar digeser, supaya kartu tidak melompat saat ditekan
  const sig = base.map((w) => `${w.id}:${skorIbu(w, ym)}`).join('|')
  const [urut, setUrut] = useState(sig)
  useEffect(() => { const t = setTimeout(() => setUrut(sig), 900); return () => clearTimeout(t) }, [sig])
  const skor = new Map(urut.split('|').filter(Boolean).map((x) => { const [id, v] = x.split(':'); return [id, Number(v)] as const }))
  const list = [...base].sort((a, b) => (skor.get(b.id) ?? skorIbu(b, ym)) - (skor.get(a.id) ?? skorIbu(a, ym)) || a.nama.localeCompare(b.nama, 'id'))
  const upd = (id: string, nama: string, p: Record<string, unknown>) => st.update('warga', id, p, nama)
  const jum = (k: (typeof STATUS_KEYS)[number]['key']) => base.filter((w) => w[k]).length
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_KEYS.map((k, i) => <StatCard key={k.key} label={k.label} value={jum(k.key)} icon={k.icon} color={['fuchsia', 'rose', 'violet', 'sky'][i]} i={i} />)}
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder="Cari nama ibu…" /></div>
        <Toggle checked={semua} onChange={setSemua} label="Tampilkan semua perempuan" />
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500"><ArrowUpWideNarrow size={14} /> Ibu dengan status paling banyak otomatis di atas.</p>
      {list.length === 0 ? <Card><Empty title="Tidak ada data" icon={Stethoscope} /></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((w) => {
            const d = hariMenujuHPL(w.hpl, acuan)
            const aktifN = STATUS_KEYS.filter((k) => w[k.key]).length
            const catatan = w.riwayatIbu?.find((r) => r.bulan === ym)
            return (
              <motion.div key={w.id} layout transition={{ type: 'spring', damping: 30, stiffness: 320 }}>
                <Card tone={w.hamil ? 'fuchsia' : aktifN ? 'violet' : undefined} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar nama={w.nama} jk="P" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{w.nama}</div>
                      <div className="text-xs text-slate-500">{hitungUmur(w.tglLahir, acuan) ?? '-'} th · Suami: {namaSuami(w, warga) || '-'} · {w.dasawisma}</div>
                    </div>
                    {w.hamil && d !== null && <Chip color={d <= 30 ? 'red' : 'fuchsia'} pulse={d <= 30} icon={CalendarHeart}>HPL {d >= 0 ? `${d} hari lagi` : `lewat ${-d} hari`}</Chip>}
                  </div>
                  {(!w.ikutPKK || !dws.some((d) => d.trim().toLowerCase() === (w.dasawisma ?? '').trim().toLowerCase())) && (
                    <div className="mt-3 space-y-1.5 rounded-xl bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
                      {!w.ikutPKK && (
                        <div className="flex flex-wrap items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0" /> <span className="flex-1"><b>Tidak ikut PKK</b> — tidak ikut dihitung di laporan.</span>
                          <Button size="sm" variant="outline" onClick={() => upd(w.id, w.nama, { ikutPKK: true })}>Ikutkan PKK</Button>
                        </div>
                      )}
                      {!dws.some((d) => d.trim().toLowerCase() === (w.dasawisma ?? '').trim().toLowerCase()) && (
                        <div className="flex flex-wrap items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0" /> <span className="flex-1"><b>Dasawisma {w.dasawisma ? `“${w.dasawisma}” tidak terdaftar` : 'belum diisi'}</b> — tidak masuk rekap per dasawisma.</span>
                          <select className="h-8 rounded-lg border border-amber-300 bg-white px-2 text-xs text-slate-800" value="" onChange={(e) => e.target.value && upd(w.id, w.nama, { dasawisma: e.target.value })}>
                            <option value="">pilih dasawisma…</option>{dws.map((d) => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {STATUS_KEYS.map((k) => {
                      const on = w[k.key]
                      return (
                        <button key={k.key} type="button" aria-pressed={on}
                          onClick={() => upd(w.id, w.nama, k.key === 'melahirkan' ? { melahirkan: !on, hamil: !on ? false : w.hamil } : { [k.key]: !on })}
                          className={`shine flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition active:scale-95 ${on ? `bg-gradient-to-br text-white shadow-md ${k.grad}` : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'}`}>
                          <k.icon size={14} /> {k.label}
                        </button>
                      )
                    })}
                  </div>
                  {w.hamil && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs text-slate-500">Hamil ke-<Input value={w.hamilKe} onChange={(e) => upd(w.id, w.nama, { hamilKe: e.target.value })} /></label>
                      <label className="text-xs text-slate-500">HPL<Input type="date" value={w.hpl} onChange={(e) => upd(w.id, w.nama, { hpl: e.target.value })} /></label>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-white/10">
                    <Button size="sm" variant="soft" icon={CalendarRange} onClick={() => setRiwayat(w)}>Catatan bulanan{w.riwayatIbu?.length ? ` (${w.riwayatIbu.length})` : ''}</Button>
                    {catatan && <Chip color="fuchsia" icon={Stethoscope}>Bulan ini: {catatan.tetapHamil && catatan.status !== 'Hamil' ? `${catatan.status}${catatan.cara ? ' ' + catatan.cara : ''} → lapor Hamil` : catatan.status}</Chip>}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
      {riwayat && <RiwayatIbuModal w={riwayat} onClose={() => setRiwayat(null)} />}
    </div>
  )
}
