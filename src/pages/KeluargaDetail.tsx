import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, House, Pencil, UserPlus, ArrowUp, LogOut, Printer, Crown, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Avatar, Button, Card, Chip, Empty, IconBtn, PageHeader, Section, useConfirm } from '@/components/ui'
import { hitungUmur, isBalita, isKepala, isLansia, isPUS, isWUS, anggotaKeluarga } from '@/lib/rules'
import { todayISO } from '@/lib/format'

const ORDER = ['Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Cucu', 'Orang Tua', 'Mertua', 'Famili Lain']

export default function KeluargaDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const st = useStore()
  const k = st.keluarga.find((x) => x.id === id)
  const warga = useLive('warga')
  const { openWarga, openKeluarga } = useEditor()
  const confirm = useConfirm()
  if (!k) return <Card><Empty title="Keluarga tidak ditemukan" action={<Button onClick={() => nav('/keluarga')}>Kembali</Button>} /></Card>
  const acuan = todayISO()
  const ang = anggotaKeluarga(k.id, warga)
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
  const kepala = ang.find(isKepala)
  const kks = [...new Set(ang.map((w) => w.noKK).filter(Boolean))]
  const kandidat = warga.filter((w) => w.keluargaId !== k.id).sort((a, b) => a.nama.localeCompare(b.nama))

  async function keluarkan(wid: string, nama: string) {
    if (await confirm({ title: 'Keluarkan dari keluarga ini?', message: <><b>{nama}</b> tetap tersimpan, dibuatkan keluarga baru.</>, okText: 'Keluarkan' })) {
      st.pindahWarga(wid, '')
      toast.success(`${nama} dikeluarkan`)
    }
  }

  return (
    <div>
      <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-violet-600"><ArrowLeft size={16} /> Kembali</button>
      <PageHeader title={kepala ? `Keluarga ${kepala.nama}` : `Keluarga ${k.nomor}`} subtitle={`Nomor ${k.nomor} · ${kks.length ? kks.join(', ') : 'tanpa No KK'} · ${kepala?.dasawisma ?? ''}`} icon={House} color="amber"
        actions={<>
          <Button variant="outline" icon={Printer} onClick={() => nav(`/laporan/data-keluarga?kk=${k.id}`)}>Data Keluarga</Button>
          <Button variant="outline" icon={Printer} onClick={() => nav(`/laporan/catatan-keluarga?kk=${k.id}`)}>Catatan Keluarga</Button>
          <Button variant="outline" icon={Pencil} onClick={() => openKeluarga(k.id)}>Ubah rumah</Button>
          <Button icon={UserPlus} onClick={() => openWarga(undefined, { keluargaId: k.id, noKK: kepala?.noKK ?? '', dasawisma: kepala?.dasawisma ?? '', alamat: kepala?.alamat ?? '', dusun: kepala?.dusun ?? '', desa: kepala?.desa ?? '', kecamatan: kepala?.kecamatan ?? '', kabupaten: kepala?.kabupaten ?? '', provinsi: kepala?.provinsi ?? '', statusKeluarga: ang.length ? 'Anak' : 'Kepala Keluarga' })}>Tambah Anggota</Button>
        </>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {ring.map(([l, n, c]) => <Chip key={l} color={c}>{l}: {n}</Chip>)}
        {kks.length > 1 && <Chip color="indigo">{kks.length} No KK dalam satu keluarga</Chip>}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title={`Anggota (${ang.length})`} icon={UserPlus} color="indigo">
            {ang.length === 0 && <Empty title="Belum ada anggota" />}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {[...ang].sort((a, b) => ORDER.indexOf(a.statusKeluarga) - ORDER.indexOf(b.statusKeluarga) || a.urut - b.urut).map((w) => (
                <div key={w.id} className="flex items-center gap-2 py-2">
                  <Avatar nama={w.nama} jk={w.jk} />
                  <Link to={`/warga/${w.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate font-semibold hover:text-violet-600">{isKepala(w) && <Crown size={14} className="shrink-0 text-amber-500" />}{w.nama}</div>
                    <div className="truncate text-xs text-slate-500">{w.statusKeluarga} · {hitungUmur(w.tglLahir, acuan) ?? '-'} th{w.noKK ? ` · KK …${w.noKK.slice(-4)}` : ''}</div>
                  </Link>
                  {!isKepala(w) && <IconBtn icon={ArrowUp} label="Jadikan Kepala Keluarga" onClick={() => {
                    if (kepala) st.update('warga', kepala.id, { statusKeluarga: kepala.jk === 'L' ? 'Suami' : 'Istri' }, kepala.nama)
                    st.update('warga', w.id, { statusKeluarga: 'Kepala Keluarga' }, w.nama)
                    toast.success(`${w.nama} kini Kepala Keluarga`)
                  }} />}
                  <IconBtn icon={Pencil} label="Ubah" onClick={() => openWarga(w.id)} />
                  <IconBtn icon={LogOut} label="Keluarkan dari keluarga" onClick={() => keluarkan(w.id, w.nama)} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5 sm:flex-row sm:items-center">
              <span className="text-xs font-semibold text-slate-500"><ArrowDown size={14} className="inline" /> Pindahkan warga lain ke keluarga ini:</span>
              <select className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-slate-800" value="" onChange={(e) => {
                const w = warga.find((x) => x.id === e.target.value)
                if (!w) return
                st.pindahWarga(w.id, k.id)
                toast.success(`${w.nama} dipindah ke keluarga ini`)
              }}>
                <option value="">— pilih warga —</option>
                {kandidat.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
              </select>
            </div>
          </Section>
        </div>
        <Section title="Rumah & Sanitasi" icon={House} color="teal" actions={<IconBtn icon={Pencil} label="Ubah" onClick={() => openKeluarga(k.id)} />}>
          {([
            ['Sumber Air', k.sumberAir], ['Makanan Pokok', k.makananPokok], ['Kriteria Rumah', k.kriteriaRumah], ['Rumah Sehat', k.rumahSehat],
            ['Kamar mandi / MCK', k.kamarMandi], ['WC / jamban', k.jumlahWC], ['SPAL', k.spal], ['Tempat Sampah', k.tps],
          ] as const).map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-dashed border-slate-100 py-1.5 text-sm last:border-0 dark:border-white/5"><span className="text-slate-500">{a}</span><span className="font-medium">{b || '—'}</span></div>
          ))}
        </Section>
      </div>
    </div>
  )
}
