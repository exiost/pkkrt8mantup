import { useStore, useLive } from '@/lib/store'
import { aktif, hitungUmur, isPenduduk1559, isPUS, isWUS, kelompokUmurPUS, namaSuami } from '@/lib/rules'
import { maskNIK, tglIndo, tglPendek } from '@/lib/format'
import { BULAN } from '@/lib/options'
import { Kop, NameLink, TTD, type ReportParams } from './shell'

export function useAktif(dawis = '') {
  const warga = useLive('warga')
  return warga.filter((w) => aktif(w) && (!dawis || w.dasawisma === dawis))
}

const tglJudul = (p: ReportParams) => `TANGGAL / BULAN / TAHUN : ${tglIndo(p.acuan)}`

export function Penduduk1559({ p }: { p: ReportParams }) {
  const list = useAktif(p.dawis).filter((w) => isPenduduk1559(w, p.acuan))
  return (
    <>
      <Kop title="DATA PENDUDUK USIA ≥ 15 S/D 59 TAHUN" sub={`${useStore.getState().settings.rt} ${useStore.getState().settings.padukuhan} · per ${tglIndo(p.acuan)}${p.dawis ? ` · Dasawisma ${p.dawis}` : ''}`} />
      <table className="rpt">
        <thead>
          <tr><th>NO</th><th>NAMA</th><th className="col-nik">NIK</th><th>TANGGAL LAHIR</th><th>JENIS KELAMIN (L/P)</th><th>ALAMAT</th><th>RIWAYAT SAKIT<br />(Diabetes Melitus / Hipertensi)</th></tr>
        </thead>
        <tbody>
          {list.map((w, i) => (
            <tr key={w.id}><td className="c">{i + 1}</td><td><NameLink w={w} /></td><td className="col-nik c">{maskNIK(w.nik, true)}</td><td className="c">{tglPendek(w.tglLahir)}</td><td className="c">{w.jk}</td><td>{w.alamat}</td><td>{w.riwayatSakit}</td></tr>
          ))}
          <tr className="total"><td colSpan={7}>JUMLAH: {list.length} orang ({list.filter((w) => w.jk === 'L').length} L / {list.filter((w) => w.jk === 'P').length} P)</td></tr>
        </tbody>
      </table>
      <TTD />
    </>
  )
}

export function WUS({ p }: { p: ReportParams }) {
  const list = useAktif(p.dawis).filter((w) => isWUS(w, p.acuan))
  const s = useStore.getState().settings
  return (
    <>
      <Kop title={`DATA WANITA USIA SUBUR ${s.rt} ${s.padukuhan}`} sub={tglJudul(p)} />
      <table className="rpt">
        <thead><tr><th>NO</th><th className="col-nik">NIK</th><th>NAMA</th><th>TANGGAL LAHIR</th><th>UMUR</th><th>STATUS</th></tr></thead>
        <tbody>
          {list.map((w, i) => (
            <tr key={w.id}><td className="c">{i + 1}</td><td className="col-nik c">{maskNIK(w.nik, true)}</td><td><NameLink w={w} /></td><td className="c">{tglPendek(w.tglLahir)}</td><td className="c">{hitungUmur(w.tglLahir, p.acuan)}</td><td>{w.statusKawin}</td></tr>
          ))}
          <tr className="total"><td colSpan={6}>JUMLAH WUS: {list.length} orang</td></tr>
        </tbody>
      </table>
      <TTD />
    </>
  )
}

export function PUS({ p }: { p: ReportParams }) {
  const list = useAktif(p.dawis).filter((w) => isPUS(w, p.acuan))
  const s = useStore.getState().settings
  const ks = ['<15', '15-19', '20-34', '35-49'] as const
  return (
    <>
      <Kop title={`DATA PASANGAN USIA SUBUR ${s.rt} ${s.padukuhan}`} sub={tglJudul(p)} />
      <table className="rpt">
        <thead>
          <tr><th rowSpan={2}>NO</th><th rowSpan={2}>NAMA ISTRI</th><th rowSpan={2}>TGL LAHIR</th><th rowSpan={2}>UMUR</th><th colSpan={4}>KELOMPOK UMUR</th><th rowSpan={2}>JENIS ALKON</th></tr>
          <tr><th>&lt;15 TH</th><th>15 - 19 TH</th><th>20 - 34 TH</th><th>35 - 49 TH</th></tr>
        </thead>
        <tbody>
          {list.map((w, i) => {
            const u = hitungUmur(w.tglLahir, p.acuan)
            const k = kelompokUmurPUS(u)
            return (
              <tr key={w.id}><td className="c">{i + 1}</td><td><NameLink w={w} /></td><td className="c">{tglPendek(w.tglLahir)}</td><td className="c">{u}</td>{ks.map((x) => <td key={x} className="c">{k === x ? 'V' : ''}</td>)}<td className="c">{w.kontrasepsi}</td></tr>
            )
          })}
          <tr className="total"><td colSpan={4}>JUMLAH</td>{ks.map((x) => <td key={x} className="c">{list.filter((w) => kelompokUmurPUS(hitungUmur(w.tglLahir, p.acuan)) === x).length}</td>)}<td className="c">{list.filter((w) => w.kontrasepsi).length} ber-KB</td></tr>
        </tbody>
      </table>
      <TTD />
    </>
  )
}

export function PencatatanHamilKB({ p }: { p: ReportParams }) {
  const semua = useLive('warga')
  const hamil = useAktif(p.dawis).filter((w) => w.hamil)
  const kb = useLive('pesertaKB').filter((k) => {
    if (!k.tglKB) return true
    const d = new Date(k.tglKB)
    return d.getMonth() === p.bulan && d.getFullYear() === p.tahun
  })
  return (
    <>
      <Kop title="PENCATATAN IBU HAMIL, PESERTA KB BARU" sub={`Bulan ${BULAN[p.bulan]} ${p.tahun}`} />
      <h3>A. PENCATATAN IBU HAMIL</h3>
      <table className="rpt">
        <thead><tr><th>NO</th><th>NAMA ISTRI</th><th>UMUR</th><th>NAMA SUAMI</th><th>HAMIL KE</th><th>TANGGAL HPL</th></tr></thead>
        <tbody>
          {hamil.length === 0 && <tr><td colSpan={6} className="c">— tidak ada —</td></tr>}
          {hamil.map((w, i) => (
            <tr key={w.id}><td className="c">{i + 1}</td><td><NameLink w={w} /></td><td className="c">{hitungUmur(w.tglLahir, p.acuan)}</td><td>{namaSuami(w, semua)}</td><td className="c">{w.hamilKe}</td><td className="c">{tglPendek(w.hpl)}</td></tr>
          ))}
        </tbody>
      </table>
      <h3>B. PENCATATAN PESERTA KB BARU</h3>
      <table className="rpt">
        <thead><tr><th>NO</th><th>NAMA ISTRI</th><th>UMUR</th><th>NAMA SUAMI</th><th>RT</th><th>JAMINAN KESEHATAN</th><th>JML ANAK</th><th>TGL KB</th><th>TEMPAT KB</th><th>JENIS ALKON</th></tr></thead>
        <tbody>
          {kb.length === 0 && <tr><td colSpan={10} className="c">— tidak ada —</td></tr>}
          {kb.map((k, i) => (
            <tr key={k.id}><td className="c">{i + 1}</td><td>{k.namaIstri}</td><td className="c">{k.umur}</td><td>{k.namaSuami}</td><td className="c">{k.rt}</td><td>{k.jaminan}</td><td className="c">{k.jumlahAnak}</td><td className="c">{tglPendek(k.tglKB)}</td><td>{k.tempatKB}</td><td className="c">{k.jenisAlkon}</td></tr>
          ))}
        </tbody>
      </table>
      <TTD />
    </>
  )
}
