import { useStore, useLive } from '@/lib/store'
import { isBalita, isKepala, isLansia, isPUS, isWUS, namaSuami, statusIbu } from '@/lib/rules'
import { BULAN } from '@/lib/options'
import { tglPendek } from '@/lib/format'
import type { Keluarga, Warga } from '@/lib/types'
import { Kop, N, NameLink, TTD, Wilayah, type ReportParams } from './shell'
import { useAktif } from './daftar'

interface Kolom {
  key: string
  calc: (ws: Warga[], kk: Keluarga[]) => Warga[] | number
}

/** 30 kolom rekap catatan data & kegiatan warga (dihitung dari sekumpulan warga) */
function useKolom(p: ReportParams): Kolom[] {
  const s = useStore((x) => x.settings)
  const byKK = (kk: Keluarga[], f: (k: Keluarga) => boolean) => kk.filter(f).length
  return [
    { key: 'krt', calc: (ws) => ws.filter(isKepala) },
    { key: 'kk', calc: (ws) => ws.filter(isKepala) },
    { key: 'L', calc: (ws) => ws.filter((w) => w.jk === 'L') },
    { key: 'P', calc: (ws) => ws.filter((w) => w.jk === 'P') },
    { key: 'balitaL', calc: (ws) => ws.filter((w) => w.jk === 'L' && isBalita(w, p.acuan, s)) },
    { key: 'balitaP', calc: (ws) => ws.filter((w) => w.jk === 'P' && isBalita(w, p.acuan, s)) },
    { key: 'pus', calc: (ws) => ws.filter((w) => isPUS(w, p.acuan)) },
    { key: 'wus', calc: (ws) => ws.filter((w) => isWUS(w, p.acuan)) },
    { key: 'hamil', calc: (ws) => ws.filter((w) => w.hamil) },
    { key: 'menyusui', calc: (ws) => ws.filter((w) => w.menyusui) },
    { key: 'lansia', calc: (ws) => ws.filter((w) => isLansia(w, p.acuan, s)) },
    { key: 'buta', calc: (ws) => ws.filter((w) => w.tigaButa) },
    { key: 'bk', calc: (ws) => ws.filter((w) => w.berkebutuhanKhusus) },
    { key: 'sehat', calc: (_, kk) => byKK(kk, (k) => k.rumahSehat === 'Sehat' && k.kriteriaRumah === 'Layak Huni') },
    { key: 'tdksehat', calc: (_, kk) => byKK(kk, (k) => !(k.rumahSehat === 'Sehat' && k.kriteriaRumah === 'Layak Huni')) },
    { key: 'tps', calc: (_, kk) => byKK(kk, (k) => k.tps) },
    { key: 'spal', calc: (_, kk) => byKK(kk, (k) => k.spal) },
    { key: 'mck', calc: (_, kk) => byKK(kk, (k) => k.mckSeptic) },
    { key: 'pdam', calc: (_, kk) => byKK(kk, (k) => k.sumberAir === 'PDAM') },
    { key: 'sumur', calc: (_, kk) => byKK(kk, (k) => k.sumberAir === 'Sumur') },
    { key: 'dll', calc: (_, kk) => byKK(kk, (k) => k.sumberAir !== 'PDAM' && k.sumberAir !== 'Sumur') },
    { key: 'beras', calc: (_, kk) => byKK(kk, (k) => k.makananPokok === 'Beras') },
    { key: 'nonberas', calc: (_, kk) => byKK(kk, (k) => k.makananPokok !== 'Beras') },
    { key: 'up2k', calc: (_, kk) => byKK(kk, (k) => k.up2k) },
    { key: 'pekarangan', calc: (ws) => ws.filter((w) => w.pekarangan.length > 0) },
    { key: 'irt', calc: (ws) => ws.filter((w) => w.irt.length > 0) },
    { key: 'kesling', calc: (_, kk) => byKK(kk, (k) => k.kesehatanLingkungan) },
  ]
}

const LABEL: Record<string, string> = {
  krt: 'KRT', kk: 'KK', L: 'Anggota L', P: 'Anggota P', balitaL: 'Balita L', balitaP: 'Balita P', pus: 'PUS', wus: 'WUS', hamil: 'Ibu hamil',
  menyusui: 'Ibu menyusui', lansia: 'Lansia', buta: '3 buta', bk: 'Berkebutuhan khusus', pekarangan: 'Pemanfaatan pekarangan', irt: 'Industri RT',
}

function Head({ first }: { first: string }) {
  return (
    <thead>
      <tr>
        <th rowSpan={3}>NO</th><th rowSpan={3}>{first}</th><th rowSpan={3}>JML KRT</th><th rowSpan={3}>JML KK</th>
        <th colSpan={11}>JUMLAH ANGGOTA KELUARGA</th><th colSpan={2}>KRITERIA RUMAH</th><th rowSpan={3}>MEMILIKI TEMPAT PEMBUANGAN SAMPAH</th><th rowSpan={3}>MEMILIKI SPAL DAN PENYERAPAN AIR</th><th rowSpan={3}>MEMILIKI SARANA MCK DAN SEPTIC TANK</th>
        <th colSpan={3}>SUMBER AIR KELUARGA</th><th colSpan={2}>MAKANAN POKOK</th><th colSpan={4}>WARGA MENGIKUTI KEGIATAN</th><th rowSpan={3}>KET</th>
      </tr>
      <tr>
        <th colSpan={2}>TOTAL</th><th colSpan={2}>BALITA</th><th rowSpan={2}>PUS</th><th rowSpan={2}>WUS</th><th rowSpan={2}>IBU HAMIL</th><th rowSpan={2}>IBU MENYUSUI</th><th rowSpan={2}>LANSIA</th><th rowSpan={2}>3 BUTA</th><th rowSpan={2}>BERKEBUTUHAN KHUSUS</th>
        <th rowSpan={2}>SEHAT LAYAK HUNI</th><th rowSpan={2}>TIDAK SEHAT LAYAK HUNI</th>
        <th rowSpan={2}>PDAM</th><th rowSpan={2}>SUMUR</th><th rowSpan={2}>DLL</th><th rowSpan={2}>BERAS</th><th rowSpan={2}>NON BERAS</th>
        <th rowSpan={2}>UP2K</th><th rowSpan={2}>PEMANFAATAN TANAH PEKARANGAN</th><th rowSpan={2}>INDUSTRI RUMAH TANGGA</th><th rowSpan={2}>KESEHATAN LINGKUNGAN</th>
      </tr>
      <tr><th>L</th><th>P</th><th>L</th><th>P</th></tr>
      <tr>{Array.from({ length: 30 }, (_, i) => <th key={i} style={{ fontSize: 8 }}>{i + 1}</th>)}</tr>
    </thead>
  )
}

function Cells({ ws, kk, cols, label }: { ws: Warga[]; kk: Keluarga[]; cols: Kolom[]; label: string }) {
  return (
    <>
      {cols.map((c) => {
        const v = c.calc(ws, kk)
        return <td key={c.key} className="num">{typeof v === 'number' ? v : <N list={v} title={`${LABEL[c.key] ?? c.key} — ${label}`} />}</td>
      })}
    </>
  )
}

export function RekapCatatan({ p }: { p: ReportParams }) {
  const s = useStore((x) => x.settings)
  const warga = useAktif().filter((w) => w.ikutPKK)
  const keluarga = useLive('keluarga')
  const dws = useLive('dasawisma')
  const cols = useKolom(p)
  const kkOf = (ws: Warga[]) => { const set = new Set(ws.map((w) => w.noKK)); return keluarga.filter((k) => set.has(k.noKK)) }

  if (!p.dawis) {
    const rows = dws.map((d) => ({ nama: d.nama, ws: warga.filter((w) => w.dasawisma === d.nama) }))
    const lain = warga.filter((w) => !dws.some((d) => d.nama === w.dasawisma))
    if (lain.length) rows.push({ nama: '(Tanpa dasawisma)', ws: lain })
    return (
      <>
        <Kop title="REKAPITULASI CATATAN DATA DAN KEGIATAN WARGA" />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Wilayah extra={[['Tahun', String(p.tahun)]]} /></div>
        <table className="rpt" style={{ fontSize: 9 }}>
          <Head first="NAMA DASAWISMA" />
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.nama}><td className="c">{i + 1}</td><td>{r.nama}</td><Cells ws={r.ws} kk={kkOf(r.ws)} cols={cols} label={r.nama} /><td /></tr>
            ))}
            <tr className="total"><td /><td>JUMLAH</td><Cells ws={warga} kk={kkOf(warga)} cols={cols} label={s.rt} /><td /></tr>
          </tbody>
        </table>
        <TTD />
      </>
    )
  }
  const ws = warga.filter((w) => w.dasawisma === p.dawis)
  const kepala = ws.filter(isKepala)
  return (
    <>
      <Kop title="REKAPITULASI CATATAN DATA DAN KEGIATAN WARGA" sub={`KELOMPOK DASA WISMA ${p.dawis.toUpperCase()}`} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Wilayah extra={[['Dasa Wisma', p.dawis], ['Tahun', String(p.tahun)]]} /></div>
      <table className="rpt" style={{ fontSize: 9 }}>
        <Head first="NAMA KEPALA RUMAH TANGGA" />
        <tbody>
          {kepala.map((k, i) => {
            const fam = ws.filter((w) => w.noKK === k.noKK)
            return <tr key={k.id}><td className="c">{i + 1}</td><td><NameLink w={k} /></td><Cells ws={fam} kk={keluarga.filter((x) => x.noKK === k.noKK)} cols={cols} label={k.nama} /><td /></tr>
          })}
          <tr className="total"><td /><td>JUMLAH</td><Cells ws={ws} kk={kkOf(ws)} cols={cols} label={p.dawis} /><td /></tr>
        </tbody>
      </table>
      <TTD kiri={'Mengetahui,\nKetua TP PKK'} kanan={`Ketua Dasawisma ${p.dawis}`} namaKanan={dws.find((d) => d.nama === p.dawis)?.ketua || undefined} />
    </>
  )
}

/* ---------- Ibu hamil ---------- */
const inMonth = (iso: string, p: ReportParams) => { if (!iso) return false; const d = new Date(iso); return d.getMonth() === p.bulan && d.getFullYear() === p.tahun }

export function RekapIbuHamil({ p }: { p: ReportParams }) {
  const warga = useAktif()
  const dws = useLive('dasawisma')
  const lahir = useLive('kelahiran').filter((k) => inMonth(k.tglLahir, p))
  const mati = useLive('kematian').filter((k) => inMonth(k.tgl, p))
  const rows = dws.map((d) => d.nama)
  const cnt = <T extends { dasawisma: string }>(xs: T[], d: string | null, f: (x: T) => boolean) => xs.filter((x) => (d === null || x.dasawisma === d) && f(x)).length
  const R = (d: string | null, label: string) => {
    const ws = warga.filter((w) => d === null || w.dasawisma === d)
    return (
      <>
        <td className="num"><N title={`Hamil — ${label}`} list={ws.filter((w) => w.hamil)} /></td>
        <td className="num"><N title={`Melahirkan — ${label}`} list={ws.filter((w) => w.melahirkan)} /></td>
        <td className="num"><N title={`Nifas — ${label}`} list={ws.filter((w) => w.nifas)} /></td>
        <td className="num">{cnt(mati, d, (m) => m.kategori === 'Ibu')}</td>
        <td className="num">{cnt(lahir, d, (k) => k.jk === 'L')}</td>
        <td className="num">{cnt(lahir, d, (k) => k.jk === 'P')}</td>
        <td className="num">{cnt(lahir, d, (k) => k.akte)}</td>
        <td className="num">{cnt(lahir, d, (k) => !k.akte)}</td>
        <td className="num">{cnt(mati, d, (m) => m.kategori === 'Bayi' && m.jk === 'L')}</td>
        <td className="num">{cnt(mati, d, (m) => m.kategori === 'Bayi' && m.jk === 'P')}</td>
        <td className="num">{cnt(mati, d, (m) => m.kategori === 'Balita' && m.jk === 'L')}</td>
        <td className="num">{cnt(mati, d, (m) => m.kategori === 'Balita' && m.jk === 'P')}</td>
        <td />
      </>
    )
  }
  return (
    <>
      <Kop title="REKAPITULASI DATA" sub="IBU HAMIL, MELAHIRKAN, NIFAS, IBU MENINGGAL *" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Wilayah />
        <table className="kv"><tbody><tr><td>BULAN</td><td>: {BULAN[p.bulan]}</td></tr><tr><td>TAHUN</td><td>: {p.tahun}</td></tr></tbody></table>
      </div>
      <table className="rpt">
        <thead>
          <tr><th rowSpan={3}>NO</th><th rowSpan={3}>NAMA KELOMPOK DASA WISMA</th><th colSpan={4} rowSpan={2}>JUMLAH IBU</th><th colSpan={6}>JUMLAH BAYI</th><th colSpan={2} rowSpan={2}>JML BALITA MENINGGAL</th><th rowSpan={3}>KET</th></tr>
          <tr><th colSpan={2}>LAHIR</th><th colSpan={2}>AKTE KELAHIRAN</th><th colSpan={2}>MENINGGAL</th></tr>
          <tr><th>HAMIL</th><th>MELAHIRKAN</th><th>NIFAS</th><th>MENINGGAL</th><th>L</th><th>P</th><th>ADA</th><th>TIDAK</th><th>L</th><th>P</th><th>L</th><th>P</th></tr>
        </thead>
        <tbody>
          {rows.map((d, i) => <tr key={d}><td className="c">{i + 1}</td><td>{d}</td>{R(d, d)}</tr>)}
          <tr className="total"><td /><td>JUMLAH</td>{R(null, 'RT')}</tr>
        </tbody>
      </table>
      <p style={{ fontSize: 9, marginTop: 4 }}>*Ibu meninggal karena hamil / melahirkan / nifas</p>
      <TTD />
    </>
  )
}

export function IbuHamilDawis({ p, status }: { p: ReportParams; status: string }) {
  const semua = useLive('warga')
  const warga = useAktif(p.dawis).filter((w) => statusIbu(w) && (!status || statusIbu(w) === status))
  const lahir = useLive('kelahiran').filter((k) => (!p.dawis || k.dasawisma === p.dawis) && inMonth(k.tglLahir, p))
  const mati = useLive('kematian').filter((k) => (!p.dawis || k.dasawisma === p.dawis) && inMonth(k.tgl, p))
  const s = useStore((x) => x.settings)
  const n = Math.max(warga.length, lahir.length, mati.length, 1)
  return (
    <>
      <Kop title="IBU HAMIL, MELAHIRKAN, NIFAS, IBU MENINGGAL*, KELAHIRAN BAYI, BAYI MENINGGAL DAN KEMATIAN BALITA" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>BULAN : {BULAN[p.bulan]}<br />TAHUN : {p.tahun}</div>
        <table className="kv"><tbody>
          <tr><td>KELOMPOK DASAWISMA</td><td>: {p.dawis || 'Semua'}</td></tr>
          <tr><td>KELOMPOK PKK RT</td><td>: {s.rt}</td></tr>
          <tr><td>KELOMPOK PKK RW</td><td>: {s.rw}</td></tr>
          <tr><td>DUSUN/LINGKUNGAN</td><td>: {s.padukuhan}</td></tr>
          <tr><td>DESA/KELURAHAN</td><td>: {s.kalurahan}</td></tr>
        </tbody></table>
      </div>
      <table className="rpt">
        <thead>
          <tr><th rowSpan={3}>NO</th><th rowSpan={3}>NAMA IBU</th><th rowSpan={3}>NAMA SUAMI</th><th rowSpan={3}>STATUS (HAMIL/ MELAHIRKAN/ NIFAS)</th><th colSpan={6}>CATATAN KELAHIRAN</th><th colSpan={6}>CATATAN KEMATIAN</th><th rowSpan={3}>KET</th></tr>
          <tr><th rowSpan={2}>NAMA BAYI</th><th colSpan={2}>JENIS KELAMIN</th><th rowSpan={2}>TGL. LAHIR</th><th colSpan={2}>AKTE KELAHIRAN</th><th rowSpan={2}>NAMA IBU/ BALITA/ BAYI</th><th rowSpan={2}>STATUS (IBU/ BALITA/ BAYI)</th><th colSpan={2}>JENIS KELAMIN</th><th rowSpan={2}>TGL. MENINGGAL</th><th rowSpan={2}>SEBAB MENINGGAL</th></tr>
          <tr><th>L</th><th>P</th><th>ADA</th><th>TIDAK</th><th>L</th><th>P</th></tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => {
            const w = warga[i], b = lahir[i], m = mati[i]
            return (
              <tr key={i}>
                <td className="c">{i + 1}</td>
                <td>{w ? <NameLink w={w} /> : b?.namaIbu}</td><td>{w ? namaSuami(w, semua) : b?.namaSuami}</td><td className="c">{w ? statusIbu(w) : b ? 'Melahirkan' : ''}</td>
                <td>{b?.namaBayi}</td><td className="c">{b?.jk === 'L' ? 'V' : ''}</td><td className="c">{b?.jk === 'P' ? 'V' : ''}</td><td className="c">{b ? tglPendek(b.tglLahir) : ''}</td><td className="c">{b?.akte ? 'V' : ''}</td><td className="c">{b && !b.akte ? 'V' : ''}</td>
                <td>{m?.nama}</td><td className="c">{m?.kategori}</td><td className="c">{m?.jk === 'L' ? 'V' : ''}</td><td className="c">{m?.jk === 'P' ? 'V' : ''}</td><td className="c">{m ? tglPendek(m.tgl) : ''}</td><td>{m?.sebab}</td>
                <td>{b?.keterangan || m?.keterangan}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 9, marginTop: 4 }}>*Ibu meninggal karena hamil / melahirkan / nifas</p>
      <TTD kanan={p.dawis ? `Ketua Dasawisma ${p.dawis}` : 'Pembuat Laporan'} />
    </>
  )
}

export function RegisterKelahiran({ p }: { p: ReportParams }) {
  const lahir = useLive('kelahiran').filter((k) => !p.dawis || k.dasawisma === p.dawis).sort((a, b) => b.tglLahir.localeCompare(a.tglLahir))
  const mati = useLive('kematian').filter((k) => !p.dawis || k.dasawisma === p.dawis).sort((a, b) => b.tgl.localeCompare(a.tgl))
  return (
    <>
      <Kop title="REGISTER KELAHIRAN & KEMATIAN" sub={p.dawis ? `Dasawisma ${p.dawis}` : 'Semua Dasawisma'} />
      <h3>A. BAYI LAHIR</h3>
      <table className="rpt">
        <thead><tr><th>NO</th><th>DASAWISMA</th><th>NAMA IBU</th><th>NAMA SUAMI</th><th>NAMA BAYI</th><th>L</th><th>P</th><th>TANGGAL LAHIR</th><th>AKTE</th><th>KETERANGAN</th></tr></thead>
        <tbody>
          {lahir.length === 0 && <tr><td colSpan={10} className="c">— belum ada data —</td></tr>}
          {lahir.map((k, i) => <tr key={k.id}><td className="c">{i + 1}</td><td>{k.dasawisma}</td><td>{k.namaIbu}</td><td>{k.namaSuami}</td><td>{k.namaBayi}</td><td className="c">{k.jk === 'L' ? 'V' : ''}</td><td className="c">{k.jk === 'P' ? 'V' : ''}</td><td className="c">{tglPendek(k.tglLahir)}</td><td className="c">{k.akte ? 'Ada' : 'Tidak'}</td><td>{k.keterangan}</td></tr>)}
        </tbody>
      </table>
      <h3>B. KEMATIAN IBU / BAYI / BALITA</h3>
      <table className="rpt">
        <thead><tr><th>NO</th><th>DASAWISMA</th><th>NAMA</th><th>STATUS</th><th>NAMA IBU</th><th>JK</th><th>TANGGAL MENINGGAL</th><th>SEBAB</th><th>KETERANGAN</th></tr></thead>
        <tbody>
          {mati.length === 0 && <tr><td colSpan={9} className="c">— belum ada data —</td></tr>}
          {mati.map((k, i) => <tr key={k.id}><td className="c">{i + 1}</td><td>{k.dasawisma}</td><td>{k.nama}</td><td className="c">{k.kategori}</td><td>{k.namaIbu}</td><td className="c">{k.jk}</td><td className="c">{tglPendek(k.tgl)}</td><td>{k.sebab}</td><td>{k.keterangan}</td></tr>)}
        </tbody>
      </table>
    </>
  )
}
