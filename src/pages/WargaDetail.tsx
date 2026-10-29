import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Pencil, Trash2, Eye, EyeOff, IdCard, House, Users, HeartPulse, Sprout, Factory, History, Cake, MapPin } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStore, useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Avatar, Button, Card, Empty, Section, useConfirm, Chip } from '@/components/ui'
import { TagList } from '@/lib/tags'
import { hitungUmur, statusIbu } from '@/lib/rules'
import { maskNIK, tglIndo, todayISO, yt } from '@/lib/format'
import { hapusDenganUndo } from '@/lib/crud'

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-slate-100 py-1.5 text-sm last:border-0 dark:border-white/5">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium text-slate-800 dark:text-slate-100">{v || <span className="text-slate-300">—</span>}</span>
    </div>
  )
}

export default function WargaDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const w = useStore((s) => s.warga.find((x) => x.id === id))
  const semua = useLive('warga')
  const tags = useLive('tags')
  const audit = useStore((s) => s.audit.filter((a) => a.recordId.split(',').includes(id ?? '')).slice(0, 15))
  const settings = useStore((s) => s.settings)
  const { openWarga } = useEditor()
  const confirm = useConfirm()
  const [showNik, setShowNik] = useState(false)
  if (!w) return <Card><Empty title="Warga tidak ditemukan" action={<Button onClick={() => nav('/warga')}>Kembali</Button>} /></Card>
  const acuan = todayISO()
  const umur = hitungUmur(w.tglLahir, acuan)
  const anggota = semua.filter((x) => x.noKK && x.noKK === w.noKK && x.id !== w.id)
  const kk = useStore.getState().keluarga.find((k) => k.noKK === w.noKK && !k.deletedAt)

  return (
    <div>
      <button onClick={() => nav(-1)} className="no-print mb-3 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-violet-600"><ArrowLeft size={16} /> Kembali</button>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-xl sm:p-7 ${w.jk === 'P' ? 'from-pink-500 via-fuchsia-500 to-violet-600' : 'from-sky-500 via-indigo-500 to-violet-600'}`}>
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="scale-150 p-3"><Avatar nama={w.nama} jk={w.jk} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{w.nama}</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-white/85">
              <span className="flex items-center gap-1"><Cake size={14} /> {umur ?? '-'} tahun</span>
              <span className="flex items-center gap-1"><Users size={14} /> {w.statusKeluarga}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {w.dasawisma}</span>
              {w.statusWarga !== 'Aktif' && <span className="rounded-full bg-white/25 px-2 font-semibold">{w.statusWarga}</span>}
            </div>
            <div className="mt-3 rounded-xl bg-white/90 p-2"><TagList w={w} acuan={acuan} s={settings} tags={tags} /></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={Pencil} onClick={() => openWarga(w.id)}>Ubah</Button>
            <Button variant="danger" icon={Trash2} onClick={async () => {
              if (await confirm({ title: 'Hapus warga?', message: <>Pindahkan <b>{w.nama}</b> ke Tempat Sampah?</>, okText: 'Hapus', danger: true })) { hapusDenganUndo('warga', w.id, w.nama); nav('/warga') }
            }}>Hapus</Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Identitas" icon={IdCard} color="indigo" actions={<button onClick={() => setShowNik(!showNik)} className="text-slate-400 hover:text-violet-600">{showNik ? <EyeOff size={16} /> : <Eye size={16} />}</button>}>
          <KV k="NIK" v={<span className="tabular">{maskNIK(w.nik, showNik)}</span>} />
          <KV k="No KK" v={<span className="tabular">{maskNIK(w.noKK, showNik)}</span>} />
          <KV k="Tempat, Tgl Lahir" v={`${w.tempatLahir}${w.tglLahir ? ', ' + tglIndo(w.tglLahir) : ''}`} />
          <KV k="Agama" v={w.agama} />
          <KV k="Pendidikan" v={w.pendidikan} />
          <KV k="Pekerjaan" v={w.pekerjaan} />
          <KV k="Gol. Darah" v={w.golDarah} />
          <KV k="Status Kawin" v={w.statusKawin} />
          <KV k="Alamat" v={w.alamat} />
        </Section>
        <Section title="Kegiatan PKK & Warga" icon={Users} color="violet">
          <KV k="Ikut PKK" v={yt(w.ikutPKK)} />
          <KV k="Jabatan" v={w.jabatan} />
          <KV k="Penghayatan Pancasila" v={yt(w.ppp)} />
          <KV k="Kerja Bakti" v={w.kerjaBakti ? w.kerjaBaktiJenis || 'Ya' : 'Tidak'} />
          <KV k="Keagamaan" v={w.keagamaan ? w.keagamaanJenis || 'Ya' : 'Tidak'} />
          <KV k="Rukun Kematian" v={yt(w.rukunKematian)} />
          <KV k="Jimpitan / Arisan" v={`${yt(w.jimpitan)} / ${yt(w.arisan)}`} />
          <KV k="Barkas / Apotek Hidup" v={`${yt(w.barkas)} / ${yt(w.apotekHidup)}`} />
          <KV k="Kegiatan diikuti" v={w.kegiatanDiikuti} />
        </Section>
        <Section title="Kesehatan, KB & Ibu" icon={HeartPulse} color="red">
          <KV k="Kontrasepsi" v={w.kontrasepsi} />
          <KV k="Riwayat Sakit" v={w.riwayatSakit} />
          <KV k="Posyandu" v={w.posyandu ? `Ya (${w.frekPosyandu || '-'}x/bln)` : 'Tidak'} />
          <KV k="BKB" v={yt(w.bkb)} />
          <KV k="Status Ibu" v={statusIbu(w)} />
          {w.hamil && <KV k="Hamil ke / HPL" v={`${w.hamilKe || '-'} / ${tglIndo(w.hpl)}`} />}
          <KV k="Tabungan / Koperasi" v={`${yt(w.tabungan)} / ${w.koperasi ? w.jenisKoperasi || 'Ya' : 'Tidak'}`} />
          <KV k="Kelompok Belajar / PAUD" v={`${w.kelompokBelajar ? w.jenisKelompokBelajar || 'Ya' : 'Tidak'} / ${yt(w.paud)}`} />
        </Section>

        <Section title={`Anggota Keluarga (${anggota.length + 1})`} icon={House} color="amber" actions={kk && <Link to={`/keluarga/${kk.id}`} className="text-xs font-semibold text-amber-600 hover:underline">Lihat KK →</Link>}>
          {anggota.length === 0 && <p className="text-sm text-slate-400">Tidak ada anggota lain dengan No KK sama.</p>}
          {anggota.map((a) => (
            <Link key={a.id} to={`/warga/${a.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-amber-50 dark:hover:bg-white/5">
              <Avatar nama={a.nama} jk={a.jk} />
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{a.nama}</div><div className="text-xs text-slate-500">{a.statusKeluarga} · {hitungUmur(a.tglLahir, acuan) ?? '-'} th</div></div>
            </Link>
          ))}
        </Section>
        <Section title="Pekarangan & IRT" icon={Sprout} color="lime">
          {w.pekarangan.length + w.irt.length === 0 && <p className="text-sm text-slate-400">Belum ada data.</p>}
          <div className="flex flex-wrap gap-1.5">
            {w.pekarangan.map((p, i) => <Chip key={i} color="lime" icon={Sprout}>{p.komoditi} · {p.jumlah}</Chip>)}
            {w.irt.map((p, i) => <Chip key={'i' + i} color="orange" icon={Factory}>{p.komoditi} · {p.volume}</Chip>)}
          </div>
        </Section>
        <Section title="Riwayat Perubahan" icon={History} color="slate">
          {audit.length === 0 && <p className="text-sm text-slate-400">Belum ada riwayat.</p>}
          <ol className="relative ml-2 border-l-2 border-violet-100 dark:border-white/10">
            {audit.map((a) => (
              <li key={a.id} className="mb-3 ml-4">
                <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                <div className="text-sm font-semibold">{a.aksi}</div>
                <div className="text-xs text-slate-400">{new Date(a.waktu).toLocaleString('id-ID')}</div>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  )
}
