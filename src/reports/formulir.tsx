import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Layers, Pencil } from 'lucide-react'
import { useStore, useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Button, Toggle } from '@/components/ui'
import { hitungUmur, isBalita, isKepala, isLansia, isPUS, isWUS } from '@/lib/rules'
import { tglPendek } from '@/lib/format'
import type { Keluarga, Warga } from '@/lib/types'
import { NameLink, type ReportParams } from './shell'
import { useAktif } from './daftar'

const B = ({ on, children }: { on: boolean; children: ReactNode }) => (
  <span style={{ marginRight: 14, whiteSpace: 'nowrap' }}><span className="box">{on ? '✓' : ''}</span>{children}</span>
)

/** Pemilih item + ◀ ▶ + "cetak semua" */
function Picker<T>({ items, label, idx, setIdx, all, setAll, onEdit }: { items: T[]; label: (t: T) => string; idx: number; setIdx: (n: number) => void; all: boolean; setAll: (b: boolean) => void; onEdit?: () => void }) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 dark:border-white/10 dark:bg-white/5">
      <Button size="sm" variant="outline" icon={ChevronLeft} disabled={all || idx <= 0} onClick={() => setIdx(idx - 1)}>{''}</Button>
      <select disabled={all} value={idx} onChange={(e) => setIdx(+e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-slate-800">
        {items.map((t, i) => <option key={i} value={i}>{i + 1}. {label(t)}</option>)}
      </select>
      <Button size="sm" variant="outline" icon={ChevronRight} disabled={all || idx >= items.length - 1} onClick={() => setIdx(idx + 1)}>{''}</Button>
      {onEdit && !all && <Button size="sm" variant="soft" icon={Pencil} onClick={onEdit}>Ubah data</Button>}
      <div className="flex items-center gap-2"><Layers size={16} className="text-violet-500" /><Toggle checked={all} onChange={setAll} label={`Cetak semua (${items.length})`} /></div>
    </div>
  )
}

function usePick(len: number, initial = 0) {
  const [idx, setIdx] = useState(initial)
  const [all, setAll] = useState(false)
  return { idx: Math.min(idx, Math.max(0, len - 1)), setIdx, all, setAll }
}

/* ===================== DATA WARGA TP PKK (per orang) ===================== */
export function DataWargaTPPKK({ p }: { p: ReportParams }) {
  const list = useAktif(p.dawis).sort((a, b) => a.nama.localeCompare(b.nama))
  const pk = usePick(list.length)
  const { openWarga } = useEditor()
  if (!list.length) return <div className="paper portrait">Belum ada data warga.</div>
  const shown = pk.all ? list : [list[pk.idx]]
  return (
    <>
      <Picker items={list} label={(w) => w.nama} {...pk} onEdit={() => openWarga(list[pk.idx].id)} />
      {shown.map((w) => <FormTPPKK key={w.id} w={w} acuan={p.acuan} />)}
    </>
  )
}

function FormTPPKK({ w, acuan }: { w: Warga; acuan: string }) {
  const semua = useLive('warga')
  const s = useStore((x) => x.settings)
  const kepala = semua.find((x) => x.noKK && x.noKK === w.noKK && isKepala(x))
  const pend = w.pendidikan.toLowerCase()
  const pk = w.pekerjaan.toLowerCase()
  const R = ({ n, l, children }: { n?: number; l: string; children: ReactNode }) => (
    <tr><td style={{ width: 18 }}>{n}</td><td style={{ width: 190 }}>{l}</td><td style={{ width: 8 }}>:</td><td>{children}</td></tr>
  )
  const keg: [string, boolean, string][] = [
    ['Penghayatan dan Pengamalan Pancasila', w.ppp, ''],
    ['Kerja Bakti', w.kerjaBakti, w.kerjaBaktiJenis],
    ['Rukun Kematian', w.rukunKematian, w.rukunKematianJenis],
    ['Kegiatan Keagamaan', w.keagamaan, w.keagamaanJenis],
    ['Jimpitan', w.jimpitan, ''],
    ['Arisan', w.arisan, ''],
    ['Pengumpulan Barang Bekas', w.barkas, ''],
    ['Apotek Hidup', w.apotekHidup, ''],
    ['Lain-lain', !!w.kegiatanDiikuti, w.kegiatanDiikuti],
  ]
  return (
    <div className="paper portrait page-break">
      <h2>DATA WARGA TP PKK</h2>
      <table className="kv" style={{ width: '100%', marginTop: 10 }}>
        <tbody>
          <R l="Dasa Wisma">{w.dasawisma}</R>
          <R l="Nama Kepala Rumah Tangga">{kepala?.nama}</R>
          <R n={1} l="No Registrasi">{semua.findIndex((x) => x.id === w.id) + 1}</R>
          <R n={2} l="No. KTP / NIK"><span className="col-nik">{w.nik}</span></R>
          <R n={3} l="Nama"><NameLink w={w} /></R>
          <R n={4} l="Jabatan">{w.jabatan}</R>
          <R n={5} l="Jenis Kelamin"><B on={w.jk === 'L'}>Laki-laki</B><B on={w.jk === 'P'}>Perempuan</B></R>
          <R n={6} l="Tempat Lahir">{w.tempatLahir}</R>
          <R n={7} l="Tgl. Lahir / Umur">{tglPendek(w.tglLahir)} &nbsp; Umur : {hitungUmur(w.tglLahir, acuan) ?? '-'} Tahun</R>
          <R n={8} l="Status Perkawinan"><B on={/^kawin/i.test(w.statusKawin)}>Menikah</B><B on={w.statusKawin === 'Belum Kawin'}>Lajang</B><B on={/cerai/i.test(w.statusKawin) && w.jk === 'P'}>Janda</B><B on={/cerai/i.test(w.statusKawin) && w.jk === 'L'}>Duda</B></R>
          <R n={9} l="Status Dalam Keluarga"><B on={isKepala(w)}>Kepala Rumah Tangga</B><B on={!isKepala(w)}>Anggota Keluarga</B></R>
          <R n={10} l="Agama">{['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Khonghucu'].map((a) => <B key={a} on={w.agama === a}>{a}</B>)}<B on={!!w.agama && !['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Khonghucu'].includes(w.agama)}>Kepercayaan Lain</B></R>
          <R n={11} l="Alamat">{w.alamat}</R>
          <R l="Kelurahan">{s.kalurahan}</R>
          <R l="Kecamatan">{s.kapanewon}</R>
          <R l="Kabupaten / Kota">{s.kabupaten}</R>
          <R l="Provinsi">{s.provinsi}</R>
          <R n={12} l="Pendidikan">
            <B on={pend.includes('tidak') || pend.includes('belum')}>Tidak Tamat SD</B><B on={pend.startsWith('tamat sd') || pend.startsWith('sd')}>SD/MI</B><B on={pend.includes('sltp')}>SMP/Sederajat</B><B on={pend.includes('slta')}>SMA/SMK/Sederajat</B><br />
            <B on={pend.includes('diploma i') && !pend.includes('iv')}>Diploma</B><B on={pend.includes('strata i') && !pend.includes('ii')}>S1</B><B on={pend.includes('strata ii') && !pend.includes('iii')}>S2</B><B on={pend.includes('strata iii')}>S3</B>
          </R>
          <R n={13} l="Pekerjaan">
            <B on={pk.includes('petani')}>Petani</B><B on={pk.includes('pedagang')}>Pedagang</B><B on={pk.includes('swasta')}>Swasta</B><B on={pk.includes('wiraswasta') || pk.includes('wirausaha')}>Wirausaha</B><br />
            <B on={pk.includes('pns')}>PNS</B><B on={pk.includes('tni') || pk.includes('polri')}>TNI/POLRI</B><B on={!!pk && !/petani|pedagang|swasta|wira|pns|tni|polri/.test(pk)}>Lainnya {!/petani|pedagang|swasta|wira|pns|tni|polri/.test(pk) && w.pekerjaan ? `(${w.pekerjaan})` : ''}</B>
          </R>
          <R n={14} l="Akseptor KB"><B on={!!w.kontrasepsi}>Ya</B><B on={!w.kontrasepsi}>Tidak</B> Jenis Akseptor KB : {w.kontrasepsi}</R>
          <R n={15} l="Aktif dalam kegiatan Posyandu"><B on={w.posyandu}>Ya</B><B on={!w.posyandu}>Tidak</B> Frekuensi : {w.frekPosyandu || '...'} kali / bulan</R>
          <R n={16} l="Mengikuti Program Bina Keluarga Balita"><B on={w.bkb}>Ya</B><B on={!w.bkb}>Tidak</B></R>
          <R n={17} l="Memiliki Tabungan"><B on={w.tabungan}>Ya</B><B on={!w.tabungan}>Tidak</B></R>
          <R n={18} l="Mengikuti Kelompok Belajar"><B on={w.kelompokBelajar}>Ya</B><B on={!w.kelompokBelajar}>Tidak</B> Jenis : {['Paket A', 'Paket B', 'Paket C', 'KF'].map((x) => <B key={x} on={w.jenisKelompokBelajar.includes(x)}>{x}</B>)}</R>
          <R n={19} l="Mengikuti PAUD / Sejenis"><B on={w.paud}>Ya</B><B on={!w.paud}>Tidak</B></R>
          <R n={20} l="Ikut Dalam Kegiatan Koperasi"><B on={w.koperasi}>Ya</B><B on={!w.koperasi}>Tidak</B> Jenis Koperasi : {w.jenisKoperasi}</R>
        </tbody>
      </table>
      <h3 style={{ textAlign: 'center' }}>KEGIATAN WARGA</h3>
      <table className="rpt">
        <thead><tr><th style={{ width: 30 }}>NO</th><th>KEGIATAN</th><th style={{ width: 80 }}>AKTIVITAS (Y/T)</th><th>KETERANGAN (JENIS KEGIATAN YANG DIIKUTI)</th></tr></thead>
        <tbody>{keg.map(([k, on, j], i) => <tr key={k}><td className="c">{i + 1}</td><td>{k}</td><td className="c">{on ? 'Y' : 'T'}</td><td>{j}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

/* ===================== DATA KELUARGA & CATATAN KELUARGA (per KK) ===================== */
function useKK(p: ReportParams) {
  const warga = useAktif(p.dawis)
  const keluarga = useLive('keluarga')
  return useMemo(() => {
    const kks = keluarga.filter((k) => !p.dawis || k.dasawisma === p.dawis || warga.some((w) => w.noKK === k.noKK))
    return kks
      .map((k) => {
        const ang = warga.filter((w) => w.noKK === k.noKK)
        return { k, ang, kepala: ang.find(isKepala) ?? ang[0] }
      })
      .filter((x) => x.ang.length)
      .sort((a, b) => (a.kepala?.nama ?? '').localeCompare(b.kepala?.nama ?? ''))
  }, [warga, keluarga, p.dawis])
}

function KKPicker({ p, render }: { p: ReportParams; render: (x: { k: Keluarga; ang: Warga[]; kepala?: Warga }) => ReactNode }) {
  const list = useKK(p)
  const [sp] = useSearchParams()
  const init = Math.max(0, list.findIndex((x) => x.k.noKK === sp.get('kk')))
  const pk = usePick(list.length, init)
  const { openKeluarga } = useEditor()
  if (!list.length) return <div className="paper portrait">Belum ada data keluarga.</div>
  const shown = pk.all ? list : [list[pk.idx]]
  return (
    <>
      <Picker items={list} label={(x) => `${x.kepala?.nama ?? '?'} (${x.ang.length} jiwa)`} {...pk} onEdit={() => openKeluarga(list[pk.idx].k.id)} />
      {shown.map((x) => <div key={x.k.id}>{render(x)}</div>)}
    </>
  )
}

export function DataKeluarga({ p }: { p: ReportParams }) {
  const s = useStore((x) => x.settings)
  const semua = useLive('warga')
  return (
    <KKPicker p={p} render={({ k, ang, kepala }) => {
      const c = (f: (w: Warga) => boolean) => ang.filter(f).length
      return (
        <div className="paper landscape page-break">
          <h2>DATA KELUARGA</h2>
          <div style={{ display: 'flex', gap: 40, marginTop: 8 }}>
            <table className="kv"><tbody>
              <tr><td>Dasa Wisma</td><td>: {k.dasawisma}</td></tr><tr><td>RT</td><td>: {s.rt}</td></tr>
              <tr><td>Desa / Kelurahan</td><td>: {s.kalurahan}</td></tr><tr><td>Kab / Kota</td><td>: {s.kabupaten}</td></tr>
            </tbody></table>
            <table className="kv"><tbody>
              <tr><td>&nbsp;</td><td /></tr><tr><td>Dusun</td><td>: {s.padukuhan}</td></tr><tr><td>Kecamatan</td><td>: {s.kapanewon}</td></tr><tr><td>Provinsi</td><td>: {s.provinsi}</td></tr>
            </tbody></table>
          </div>
          <table className="kv" style={{ marginTop: 8 }}><tbody>
            <tr><td>Nama Kepala Rumah Tangga</td><td>: <NameLink w={kepala} /></td></tr>
            <tr><td>Jumlah Anggota Keluarga</td><td>: {ang.length} orang (Laki-laki {c((w) => w.jk === 'L')} orang, Perempuan {c((w) => w.jk === 'P')} orang)</td></tr>
            <tr><td>1. Jumlah KK</td><td>: 1 KK</td></tr>
            <tr><td>2. Jumlah</td><td>: a) Balita {c((w) => isBalita(w, p.acuan, s))} anak &nbsp; b) PUS {c((w) => isPUS(w, p.acuan))} orang &nbsp; c) WUS {c((w) => isWUS(w, p.acuan))} orang &nbsp; d) 3 Buta {c((w) => w.tigaButa)} orang &nbsp; e) Ibu Hamil {c((w) => w.hamil)} orang &nbsp; f) Ibu Menyusui {c((w) => w.menyusui)} orang &nbsp; g) Lansia {c((w) => isLansia(w, p.acuan, s))} orang</td></tr>
          </tbody></table>
          <table className="rpt">
            <thead>
              <tr><th rowSpan={2}>NO</th><th rowSpan={2}>NO REGISTRASI</th><th rowSpan={2}>NAMA ANGGOTA KELUARGA</th><th rowSpan={2}>STATUS DALAM KELUARGA</th><th rowSpan={2}>STATUS DALAM PERKAWINAN</th><th colSpan={2}>JENIS KELAMIN</th><th rowSpan={2}>TANGGAL LAHIR / UMUR</th><th rowSpan={2}>PENDIDIKAN</th><th rowSpan={2}>PEKERJAAN</th></tr>
              <tr><th>L</th><th>P</th></tr>
            </thead>
            <tbody>
              {ang.map((w, i) => (
                <tr key={w.id}><td className="c">{i + 1}</td><td className="c">{semua.findIndex((x) => x.id === w.id) + 1}</td><td><NameLink w={w} /></td><td>{w.statusKeluarga}</td><td>{/^kawin/i.test(w.statusKawin) ? 'Kawin' : 'Tidak Kawin'}</td><td className="c">{w.jk === 'L' ? 'V' : ''}</td><td className="c">{w.jk === 'P' ? 'V' : ''}</td><td className="c">{tglPendek(w.tglLahir)} / {hitungUmur(w.tglLahir, p.acuan) ?? '-'} th</td><td>{w.pendidikan}</td><td>{w.pekerjaan}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="kv" style={{ marginTop: 10 }}><tbody>
            <tr><td>3. Makanan Pokok Sehari-hari</td><td>: <B on={k.makananPokok === 'Beras'}>Beras</B><B on={k.makananPokok !== 'Beras'}>Non Beras</B></td></tr>
            <tr><td>4. Mempunyai Sarana MCK dan Septic Tank</td><td>: <B on={k.mckSeptic}>Ya</B><B on={!k.mckSeptic}>Tidak</B> Jumlah : {k.jumlahWC} buah</td></tr>
            <tr><td>5. Sumber Air Keluarga</td><td>: <B on={k.sumberAir === 'PDAM'}>PDAM</B><B on={k.sumberAir === 'Sumur'}>Sumur</B><B on={k.sumberAir !== 'PDAM' && k.sumberAir !== 'Sumur'}>Lainnya</B></td></tr>
            <tr><td>6. Memiliki Tempat Pembuangan Sampah</td><td>: <B on={k.tps}>Ya</B><B on={!k.tps}>Tidak</B></td></tr>
            <tr><td>7. Mempunyai SPAL dan Penyerapan Air</td><td>: <B on={k.spal}>Ya</B><B on={!k.spal}>Tidak</B></td></tr>
            <tr><td>8. Kriteria Rumah</td><td>: <B on={k.rumahSehat === 'Sehat'}>Sehat</B><B on={k.rumahSehat !== 'Sehat'}>Kurang Sehat</B></td></tr>
            <tr><td>9. Aktivitas UP2K</td><td>: <B on={k.up2k}>Ya</B><B on={!k.up2k}>Tidak</B> Jenis Usaha : {k.jenisUp2k}</td></tr>
            <tr><td>10. Aktivitas Kegiatan Usaha Kesehatan Lingkungan</td><td>: <B on={k.kesehatanLingkungan}>Ya</B><B on={!k.kesehatanLingkungan}>Tidak</B></td></tr>
          </tbody></table>
        </div>
      )
    }} />
  )
}

export function CatatanKeluarga({ p }: { p: ReportParams }) {
  return (
    <KKPicker p={p} render={({ k, ang, kepala }) => (
      <div className="paper landscape page-break">
        <h2>CATATAN KELUARGA</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <table className="kv"><tbody>
            <tr><td>CATATAN KELUARGA DARI</td><td>: {kepala?.nama}</td></tr>
            <tr><td>ANGGOTA KELOMPOK DASA WISMA</td><td>: {k.dasawisma}</td></tr>
            <tr><td>TAHUN</td><td>: {p.tahun}</td></tr>
          </tbody></table>
          <table className="kv"><tbody>
            <tr><td>KRITERIA RUMAH</td><td>: {k.kriteriaRumah}</td></tr>
            <tr><td>JAMBAN KELUARGA</td><td>: {k.mckSeptic ? 'Ada' : 'Tidak'} &nbsp; Jumlah : {k.jumlahWC} buah</td></tr>
            <tr><td>SUMBER AIR</td><td>: {k.sumberAir}</td></tr>
            <tr><td>TEMPAT SAMPAH</td><td>: {k.tps ? 'Ada' : 'Tidak'}</td></tr>
          </tbody></table>
        </div>
        <table className="rpt" style={{ fontSize: 9 }}>
          <thead>
            <tr><th rowSpan={2}>NO</th><th rowSpan={2}>NAMA ANGGOTA KELUARGA</th><th rowSpan={2}>STATUS PERKAWINAN</th><th rowSpan={2}>L/P</th><th rowSpan={2}>TEMPAT LAHIR</th><th rowSpan={2}>TGL/BLN/TH LAHIR/UMUR</th><th rowSpan={2}>AGAMA</th><th rowSpan={2}>PENDIDIKAN</th><th rowSpan={2}>PEKERJAAN</th><th rowSpan={2}>BERKEBUTUHAN KHUSUS</th><th colSpan={8}>KEGIATAN PKK YANG DIIKUTI</th><th rowSpan={2}>KET</th></tr>
            <tr><th>PENGHAYATAN DAN PENGAMALAN PANCASILA</th><th>GOTONG ROYONG</th><th>PENDIDIKAN DAN KETRAMPILAN</th><th>PENGEMBANGAN KEHIDUPAN BERKOPERASI</th><th>PANGAN</th><th>SANDANG</th><th>KESEHATAN</th><th>PERENCANAAN SEHAT</th></tr>
            <tr>{Array.from({ length: 19 }, (_, i) => <th key={i} style={{ fontSize: 8 }}>{i + 1}</th>)}</tr>
          </thead>
          <tbody>
            {ang.map((w, i) => (
              <tr key={w.id}>
                <td className="c">{i + 1}</td><td><NameLink w={w} /></td><td>{w.statusKawin}</td><td className="c">{w.jk}</td><td>{w.tempatLahir}</td><td className="c">{tglPendek(w.tglLahir)} / {hitungUmur(w.tglLahir, p.acuan) ?? '-'}</td><td>{w.agama}</td><td>{w.pendidikan}</td><td>{w.pekerjaan}</td><td className="c">{w.berkebutuhanKhusus ? 'Ya' : '-'}</td>
                {[w.ppp, w.kerjaBakti, w.pendidikanKetrampilan, w.koperasi, w.pangan, w.sandang, w.posyandu || !!w.kontrasepsi, w.perencanaanSehat].map((b, j) => <td key={j} className="c">{b ? 'V' : ''}</td>)}
                <td>{w.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )} />
  )
}

/* ===================== HATINYA PKK & IRT ===================== */
export function HTIRT({ p }: { p: ReportParams }) {
  const list = useAktif(p.dawis).filter((w) => w.pekarangan.length || w.irt.length).sort((a, b) => a.nama.localeCompare(b.nama))
  const pk = usePick(list.length)
  const [rekap, setRekap] = useState(false)
  const { openWarga } = useEditor()
  if (!list.length) return <div className="paper portrait">Belum ada warga dengan data pekarangan / IRT. Isi di menu Pekarangan & IRT.</div>
  const shown = pk.all ? list : [list[pk.idx]]
  return (
    <>
      <Picker items={list} label={(w) => w.nama} {...pk} onEdit={() => openWarga(list[pk.idx].id)} />
      <div className="no-print mb-3"><Toggle checked={rekap} onChange={setRekap} label="Tampilkan rekap total seluruh warga" /></div>
      {rekap ? <RekapHT list={list} /> : shown.map((w) => (
        <div key={w.id} className="paper portrait page-break">
          <h2>PEMANFAATAN TANAH PEKARANGAN / HATINYA PKK</h2>
          <div style={{ marginTop: 8 }}>Nama : <b><NameLink w={w} /></b> &nbsp; · &nbsp; Dasawisma : {w.dasawisma}</div>
          <table className="rpt">
            <thead><tr><th>NO</th><th>KATEGORI</th><th>KOMODITI</th><th>JUMLAH</th></tr><tr><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead>
            <tbody>
              {w.pekarangan.length === 0 && <tr><td colSpan={4} className="c">—</td></tr>}
              {w.pekarangan.map((x, i) => <tr key={i}><td className="c">{i + 1}</td><td>{x.kategori}</td><td>{x.komoditi}</td><td>{x.jumlah}</td></tr>)}
            </tbody>
          </table>
          <h2 style={{ marginTop: 18 }}>INDUSTRI RUMAH TANGGA</h2>
          <table className="rpt">
            <thead><tr><th>NO</th><th>KATEGORI</th><th>KOMODITI</th><th>VOLUME</th></tr></thead>
            <tbody>
              {w.irt.length === 0 && <tr><td colSpan={4} className="c">—</td></tr>}
              {w.irt.map((x, i) => <tr key={i}><td className="c">{i + 1}</td><td>{x.kategori}</td><td>{x.komoditi}</td><td>{x.volume}</td></tr>)}
            </tbody>
          </table>
        </div>
      ))}
    </>
  )
}

function RekapHT({ list }: { list: Warga[] }) {
  const m = new Map<string, { kategori: string; komoditi: string; warga: number; jumlah: string[] }>()
  list.forEach((w) => w.pekarangan.forEach((x) => {
    const key = `${x.kategori}|${x.komoditi.toLowerCase()}`
    const e = m.get(key) ?? { kategori: x.kategori, komoditi: x.komoditi, warga: 0, jumlah: [] }
    e.warga++
    e.jumlah.push(x.jumlah)
    m.set(key, e)
  }))
  const rows = [...m.values()].sort((a, b) => a.kategori.localeCompare(b.kategori) || b.warga - a.warga)
  const irt = list.flatMap((w) => w.irt.map((x) => ({ ...x, nama: w.nama })))
  const sum = (js: string[]) => {
    const units = new Map<string, number>()
    js.forEach((j) => { const mm = j.match(/(\d+)\s*(\w+)?/); if (mm) units.set(mm[2] ?? '', (units.get(mm[2] ?? '') ?? 0) + +mm[1]) })
    return [...units.entries()].map(([u, n]) => `${n} ${u}`).join(', ')
  }
  return (
    <div className="paper portrait">
      <h2>REKAP PEMANFAATAN PEKARANGAN & IRT</h2>
      <table className="rpt">
        <thead><tr><th>NO</th><th>KATEGORI</th><th>KOMODITI</th><th>JML WARGA</th><th>TOTAL</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td className="c">{i + 1}</td><td>{r.kategori}</td><td>{r.komoditi}</td><td className="num">{r.warga}</td><td>{sum(r.jumlah)}</td></tr>)}</tbody>
      </table>
      <h3>INDUSTRI RUMAH TANGGA</h3>
      <table className="rpt">
        <thead><tr><th>NO</th><th>NAMA</th><th>KATEGORI</th><th>KOMODITI</th><th>VOLUME</th></tr></thead>
        <tbody>{irt.map((r, i) => <tr key={i}><td className="c">{i + 1}</td><td>{r.nama}</td><td>{r.kategori}</td><td>{r.komoditi}</td><td>{r.volume}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
