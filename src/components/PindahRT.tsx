import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRightLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useDataDesa } from '@/reports/desa'
import { Button, Modal, Toggle } from '@/components/ui'
import type { Warga } from '@/lib/types'

/** Admin Padukuhan: pindahkan warga (atau sekeluarga) ke RT lain tanpa membuat data ganda; riwayat ikut */
export default function PindahRT({ w, anggota }: { w: Warga; anggota: Warga[] }) {
  const s = useSession()
  const nav = useNavigate()
  const [buka, setBuka] = useState(false)
  const [keRT, setKeRT] = useState('')
  const [sekeluarga, setSekeluarga] = useState(anggota.length > 0)
  const [busy, setBusy] = useState(false)
  if (!s.server || !s.user?.desa) return null
  const pilihan = s.rts.filter((r) => r !== s.rt)

  async function pindah() {
    if (!keRT) return toast.error('Pilih RT tujuan')
    if (s.pending) return toast.error('Tunggu sebentar, masih ada perubahan yang belum terkirim')
    setBusy(true)
    try {
      const r = await api<{ jumlah: number }>('/pindah-rt', { method: 'POST', body: { id: w.id, keRT, sekeluarga } })
      setBuka(false)
      await s.muatUlang()
      void useDataDesa.getState().load(true)
      toast.success(`${r.jumlah} warga dipindah ke RT ${keRT}`, { action: { label: `Buka di RT ${keRT}`, onClick: () => { void s.pilihRT(keRT).then(() => nav(`/warga/${w.id}`)) } }, duration: 8000 })
      nav('/warga')
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <>
      <Button variant="outline" icon={ArrowRightLeft} onClick={() => setBuka(true)}>Pindah RT</Button>
      <Modal open={buka} onClose={() => setBuka(false)} title={`Pindah RT — ${w.nama}`} icon={ArrowRightLeft} color="amber" size="sm"
        footer={<><Button variant="ghost" onClick={() => setBuka(false)}>Batal</Button><Button icon={ArrowRightLeft} disabled={busy || !keRT} onClick={() => void pindah()}>Pindahkan</Button></>}>
        <div className="space-y-3 text-sm">
          <p>Dari <b>RT {s.rt}</b> ke:</p>
          <select aria-label="RT tujuan" value={keRT} onChange={(e) => setKeRT(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800">
            <option value="">— pilih RT tujuan —</option>
            {pilihan.map((r) => <option key={r} value={r}>RT {r}</option>)}
          </select>
          {anggota.length > 0 && <Toggle checked={sekeluarga} onChange={setSekeluarga} label={`Pindahkan sekeluarga (${anggota.length + 1} orang)`} />}
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
            <li>Datanya dipindah, <b>bukan disalin</b> — tidak ada data ganda. Catatan bulanan ibu &amp; riwayat ikut.</li>
            <li>{sekeluarga && anggota.length ? 'Keluarga ikut pindah dan mendapat nomor keluarga baru di RT tujuan.' : 'Warga keluar dari keluarganya; Admin RT tujuan menautkannya ke keluarga di sana.'}</li>
            <li>Alamat "RT {s.rt}" diganti otomatis. Dasawisma dikosongkan bila namanya tidak ada di RT tujuan.</li>
            <li>Tercatat di Riwayat Perubahan kedua RT.</li>
          </ul>
        </div>
      </Modal>
    </>
  )
}
