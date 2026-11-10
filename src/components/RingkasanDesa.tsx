import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { eksporTabel } from '@/lib/excel'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, FileSpreadsheet, Loader2, Printer } from 'lucide-react'
import { useDataDesa } from '@/reports/desa'
import { DEFAULT_SETTINGS } from '@/lib/store'
import { isBalita, isKepala, isLansia, isPUS, isWUS, statusIbuPada, ymOf } from '@/lib/rules'
import { periksaData } from '@/lib/periksa'
import { todayISO } from '@/lib/format'
import { Button, Card } from '@/components/ui'

interface Baris { rt: string; warga: number; kk: number; balita: number; wus: number; pus: number; hamil: number; lansia: number; baru: number; cek: number; penting: number }

/** Ringkasan seluruh desa: angka utama per RT (dihitung seperti laporan: warga aktif & ikut PKK) */
export default function RingkasanDesa() {
  const dd = useDataDesa()
  const tabel = useRef<HTMLDivElement>(null)
  useEffect(() => { void dd.load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const acuan = todayISO()
  const bulanIni = acuan.slice(0, 7)
  const rows = useMemo<Baris[]>(() => (dd.list ?? []).map((d) => {
    const s = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) }
    const ws = d.warga.filter((w) => !w.deletedAt && w.statusWarga === 'Aktif' && w.ikutPKK)
    const ym = ymOf(Number(acuan.slice(0, 4)), Number(acuan.slice(5, 7)) - 1)
    const temuan = periksaData(d.warga, d.keluarga, d.dasawisma, acuan)
    return {
      rt: d.rt, warga: ws.length, kk: ws.filter(isKepala).length,
      balita: ws.filter((w) => isBalita(w, acuan, s)).length, wus: ws.filter((w) => isWUS(w, acuan)).length, pus: ws.filter((w) => isPUS(w, acuan)).length,
      hamil: ws.filter((w) => statusIbuPada(w, ym).hamil).length, lansia: ws.filter((w) => isLansia(w, acuan, s)).length,
      baru: d.warga.filter((w) => !w.deletedAt && (w.createdAt ?? '').slice(0, 7) === bulanIni).length,
      cek: temuan.length, penting: temuan.filter((t) => t.tingkat === 'penting').length,
    }
  }), [dd.list, acuan, bulanIni])
  const jumlah = rows.reduce((t, r) => { for (const k of Object.keys(t) as (keyof Baris)[]) if (k !== 'rt') (t[k] as number) += r[k] as number; return t }, { rt: 'JUMLAH', warga: 0, kk: 0, balita: 0, wus: 0, pus: 0, hamil: 0, lansia: 0, baru: 0, cek: 0, penting: 0 } as Baris)
  const kolom: [keyof Baris, string][] = [['warga', 'Warga'], ['kk', 'KK'], ['balita', 'Balita'], ['wus', 'WUS'], ['pus', 'PUS'], ['hamil', 'Ibu hamil'], ['lansia', 'Lansia'], ['baru', 'Baru bln ini'], ['cek', 'Perlu dicek']]

  return (
    <Card className="mb-5 p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-display font-extrabold"><BarChart3 size={18} className="text-indigo-600" /> Ringkasan Desa Mantup per RT</div>
        <Button size="sm" variant="outline" icon={FileSpreadsheet} disabled={!dd.list} onClick={() => tabel.current && (eksporTabel(tabel.current, `Ringkasan Desa Mantup ${acuan}`) ? toast.success('File Excel diunduh') : toast.error('Tidak ada tabel'))}>Excel</Button>
        <Button size="sm" variant="outline" icon={Printer} disabled={!dd.list} onClick={() => cetak(tabel.current, acuan)}>Cetak</Button>
      </div>
      <p className="mb-3 text-xs text-slate-500">Dihitung per hari ini, seperti di laporan (warga aktif &amp; ikut PKK). “Baru bln ini” = warga yang ditambahkan bulan ini. “Perlu dicek” = isian janggal (lihat menu Cek Data di RT tersebut).</p>
      {!dd.list ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Memuat…</div> : (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={rows} margin={{ left: -18, right: 4, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rt" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(l) => `RT ${l}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="warga" name="Warga" isAnimationActive={false} fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wus" name="WUS" isAnimationActive={false} fill="#d946ef" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pus" name="PUS" isAnimationActive={false} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="balita" name="Balita" isAnimationActive={false} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={tabel} className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="bg-indigo-50 text-[11px] font-bold uppercase tracking-wide text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200"><th className="px-2 py-2 text-left">RT</th>{kolom.map(([, l]) => <th key={l} className="px-2 py-2 text-right">{l}</th>)}</tr></thead>
              <tbody>
                {[...rows, jumlah].map((r) => (
                  <tr key={r.rt} className={`border-t border-slate-100 dark:border-white/5 ${r.rt === 'JUMLAH' ? 'bg-indigo-50/60 font-bold dark:bg-indigo-500/10' : ''} ${r.warga === 0 && r.rt !== 'JUMLAH' ? 'text-slate-400' : ''}`}>
                    <td className="px-2 py-1.5">{r.rt === 'JUMLAH' ? 'JUMLAH' : `RT ${r.rt}`}</td>
                    {kolom.map(([k]) => <td key={k} className={`px-2 py-1.5 text-right tabular-nums ${k === 'cek' && r.penting > 0 ? 'font-bold text-red-600' : ''}`}>{r[k] || (k === 'cek' ? '✓' : '–')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}

/** cetak tabel ringkasan saja (jendela baru, siap kertas A4 / F4) */
function cetak(el: HTMLElement | null, acuan: string) {
  const t = el?.querySelector('table')
  if (!t) return
  const w = window.open('', '_blank')
  if (!w) { toast.error('Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini.'); return }
  const tgl = new Date(acuan + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Ringkasan Desa Mantup ${acuan}</title><style>
    body{font:12px Arial,sans-serif;margin:16px;color:#000} h1{font-size:15px;margin:0 0 2px;text-align:center} p{margin:0 0 10px;text-align:center}
    table{width:100%;border-collapse:collapse} th,td{border:1px solid #000;padding:4px 6px} th{background:#eee;text-transform:uppercase;font-size:10px} td:not(:first-child),th:not(:first-child){text-align:right}
    tr:last-child td{font-weight:bold} .catatan{margin-top:8px;font-size:10px}
    @page{size:A4 landscape;margin:12mm} @media print{.alat{display:none}}
    .alat{margin-bottom:10px;text-align:right} .alat select,.alat button{font-size:13px;padding:6px 10px}
  </style></head><body>
  <div class="alat"><select onchange="document.getElementById('kertas').textContent='@page{size:'+this.value+';margin:12mm}'"><option value="A4 landscape">Kertas A4</option><option value="330mm 215mm">Kertas F4 / Folio</option></select> <button onclick="print()">Cetak</button></div>
  <style id="kertas"></style>
  <h1>RINGKASAN DATA WARGA DESA MANTUP PER RT</h1><p>Keadaan ${tgl} · warga aktif &amp; ikut PKK</p>
  ${t.outerHTML}
  <div class="catatan">Baru bln ini = warga yang ditambahkan bulan ini. Perlu dicek = isian yang janggal / belum lengkap.</div>
  </body></html>`)
  w.document.close()
}
