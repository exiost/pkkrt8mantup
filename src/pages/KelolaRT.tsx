import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, FileText, FolderOpen, House, RefreshCw, Save, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { REPORTS } from '@/reports/registry'
import { GABUNGAN } from '@/reports/desa'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { Button, Card, Chip, Field, Input, Modal, PageHeader, Select, StatCard } from '@/components/ui'
import type { Role } from '@/lib/types'

interface RingkasRT { rt: string; warga: number; keluarga: number; akhir: string | null; akun: { username: string; name: string; role: Role; active: boolean }[] }

const PERAN: Record<Role, string> = { admin: 'Admin RT', editor: 'Pengurus', viewer: 'Pembaca' }
const tgl = (s: string | null) => (s ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

/** Khusus Admin Desa: ringkasan 17 RT, membuka data RT, dan membuat akun tiap RT */
export default function KelolaRT() {
  const { rt: rtAktif, pilihRT } = useSession()
  const nav = useNavigate()
  const [rows, setRows] = useState<RingkasRT[] | null>(null)
  const [baru, setBaru] = useState<{ rt: string; username: string; name: string; password: string; role: Role } | null>(null)
  const load = useCallback(async () => {
    try { setRows((await api<{ rts: RingkasRT[] }>('/rts')).rts) } catch (e) { toast.error((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function simpan() {
    if (!baru) return
    try {
      await api('/users', { method: 'POST', body: baru })
      toast.success(`Akun ${baru.username} untuk RT ${baru.rt} dibuat`)
      setBaru(null)
      void load()
    } catch (e) { toast.error((e as Error).message) }
  }
  async function buka(rt: string) {
    if (rt !== rtAktif && !(await pilihRT(rt))) return
    nav('/')
  }

  const total = (k: 'warga' | 'keluarga') => (rows ?? []).reduce((a, r) => a + r[k], 0)
  const terisi = (rows ?? []).filter((r) => r.warga > 0).length

  return (
    <div>
      <PageHeader title="Kelola RT — Desa Mantup" subtitle="Ringkasan semua RT, buka data RT, dan buat akun Admin RT" icon={Building2} color="amber"
        actions={<Button variant="outline" icon={RefreshCw} onClick={() => void load()}>Muat ulang</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Warga seluruh desa" value={total('warga')} icon={Users} color="sky" i={0} />
        <StatCard label="Keluarga (KK)" value={total('keluarga')} icon={House} color="emerald" i={1} />
        <StatCard label={`RT yang sudah mengisi (dari ${rows?.length ?? 17})`} value={terisi} icon={Building2} color="amber" i={2} />
      </div>

      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center gap-2 font-display font-extrabold"><FileText size={18} className="text-amber-600" /> Laporan gabungan Desa Mantup (RT 01–17)</div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.filter((d) => GABUNGAN[d.slug] && !d.hidden).map((d) => (
            <Link key={d.slug} to={`/laporan/${d.slug}?desa=1`} className="shine flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-2.5 text-sm font-semibold text-slate-700 transition hover:shadow-md dark:border-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10 dark:text-slate-100">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow"><d.icon size={17} /></span>
              <span className="min-w-0 flex-1 leading-tight">{d.title}<span className="block text-[11px] font-normal text-slate-500">{GABUNGAN[d.slug] === 'rekap' ? 'satu baris per RT + jumlah desa' : 'daftar nama semua RT + kolom RT'}</span></span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(rows ?? []).map((r) => (
          <Card key={r.rt} shine className={`p-4 ${r.rt === rtAktif ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-display text-lg font-extrabold text-white shadow ${r.warga ? 'from-amber-500 to-orange-500' : 'from-slate-300 to-slate-400'}`}>{r.rt}</div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-extrabold">RT {r.rt} {r.rt === rtAktif && <Chip color="amber">sedang dibuka</Chip>}</div>
                <div className="text-xs text-slate-500">{r.warga} warga · {r.keluarga} KK</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">Terakhir diperbarui: <b className="text-slate-700 dark:text-slate-200">{tgl(r.akhir)}</b></div>
            <div className="mt-2 flex min-h-[1.75rem] flex-wrap gap-1">
              {r.akun.length ? r.akun.map((a) => (
                <Chip key={a.username} color={a.role === 'admin' ? 'red' : a.role === 'editor' ? 'violet' : 'slate'}>@{a.username} · {PERAN[a.role]}{a.active ? '' : ' (nonaktif)'}</Chip>
              )) : <span className="text-xs italic text-amber-600">Belum ada akun</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" icon={FolderOpen} onClick={() => void buka(r.rt)}>Buka data</Button>
              <Button size="sm" variant="outline" icon={UserPlus} onClick={() => setBaru({ rt: r.rt, username: `admin${r.rt}`, name: `Admin RT ${r.rt}`, password: '', role: 'admin' })}>Buat akun</Button>
            </div>
          </Card>
        ))}
      </div>
      {!rows && <p className="text-sm text-slate-400">Memuat…</p>}

      <Modal open={!!baru} onClose={() => setBaru(null)} title={`Buat akun RT ${baru?.rt ?? ''}`} icon={UserPlus} color="amber" size="sm"
        footer={<><Button variant="ghost" onClick={() => setBaru(null)}>Batal</Button><Button icon={Save} onClick={simpan}>Simpan</Button></>}>
        {baru && (
          <div className="space-y-3">
            <Field label="Nama lengkap"><Input value={baru.name} onChange={(e) => setBaru({ ...baru, name: e.target.value })} /></Field>
            <Field label="Nama pengguna (untuk login)"><Input value={baru.username} onChange={(e) => setBaru({ ...baru, username: e.target.value })} /></Field>
            <Field label="Peran"><Select options={['admin', 'editor', 'viewer']} value={baru.role} onChange={(v) => setBaru({ ...baru, role: (v || 'admin') as Role })} /></Field>
            <p className="-mt-1 text-xs text-slate-400">{baru.role === 'admin' ? 'Admin RT: kelola semua data & akun RT ini saja' : baru.role === 'editor' ? 'Pengurus: isi & ubah data RT ini' : 'Pembaca: hanya melihat laporan RT ini'}</p>
            <Field label="Kata sandi (min. 8)"><Input type="password" value={baru.password} onChange={(e) => setBaru({ ...baru, password: e.target.value })} autoComplete="new-password" /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
