import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, House, Pencil, UserPlus, ArrowUp, ArrowDown, LogOut, Printer, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Avatar, Button, Card, Chip, Empty, IconBtn, PageHeader, Section, useConfirm } from '@/components/ui'
import { hitungUmur, isBalita, isLansia, isPUS, isWUS } from '@/lib/rules'
import { todayISO, yt } from '@/lib/format'

const ORDER = ['Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Cucu', 'Orang Tua', 'Mertua', 'Famili Lain']

export default function KeluargaDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const st = useStore()
  const k = st.keluarga.find((x) => x.id === id)
  const warga = useLive('warga')
  const { openWarga, openKeluarga } = useEditor()
  const confirm = useConfirm()
  if (!k) return <Card><Empty title="KK tidak ditemukan" action={<Button onClick={() => nav('/keluarga')}>Kembali</Button>} /></Card>
  const acuan = todayISO()
  const ang = warga
    .filter((w) => w.noKK === k.noKK)
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.statusKeluarga), ib = ORDER.indexOf(b.statusKeluarga)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a.tglLahir || '').localeCompare(b.tglLahir || '')
    })
  const s = st.settings
  const ring = [
    ['Balita', ang.filter((w) => isBalita(w, acuan, s)).length, 'amber'],
    ['PUS', ang.filter((w) => isPUS(w, acuan)).length, 'rose'],
    ['WUS', ang.filter((w) => isWUS(w, acuan)).length, 'pink'],
    ['Ibu Hamil', ang.filter((w) => w.hamil).length, 'fuchsia'],
    ['Menyusui', ang.filter((w) => w.menyusui).length, 'violet'],
    ['Lansia', ang.filter((w) => isLansia(w, acuan, s)).length, 'orange'],
    ['3 Buta', ang.filter((w) => w.tigaButa).length, 'slate'],
  ] as const
  const kepala = ang.find((w) => /kepala/i.test(w.statusKeluarga))

  async function keluarkan(wid: string, nama: string) {
    if (await confirm({ title: 'Keluarkan dari KK?', message: <><b>{nama}</b> tetap tersimpan sebagai warga, tapi No KK-nya dikosongkan.</>, okText: 'Keluarkan' })) {
      st.update('warga', wid, { noKK: '' }, nama)
      toast.success(`${nama} dikeluarkan dari KK`)
    }
  }

  return (
    <div>
      <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-violet-600"><ArrowLeft size={16} /> Kembali</button>
      <PageHeader title={kepala ? `Keluarga ${kepala.nama}` : `KK ${k.noKK}`} subtitle={`No KK ${k.noKK} · ${k.dasawisma}`} icon={House} color="amber"
        actions={<>
          <Button variant="outline" icon={Printer} onClick={() => nav(`/laporan/data-keluarga?kk=${k.noKK}`)}>Cetak</Button>
          <Button variant="outline" icon={Pencil} onClick={() => openKeluarga(k.id)}>Ubah KK</Button>
          <Button icon={UserPlus} onClick={() => openWarga(undefined, { noKK: k.noKK, dasawisma: k.dasawisma, alamat: k.alamat, statusKeluarga: ang.length ? 'Anak' : 'Kepala Keluarga' })}>Tambah Anggota</Button>
        </>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {ring.map(([l, n, c]) => <Chip key={l} color={c}>{l}: {n}</Chip>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title={`Anggota (${ang.length})`} icon={UserPlus} color="indigo">
            {ang.length === 0 && <Empty title="Belum ada anggota" />}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {ang.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 py-2">
                  <Avatar nama={w.nama} jk={w.jk} />
                  <Link to={`/warga/${w.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate font-semibold hover:text-violet-600">{/kepala/i.test(w.statusKeluarga) && <Crown size={14} className="text-amber-500" />}{w.nama}</div>
                    <div className="text-xs text-slate-500">{w.statusKeluarga} · {hitungUmur(w.tglLahir, acuan) ?? '-'} th · {w.pendidikan}</div>
                  </Link>
                  <IconBtn icon={ArrowUp} label="Jadikan Kepala Keluarga" disabled={i === 0} onClick={() => {
                    if (kepala) st.update('warga', kepala.id, { statusKeluarga: kepala.jk === 'L' ? 'Suami' : 'Istri' }, kepala.nama)
                    st.update('warga', w.id, { statusKeluarga: 'Kepala Keluarga' }, w.nama)
                    toast.success(`${w.nama} kini Kepala Keluarga`)
                  }} />
                  <IconBtn icon={Pencil} label="Ubah" onClick={() => openWarga(w.id)} />
                  <IconBtn icon={LogOut} label="Keluarkan dari KK" onClick={() => keluarkan(w.id, w.nama)} />
                </div>
              ))}
            </div>
            <PindahAnggota noKK={k.noKK} />
          </Section>
        </div>
        <Section title="Rumah & Sanitasi" icon={House} color="teal" actions={<IconBtn icon={Pencil} label="Ubah" onClick={() => openKeluarga(k.id)} />}>
          {([
            ['Sumber Air', k.sumberAir], ['Makanan Pokok', k.makananPokok], ['Kriteria Rumah', k.kriteriaRumah], ['Rumah Sehat', k.rumahSehat],
            ['Jamban/WC', k.jumlahWC], ['MCK & Septic Tank', yt(k.mckSeptic)], ['SPAL', yt(k.spal)], ['Tempat Sampah', yt(k.tps)],
            ['UP2K', k.up2k ? k.jenisUp2k || 'Ya' : 'Tidak'], ['Kesehatan Lingkungan', yt(k.kesehatanLingkungan)],
          ] as const).map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-dashed border-slate-100 py-1.5 text-sm last:border-0 dark:border-white/5"><span className="text-slate-500">{a}</span><span className="font-medium">{b}</span></div>
          ))}
        </Section>
      </div>
    </div>
  )
}

function PindahAnggota({ noKK }: { noKK: string }) {
  const st = useStore()
  const warga = useLive('warga')
  const kandidat = warga.filter((w) => w.noKK !== noKK).sort((a, b) => a.nama.localeCompare(b.nama))
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5 sm:flex-row sm:items-center">
      <span className="text-xs font-semibold text-slate-500"><ArrowDown size={14} className="inline" /> Pindahkan warga lain ke KK ini:</span>
      <select className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-slate-800" value="" onChange={(e) => {
        const w = warga.find((x) => x.id === e.target.value)
        if (!w) return
        st.update('warga', w.id, { noKK }, w.nama)
        toast.success(`${w.nama} dipindah ke KK ini`)
      }}>
        <option value="">— pilih warga —</option>
        {kandidat.map((w) => <option key={w.id} value={w.id}>{w.nama} ({w.noKK ? 'KK …' + w.noKK.slice(-4) : 'tanpa KK'})</option>)}
      </select>
    </div>
  )
}
