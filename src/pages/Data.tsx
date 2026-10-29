import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Save, RotateCcw, HardDriveDownload, HardDriveUpload, Users, House, Baby } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { eksporWarga, imporExcel, type HasilImpor } from '@/lib/excel'
import { Button, Card, PageHeader, Section, StatCard, Segmented, useConfirm } from '@/components/ui'
import { rayakan } from '@/lib/crud'
import type { Collections } from '@/lib/types'
import { uid } from '@/lib/format'

export default function DataPage() {
  const st = useStore()
  const confirm = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)
  const [hasil, setHasil] = useState<HasilImpor | null>(null)
  const [mode, setMode] = useState<'ganti' | 'tambah'>('ganti')
  const [loading, setLoading] = useState(false)

  async function bacaExcel(f: File) {
    setLoading(true)
    try {
      setHasil(imporExcel(await f.arrayBuffer()))
    } catch (e) {
      toast.error(`Gagal membaca file: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  async function simpanImpor() {
    if (!hasil) return
    if (mode === 'ganti' && st.warga.some((w) => !w.deletedAt) && !(await confirm({ title: 'Ganti semua data?', message: 'Data warga, KK, dan kelahiran yang ada sekarang akan diganti dengan hasil impor. Sebaiknya unduh cadangan dulu.', danger: true, okText: 'Ganti' }))) return
    const now = new Date().toISOString()
    const stamp = <T,>(x: T) => ({ ...x, createdAt: now, updatedAt: now }) as T & { createdAt: string; updatedAt: string }
    const dwsExisting = st.dasawisma.filter((d) => !d.deletedAt).map((d) => d.nama)
    const warnaBaru = ['teal', 'orange', 'violet', 'sky', 'lime', 'rose']
    const dwsNew = hasil.dasawisma.filter((d) => !dwsExisting.includes(d)).map((nama, i) => stamp({ id: uid(), nama, ketua: '', warna: nama === 'Drupadi' ? 'slate' : warnaBaru[i % warnaBaru.length], deletedAt: null }))
    const w = hasil.warga.map(stamp), k = hasil.keluarga.map(stamp), l = hasil.kelahiran.map(stamp)
    const c: Partial<Collections> =
      mode === 'ganti'
        ? { warga: w, keluarga: k, kelahiran: l, dasawisma: [...st.dasawisma, ...dwsNew] }
        : { warga: [...st.warga, ...w], keluarga: [...st.keluarga, ...k.filter((x) => !st.keluarga.some((y) => y.noKK === x.noKK))], kelahiran: [...st.kelahiran, ...l], dasawisma: [...st.dasawisma, ...dwsNew] }
    st.replaceAll(c)
    toast.success(`Impor berhasil: ${w.length} warga, ${k.length} KK 🎉`)
    rayakan()
    setHasil(null)
  }

  function cadangan() {
    const s = useStore.getState()
    const data = { versi: 1, dibuat: new Date().toISOString(), settings: s.settings, warga: s.warga, keluarga: s.keluarga, kelahiran: s.kelahiran, kematian: s.kematian, pesertaKB: s.pesertaKB, dasawisma: s.dasawisma, tags: s.tags, kampungKB: s.kampungKB, arsip: s.arsip }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    a.download = `cadangan-siwarga-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast.success('File cadangan diunduh')
  }

  async function pulihkan(f: File) {
    try {
      const d = JSON.parse(await f.text())
      if (!Array.isArray(d.warga)) throw new Error('Format tidak dikenali')
      if (!(await confirm({ title: 'Pulihkan dari cadangan?', message: `Semua data sekarang akan diganti dengan isi cadangan (${d.warga.length} warga, dibuat ${new Date(d.dibuat).toLocaleString('id-ID')}).`, danger: true, okText: 'Pulihkan' }))) return
      const { settings, versi: _v, dibuat: _d, ...rest } = d
      st.replaceAll(rest, settings ? { ...st.settings, ...settings } : undefined)
      toast.success('Data berhasil dipulihkan')
    } catch (e) {
      toast.error(`Gagal: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <PageHeader title="Impor / Ekspor & Cadangan" subtitle="Pindahkan data dari Excel lama, ekspor kembali, dan simpan cadangan" icon={Database} color="sky" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Impor dari file Excel lama (.xlsm / .xlsx)" icon={Upload} color="emerald">
          <p className="mb-3 text-sm text-slate-500">Membaca sheet <b>DATA WARGA</b> dan <b>bayi lahir</b>. File diproses di perangkat Anda dan tidak dikirim ke mana pun. Nilai yang tidak rapi (spasi, huruf besar/kecil, teks pekarangan) dibersihkan otomatis.</p>
          <input ref={fileRef} type="file" accept=".xlsm,.xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && bacaExcel(e.target.files[0])} />
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) bacaExcel(f) }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            <FileSpreadsheet size={36} />
            <span className="font-semibold">{loading ? 'Membaca file…' : 'Klik atau seret file Excel ke sini'}</span>
          </motion.button>
        </Section>
        <Section title="Ekspor & Cadangan" icon={Download} color="sky">
          <div className="space-y-3">
            <Button className="w-full" variant="outline" icon={FileSpreadsheet} onClick={() => eksporWarga(st.warga.filter((w) => !w.deletedAt), st.keluarga.filter((k) => !k.deletedAt))}>Ekspor Data Warga ke Excel (.xlsx)</Button>
            <Button className="w-full" variant="outline" icon={HardDriveDownload} onClick={cadangan}>Unduh cadangan lengkap (.json)</Button>
            <input ref={jsonRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && pulihkan(e.target.files[0])} />
            <Button className="w-full" variant="outline" icon={HardDriveUpload} onClick={() => jsonRef.current?.click()}>Pulihkan dari cadangan (.json)</Button>
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              ⚠️ Data tersimpan di browser perangkat ini. Unduh cadangan secara rutin (mis. tiap minggu). Untuk memindahkan ke HP/laptop lain: unduh cadangan di sini, lalu pulihkan di perangkat lain.
            </p>
            <Button className="w-full" variant="ghost" icon={RotateCcw} onClick={async () => {
              if (await confirm({ title: 'Hapus SEMUA data?', message: 'Semua warga, KK, laporan, dan arsip di perangkat ini akan dihapus. Tidak bisa dibatalkan.', danger: true, okText: 'Hapus semua' })) { st.resetAll(); toast.success('Semua data dihapus') }
            }}>Kosongkan semua data</Button>
          </div>
        </Section>
      </div>

      {hasil && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><CheckCircle2 className="text-emerald-500" /> Hasil pembacaan file</h3>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Warga" value={hasil.warga.length} icon={Users} color="indigo" />
              <StatCard label="Kartu Keluarga" value={hasil.keluarga.length} icon={House} color="amber" i={1} />
              <StatCard label="Bayi lahir" value={hasil.kelahiran.length} icon={Baby} color="cyan" i={2} />
              <StatCard label="Peringatan" value={hasil.peringatan.length} icon={AlertTriangle} color="red" i={3} />
            </div>
            {hasil.peringatan.length > 0 && (
              <details className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200" open={hasil.peringatan.length < 10}>
                <summary className="cursor-pointer font-semibold">⚠️ {hasil.peringatan.length} hal perlu dicek (data tetap diimpor, bisa diperbaiki nanti)</summary>
                <ul className="mt-2 max-h-60 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs">{hasil.peringatan.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </details>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Segmented value={mode} onChange={setMode} options={[{ value: 'ganti', label: 'Ganti data yang ada' }, { value: 'tambah', label: 'Tambahkan ke data yang ada' }]} />
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => setHasil(null)}>Batal</Button>
              <Button icon={Save} onClick={simpanImpor}>Simpan hasil impor</Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
