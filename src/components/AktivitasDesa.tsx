import { useCallback, useEffect, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, Card, Chip } from '@/components/ui'

interface Aktivitas { id: string; waktu: string; aksi: string; label: string; koleksi: string; oleh?: string; rt: string }
const WARNA: Record<string, string> = { Tambah: 'emerald', Ubah: 'sky', Hapus: 'rose', Pulihkan: 'violet', 'Hapus Permanen': 'red' }
const NAMA: Record<string, string> = { warga: 'Warga', keluarga: 'Keluarga', kelahiran: 'Kelahiran', kematian: 'Kematian', pesertaKB: 'Peserta KB', pusBaru: 'PUS baru', dasawisma: 'Dasawisma', tags: 'Penanda', kampungKB: 'Kampung KB', arsip: 'Arsip' }

/** Admin Desa: siapa mengubah apa, di RT mana (gabungan riwayat semua RT) */
export default function AktivitasDesa() {
  const [list, setList] = useState<Aktivitas[] | null>(null)
  const [rt, setRt] = useState('')
  const [batas, setBatas] = useState(50)
  const load = useCallback(async () => { try { setList((await api<{ list: Aktivitas[] }>('/aktivitas?limit=500')).list) } catch { setList([]) } }, [])
  useEffect(() => { void load() }, [load])
  const rts = [...new Set((list ?? []).map((a) => a.rt))].sort()
  const tampil = (list ?? []).filter((a) => !rt || a.rt === rt)
  return (
    <Card className="mt-5 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-display font-extrabold"><Activity size={18} className="text-sky-600" /> Catatan aktivitas seluruh desa</div>
        <select aria-label="Saring RT" value={rt} onChange={(e) => { setRt(e.target.value); setBatas(50) }} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-slate-800">
          <option value="">Semua RT</option>
          {rts.map((r) => <option key={r} value={r}>RT {r}</option>)}
        </select>
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => void load()}>Muat ulang</Button>
      </div>
      {!list ? <p className="text-sm text-slate-400">Memuat…</p> : tampil.length === 0 ? <p className="text-sm italic text-slate-400">Belum ada aktivitas.</p> : (
        <div className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {tampil.slice(0, batas).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <Chip color="amber">RT {a.rt}</Chip>
              <Chip color={WARNA[a.aksi] ?? 'slate'}>{a.aksi}</Chip>
              <span className="min-w-0 flex-1 basis-40">{NAMA[a.koleksi] ?? a.koleksi}: <b>{a.label || '-'}</b></span>
              <span className="text-xs text-slate-500">{a.oleh ? `${a.oleh} · ` : ''}{new Date(a.waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
          {tampil.length > batas && <div className="pt-2 text-center"><Button size="sm" variant="outline" onClick={() => setBatas(batas + 100)}>Tampilkan lebih banyak</Button></div>}
        </div>
      )}
    </Card>
  )
}
