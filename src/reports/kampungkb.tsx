import { useStore, useLive } from '@/lib/store'
import { hitungUmur, hitungUmurBulan, isKepala, isPUS, kelompokPendidikan, kelompokUmurPUS, isLansia } from '@/lib/rules'
import { BULAN } from '@/lib/options'
import type { Warga } from '@/lib/types'
import { N, type ReportParams } from './shell'
import { useAktif } from './daftar'

/** Isian manual (data yang tidak ada di master), tersimpan per bulan — bisa diketik langsung di laporan */
function Manual({ k, periode }: { k: string; periode: string }) {
  const st = useStore()
  const rec = st.kampungKB.find((x) => x.periode === periode && !x.deletedAt)
  const val = rec?.nilai[k] ?? ''
  return (
    <input
      className="w-full bg-transparent text-center outline-none focus:bg-violet-50"
      inputMode="numeric"
      value={val}
      placeholder="·"
      onChange={(e) => {
        const n = e.target.value === '' ? undefined : Number(e.target.value.replace(/\D/g, ''))
        const nilai = { ...(rec?.nilai ?? {}) }
        if (n === undefined) delete nilai[k]
        else nilai[k] = n
        if (rec) st.update('kampungKB', rec.id, { nilai }, `Kampung KB ${periode}`)
        else st.create('kampungKB', { periode, nilai, deletedAt: null }, `Kampung KB ${periode}`)
      }}
    />
  )
}

export function KampungKB({ p }: { p: ReportParams }) {
  const s = useStore((x) => x.settings)
  const all = useAktif(p.dawis).filter((w) => w.ikutPKK)
  useLive('kampungKB')
  const periode = `${p.tahun}-${String(p.bulan + 1).padStart(2, '0')}`
  const u = (w: Warga) => hitungUmur(w.tglLahir, p.acuan)
  const ub = (w: Warga) => hitungUmurBulan(w.tglLahir, p.acuan)
  const kk = all.filter(isKepala)
  const pus = all.filter((w) => isPUS(w, p.acuan))
  const inRange = (a: number, b: number) => all.filter((w) => { const x = u(w); return x !== null && x >= a && x <= b })
  const pend = ['TDK SEKOLAH', 'TIDAK LULUS SD', 'SD', 'SLTP', 'SLTA', 'PERGURUAN TINGGI']
  const umurKel: [string, Warga[]][] = [
    ['1 - < 2 TH', all.filter((w) => { const b = ub(w); return b !== null && b >= 12 && b < 24 })],
    ['2 - < 5 TH', all.filter((w) => { const b = ub(w); return b !== null && b >= 24 && b < 60 })],
    ['5 - 6 TH', inRange(5, 6)],
    ['7 - 14 TH', inRange(7, 14)],
    ['15 - 24 TH', inRange(15, 24)],
    ['25 - 49 TH', inRange(25, 49)],
    ['50 - < 65 TH', inRange(50, 64)],
    ['≥ 65 TH', all.filter((w) => (u(w) ?? -1) >= 65)],
  ]
  const alkon = ['IUD', 'MOW', 'MOP', 'Implan', 'Suntik', 'Pil', 'Kondom']
  const pusKB = (a: string) => pus.filter((w) => w.kontrasepsi.toLowerCase() === a.toLowerCase())
  const balita = (a: number, b: number) => all.filter((w) => { const x = ub(w); return x !== null && x >= a && x < b })
  const bal12 = balita(12, 24), bal25 = balita(24, 60)
  const lansia = all.filter((w) => isLansia(w, p.acuan, s))
  const keluargaLansia = new Set(lansia.map((w) => w.noKK)).size

  const T = ({ children }: { children: React.ReactNode }) => <table className="rpt" style={{ marginBottom: 4, marginTop: 2 }}>{children}</table>
  return (
    <div className="compact">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><h2 style={{ textAlign: 'left' }}>INVENTARISASI DATA KAMPUNG KB</h2>BULAN : {BULAN[p.bulan]}<br />TAHUN : {p.tahun}</div>
        <div>PADUKUHAN : {s.padukuhan.toUpperCase()}<br />KALURAHAN : {s.kalurahan.toUpperCase()}<br />KAPANEWON : {s.kapanewon.toUpperCase()}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 12, marginTop: 8 }}>
        <div>
          <h3>I. DATA KEPENDUDUKAN</h3>
          <b>1. JUMLAH KK MENURUT JENIS KELAMIN</b>
          <T><thead><tr><th>NO</th><th>JENIS KELAMIN KK</th><th>JUMLAH</th></tr></thead><tbody>
            <tr><td className="c">1</td><td>LAKI - LAKI</td><td className="num"><N title="KK Laki-laki" list={kk.filter((w) => w.jk === 'L')} /></td></tr>
            <tr><td className="c">2</td><td>PEREMPUAN</td><td className="num"><N title="KK Perempuan" list={kk.filter((w) => w.jk === 'P')} /></td></tr>
            <tr className="total"><td /><td>JUMLAH</td><td className="num">{kk.length}</td></tr>
          </tbody></T>
          <b>2. JUMLAH PENDUDUK MENURUT JENIS KELAMIN</b>
          <T><thead><tr><th>NO</th><th>JENIS KELAMIN</th><th>JUMLAH</th></tr></thead><tbody>
            <tr><td className="c">1</td><td>LAKI - LAKI</td><td className="num"><N title="Penduduk laki-laki" list={all.filter((w) => w.jk === 'L')} /></td></tr>
            <tr><td className="c">2</td><td>PEREMPUAN</td><td className="num"><N title="Penduduk perempuan" list={all.filter((w) => w.jk === 'P')} /></td></tr>
            <tr className="total"><td /><td>JUMLAH</td><td className="num">{all.length}</td></tr>
          </tbody></T>
          <b>3. JUMLAH KK MENURUT TINGKAT PENDIDIKAN</b>
          <T><thead><tr><th>NO</th><th>TINGKAT PENDIDIKAN</th><th>JUMLAH</th></tr></thead><tbody>
            {pend.map((x, i) => <tr key={x}><td className="c">{i + 1}</td><td>{x}</td><td className="num"><N title={`KK pendidikan ${x}`} list={kk.filter((w) => kelompokPendidikan(w.pendidikan) === x)} /></td></tr>)}
            <tr className="total"><td /><td>JUMLAH</td><td className="num">{kk.length}</td></tr>
          </tbody></T>
          <b>4. JUMLAH JIWA MENURUT KELOMPOK UMUR</b>
          <T><thead><tr><th>NO</th><th>KELOMPOK UMUR</th><th>JUMLAH</th></tr></thead><tbody>
            {umurKel.map(([l, ls], i) => <tr key={l}><td className="c">{i + 1}</td><td>{l}</td><td className="num"><N title={`Umur ${l}`} list={ls} /></td></tr>)}
            <tr><td /><td>Penduduk usia 18 - 56 TH</td><td className="num"><N title="Usia 18-56" list={inRange(18, 56)} /></td></tr>
            <tr><td /><td>Remaja putri 12 - 17 TH</td><td className="num"><N title="Remaja putri" list={inRange(12, 17).filter((w) => w.jk === 'P')} /></td></tr>
            <tr><td /><td>Perempuan subur 15 - 49 TH</td><td className="num"><N title="Perempuan 15-49" list={inRange(15, 49).filter((w) => w.jk === 'P')} /></td></tr>
          </tbody></T>
        </div>
        <div>
          <h3>II. DATA KELUARGA BERENCANA</h3>
          <b>1. JUMLAH PUS MENURUT KELOMPOK UMUR WANITA</b>
          <T><thead><tr><th>NO</th><th>KELOMPOK UMUR</th><th>JUMLAH</th></tr></thead><tbody>
            {(['<15', '15-19', '20-34', '35-49'] as const).map((k, i) => <tr key={k}><td className="c">{i + 1}</td><td>{k.replace('-', ' - ')} TH</td><td className="num"><N title={`PUS ${k}`} list={pus.filter((w) => kelompokUmurPUS(u(w)) === k)} /></td></tr>)}
            <tr className="total"><td /><td>JUMLAH</td><td className="num">{pus.length}</td></tr>
          </tbody></T>
          <b>2. KEIKUTSERTAAN BER-KB PER MIX KONTRASEPSI</b>
          <T><thead><tr><th>NO</th><th>KONTRASEPSI</th><th>JUMLAH</th></tr></thead><tbody>
            {alkon.map((a, i) => <tr key={a}><td className="c">{i + 1}</td><td>{a.toUpperCase()}</td><td className="num"><N title={`Peserta ${a}`} list={pusKB(a)} /></td></tr>)}
            <tr className="total"><td /><td>JUMLAH</td><td className="num">{alkon.reduce((n, a) => n + pusKB(a).length, 0)}</td></tr>
          </tbody></T>
          <b>3. PUS BUKAN PESERTA KB</b>
          <T><thead><tr><th>NO</th><th>URAIAN</th><th>JUMLAH</th></tr></thead><tbody>
            <tr><td className="c">1</td><td>HAMIL</td><td className="num"><N title="PUS hamil" list={pus.filter((w) => !w.kontrasepsi && w.hamil)} /></td></tr>
            {['INGIN ANAK SEGERA', 'INGIN ANAK DITUNDA', 'TIDAK INGIN ANAK LAGI'].map((x, i) => <tr key={x}><td className="c">{i + 2}</td><td>{x}</td><td className="num"><Manual k={`pus-${i}`} periode={periode} /></td></tr>)}
            <tr className="total"><td /><td>PUS tidak ber-KB</td><td className="num"><N title="PUS tidak ber-KB" list={pus.filter((w) => !w.kontrasepsi)} /></td></tr>
          </tbody></T>
        </div>
        <div>
          <h3>III. DATA KETAHANAN KELUARGA</h3>
          <b>1. KEIKUTSERTAAN BALITA DALAM POSYANDU & BKB</b>
          <T><thead><tr><th rowSpan={2}>NO</th><th rowSpan={2}>KELOMPOK UMUR</th><th rowSpan={2}>JML</th><th colSpan={2}>POSYANDU</th><th colSpan={2}>BKB</th></tr><tr><th>IKUT</th><th>TDK</th><th>IKUT</th><th>TDK</th></tr></thead><tbody>
            {([['1 - < 2 TH', bal12], ['2 - < 5 TH', bal25]] as const).map(([l, ls], i) => (
              <tr key={l}><td className="c">{i + 1}</td><td>{l}</td><td className="num"><N title={`Balita ${l}`} list={ls} /></td>
                <td className="num"><N title={`Balita ${l} ikut Posyandu`} list={ls.filter((w) => w.posyandu)} /></td>
                <td className="num"><N title={`Balita ${l} tidak ikut Posyandu`} list={ls.filter((w) => !w.posyandu)} /></td>
                <td className="num"><N title={`Balita ${l} ikut BKB`} list={ls.filter((w) => w.bkb)} /></td>
                <td className="num"><N title={`Balita ${l} tidak ikut BKB`} list={ls.filter((w) => !w.bkb)} /></td>
              </tr>
            ))}
          </tbody></T>
          <b>2. KEIKUTSERTAAN REMAJA DLM PIK-R & BKR</b>
          <T><thead><tr><th rowSpan={2}>NO</th><th rowSpan={2}>KELOMPOK UMUR</th><th rowSpan={2}>JML</th><th colSpan={2}>PIK R</th><th colSpan={2}>BKR</th></tr><tr><th>IKUT</th><th>TDK</th><th>IKUT</th><th>TDK</th></tr></thead><tbody>
            {([['7 - 14 TH', inRange(7, 14)], ['15 - 19 TH', inRange(15, 19)], ['19 - 24 TH', inRange(19, 24)]] as const).map(([l, ls], i) => (
              <tr key={l}><td className="c">{i + 1}</td><td>{l}</td><td className="num"><N title={`Remaja ${l}`} list={ls} /></td>{[0, 1, 2, 3].map((j) => <td key={j} className="num"><Manual k={`rem-${i}-${j}`} periode={periode} /></td>)}</tr>
            ))}
          </tbody></T>
          <b>3. KEIKUTSERTAAN LANSIA & KELUARGA DALAM BKL</b>
          <T><thead><tr><th>NO</th><th>URAIAN</th><th>JUMLAH</th><th>IKUT</th><th>TDK IKUT</th></tr></thead><tbody>
            <tr><td className="c">1</td><td>LANSIA</td><td className="num"><N title="Lansia" list={lansia} /></td><td className="num"><Manual k="bkl-l-ikut" periode={periode} /></td><td className="num"><Manual k="bkl-l-tdk" periode={periode} /></td></tr>
            <tr><td className="c">2</td><td>KELG. LANSIA</td><td className="num">{keluargaLansia}</td><td className="num"><Manual k="bkl-k-ikut" periode={periode} /></td><td className="num"><Manual k="bkl-k-tdk" periode={periode} /></td></tr>
          </tbody></T>
          <b>4. KELOMPOK UPPKA</b>
          <T><thead><tr><th>NO</th><th>NAMA KELOMPOK</th><th>JUMLAH ANGGOTA</th></tr></thead><tbody>
            {[0, 1, 2].map((i) => <tr key={i}><td className="c">{i + 1}</td><td><ManualText k={`uppka-${i}`} periode={periode} /></td><td className="num"><Manual k={`uppka-n-${i}`} periode={periode} /></td></tr>)}
          </tbody></T>
          <p style={{ fontSize: 8, color: '#555' }}>Kolom bertitik (·) diisi manual dan tersimpan per bulan.</p>
        </div>
      </div>
    </div>
  )
}

function ManualText({ k, periode }: { k: string; periode: string }) {
  const st = useStore()
  const rec = st.kampungKB.find((x) => x.periode === periode && !x.deletedAt)
  const key = `txt:${k}`
  const val = (rec?.nilai as unknown as Record<string, string>)?.[key] ?? ''
  return (
    <input className="w-full bg-transparent outline-none focus:bg-violet-50" value={val} placeholder="·" onChange={(e) => {
      const nilai = { ...(rec?.nilai ?? {}), [key]: e.target.value } as unknown as Record<string, number>
      if (rec) st.update('kampungKB', rec.id, { nilai }, `Kampung KB ${periode}`)
      else st.create('kampungKB', { periode, nilai, deletedAt: null }, `Kampung KB ${periode}`)
    }} />
  )
}
