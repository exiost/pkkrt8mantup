import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, Eye, Trash2 } from 'lucide-react'
import { REPORTS } from '@/lib/modules'
import { useLive } from '@/lib/store'
import { ReportShell, defaultParams, type ReportParams } from '@/reports/shell'
import { Penduduk1559, PencatatanHamilKB, PUS, WUS } from '@/reports/daftar'
import { KampungKB } from '@/reports/kampungkb'
import { IbuHamilDawis, RegisterKelahiran, RekapCatatan, RekapIbuHamil } from '@/reports/rekap'
import { CatatanKeluarga, DataKeluarga, DataWargaTPPKK, HTIRT } from '@/reports/formulir'
import { Button, Card, Empty, Field, Modal, PageHeader, useConfirm } from '@/components/ui'
import { hapusDenganUndo } from '@/lib/crud'

let lastParams: ReportParams | null = null

export default function LaporanPage() {
  const { slug } = useParams()
  const nav = useNavigate()
  const def = REPORTS.find((r) => r.slug === slug)
  const [params, set] = useState<ReportParams>(() => lastParams ?? defaultParams())
  const [status, setStatus] = useState('')
  const setParams = (p: Partial<ReportParams>) => set((x) => (lastParams = { ...x, ...p }))
  if (!def) return <Card><Empty title="Laporan tidak ditemukan" action={<Button onClick={() => nav('/laporan')}>Kembali</Button>} /></Card>
  if (def.slug === 'arsip') return <ArsipPage />
  const S = (o: Partial<Parameters<typeof ReportShell>[0]>, child: React.ReactNode) => (
    <ReportShell def={def} params={params} setParams={setParams} {...o}>{child}</ReportShell>
  )
  switch (def.slug) {
    case 'penduduk-15-59': return S({ use: ['acuan', 'dawis'] }, <Penduduk1559 p={params} />)
    case 'wus': return S({ use: ['acuan', 'dawis'] }, <WUS p={params} />)
    case 'pus': return S({ use: ['acuan', 'dawis'] }, <PUS p={params} />)
    case 'pencatatan-hamil-kb': return S({ use: ['acuan', 'bulan', 'dawis'] }, <PencatatanHamilKB p={params} />)
    case 'kampung-kb': return S({ use: ['acuan', 'bulan', 'dawis'], orientation: 'landscape' }, <KampungKB p={params} />)
    case 'rekap-catatan': return S({ use: ['acuan', 'dawis'], orientation: 'landscape' }, <RekapCatatan p={params} />)
    case 'rekap-ibu-hamil': return S({ use: ['bulan'], orientation: 'landscape' }, <RekapIbuHamil p={params} />)
    case 'ibu-hamil-dawis':
      return S({
        use: ['bulan', 'dawis'], orientation: 'landscape',
        controls: (
          <Field label="Status ibu">
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua</option>{['Hamil', 'Melahirkan', 'Nifas', 'Menyusui'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        ),
      }, <IbuHamilDawis p={params} status={status} />)
    case 'register-kelahiran': return S({ use: ['dawis'], orientation: 'landscape' }, <RegisterKelahiran p={params} />)
    case 'data-warga-tp-pkk': return S({ use: ['acuan', 'dawis'], multiPage: true }, <DataWargaTPPKK p={params} />)
    case 'data-keluarga': return S({ use: ['acuan', 'dawis'], multiPage: true, orientation: 'landscape' }, <DataKeluarga p={params} />)
    case 'catatan-keluarga': return S({ use: ['acuan', 'dawis'], multiPage: true, orientation: 'landscape' }, <CatatanKeluarga p={params} />)
    case 'ht-irt': return S({ use: ['dawis'], multiPage: true }, <HTIRT p={params} />)
  }
  return null
}

function ArsipPage() {
  const arsip = useLive('arsip').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [view, setView] = useState<string | null>(null)
  const confirm = useConfirm()
  const a = arsip.find((x) => x.id === view)
  return (
    <div>
      <PageHeader title="Arsip Laporan" subtitle="Snapshot laporan bulanan (angka terkunci)" icon={Archive} color="slate" />
      {arsip.length === 0 ? <Card><Empty title="Belum ada arsip" desc='Buka laporan bulanan lalu klik "Arsipkan".' icon={Archive} /></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {arsip.map((x) => (
            <Card key={x.id} className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/10"><Archive size={18} /></div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{x.judul}</div><div className="text-xs text-slate-500">Disimpan {new Date(x.createdAt).toLocaleString('id-ID')}</div></div>
              <Button size="sm" variant="soft" icon={Eye} onClick={() => setView(x.id)}>Lihat</Button>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={async () => { if (await confirm({ title: 'Hapus arsip?', message: x.judul, danger: true, okText: 'Hapus' })) hapusDenganUndo('arsip', x.id, x.judul) }}>{''}</Button>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!a} onClose={() => setView(null)} title={a?.judul ?? ''} size="full" footer={<Button onClick={() => window.print()}>Cetak</Button>}>
        <div className="overflow-x-auto"><div className="paper landscape" dangerouslySetInnerHTML={{ __html: a?.html ?? '' }} /></div>
      </Modal>
    </div>
  )
}
