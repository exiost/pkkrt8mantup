import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Cloud, Copy, DatabaseBackup, Download, Eye, EyeOff, FileText, KeyRound, FolderOpen, House, RefreshCw, Save, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { REPORTS } from '@/reports/registry'
import { GABUNGAN } from '@/reports/desa'
import { api, unduhFile } from '@/lib/api'
import { skripGoogleDrive } from '@/lib/gdrive'
import { useSession } from '@/lib/session'
import { Button, Card, Chip, Field, Input, Modal, PageHeader, Select, StatCard, useConfirm } from '@/components/ui'
import type { Role } from '@/lib/types'

interface RingkasRT { rt: string; warga: number; keluarga: number; akhir: string | null; akun: { username: string; name: string; role: Role; active: boolean }[] }

const PERAN: Record<Role, string> = { admin: 'Admin RT', editor: 'Pengurus', viewer: 'Pembaca' }
const tgl = (s: string | null) => (s ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

/** Khusus Admin Desa: ringkasan 17 RT, membuka data RT, dan membuat akun tiap RT */
export default function KelolaRT() {
  const { rt: rtAktif, pilihRT } = useSession()
  const nav = useNavigate()
  const [rows, setRows] = useState<RingkasRT[] | null>(null)
  const [cad, setCad] = useState<{ nama: string; ukuran: number }[]>([])
  const [baru, setBaru] = useState<{ rt: string; username: string; name: string; password: string; role: Role } | null>(null)
  const load = useCallback(async () => {
    try { setRows((await api<{ rts: RingkasRT[] }>('/rts')).rts) } catch (e) { toast.error((e as Error).message) }
    try { setCad((await api<{ list: { nama: string; ukuran: number }[] }>('/cadangan-harian')).list) } catch { /* abaikan */ }
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

      <Card className="mt-5 p-4">
        <div className="mb-1 flex items-center gap-2 font-display font-extrabold"><DatabaseBackup size={18} className="text-sky-600" /> Cadangan harian otomatis (seluruh desa)</div>
        <p className="mb-3 text-xs text-slate-500">Server menyalin seluruh database (semua RT &amp; akun) sekali sehari dan menyimpan 14 hari terakhir di folder <b>cadangan-harian</b> di sebelah folder data. Unduh sesekali dan simpan di laptop/Google Drive.</p>
        {cad.length ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {cad.map((c) => (
              <div key={c.nama} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-white/10">
                <div className="min-w-0 flex-1"><div className="font-semibold">{new Date(c.nama.slice(8, 18) + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><div className="text-xs text-slate-500">{(c.ukuran / 1024 / 1024).toFixed(1)} MB</div></div>
                <Button size="sm" variant="outline" icon={Download} onClick={() => void unduhFile(`/cadangan-harian/${c.nama}`, c.nama).catch((e) => toast.error((e as Error).message))}>Unduh</Button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm italic text-slate-400">Belum ada cadangan.</p>}
      </Card>

      <GoogleDrive />

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

/** Cadangan ke Google Drive lewat Google Apps Script milik Admin Desa */
function GoogleDrive() {
  const confirm = useConfirm()
  const [kunci, setKunci] = useState('')
  const [lihat, setLihat] = useState(false)
  useEffect(() => { api<{ kunci: string }>('/cadangan-kunci').then((r) => setKunci(r.kunci)).catch(() => {}) }, [])
  const alamat = kunci ? new URL(`api/cadangan-terbaru?kunci=${kunci}`, document.baseURI).toString() : ''
  const skrip = alamat ? skripGoogleDrive(alamat) : ''
  const salin = async () => {
    try { await navigator.clipboard.writeText(skrip); toast.success('Skrip disalin — tempel di script.google.com') } catch { toast.error('Tidak bisa menyalin otomatis. Buka "Lihat isi skrip", pilih semua teks, lalu salin.') }
  }
  const ganti = async () => {
    if (!(await confirm({ title: 'Buat kunci baru?', message: 'Kunci lama langsung tidak berlaku. Skrip di Google harus diganti dengan skrip baru, kalau tidak cadangan ke Drive berhenti.', okText: 'Buat kunci baru', danger: true }))) return
    try { setKunci((await api<{ kunci: string }>('/cadangan-kunci/baru', { method: 'POST' })).kunci); toast.success('Kunci baru dibuat. Salin skrip baru ke Google.') } catch (e) { toast.error((e as Error).message) }
  }
  return (
    <Card className="mt-5 p-4">
      <div className="mb-1 flex items-center gap-2 font-display font-extrabold"><Cloud size={18} className="text-emerald-600" /> Cadangan otomatis ke Google Drive</div>
      <p className="mb-3 text-xs text-slate-500">Sebuah skrip kecil di akun Google Anda mengambil cadangan terbaru dari server <b>setiap hari jam 01.00–02.00</b> dan menyimpannya di folder <b>“Cadangan SIWARGA”</b> di Google Drive (60 hari terakhir). Cukup dipasang sekali, sebaiknya dari laptop.</p>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">
        <li>Tekan <b>Salin skrip</b> di bawah.</li>
        <li>Buka <a className="font-semibold text-violet-600 underline" href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer">script.google.com</a> dengan akun Google yang ingin dipakai → <b>Proyek baru</b> (bila belum terbuka).</li>
        <li>Hapus isi yang ada, <b>tempel</b> skrip, lalu tekan ikon <b>Simpan</b> 💾.</li>
        <li>Di daftar fungsi bagian atas pilih <b>pasangJadwalHarian</b>, tekan <b>Jalankan</b>. Saat diminta: <b>Tinjau izin</b> → pilih akun → <b>Lanjutan</b> → <b>Buka … (tidak aman)</b> → <b>Izinkan</b>. Peringatan itu muncul karena skripnya buatan sendiri, bukan dari Google.</li>
        <li>Buka Google Drive: folder <b>Cadangan SIWARGA</b> berisi file <b>siwarga-tanggal.db</b>. Selesai — berikutnya berjalan sendiri tiap hari.</li>
      </ol>
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs dark:bg-white/5">
        <KeyRound size={14} className="shrink-0 text-amber-600" />
        <span className="font-semibold">Kunci rahasia:</span>
        <code className="min-w-0 flex-1 truncate">{kunci ? (lihat ? kunci : '•'.repeat(24)) : 'memuat…'}</code>
        <Button size="sm" variant="ghost" icon={lihat ? EyeOff : Eye} onClick={() => setLihat(!lihat)}>{lihat ? 'Sembunyikan' : 'Lihat'}</Button>
        <Button size="sm" variant="outline" onClick={() => void ganti()}>Buat kunci baru</Button>
      </div>
      <p className="mb-2 text-[11px] text-slate-400">Siapa pun yang tahu kunci ini bisa mengunduh seluruh data desa. Jangan dibagikan. Bila bocor, tekan <b>Buat kunci baru</b> lalu ganti skrip di Google.</p>
      <Button icon={Copy} disabled={!skrip} onClick={() => void salin()}>Salin skrip</Button>
      {skrip && <details className="mt-2 text-xs"><summary className="cursor-pointer text-slate-500">Lihat isi skrip</summary><textarea readOnly value={skrip} className="mt-2 h-56 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] dark:border-white/10 dark:bg-slate-900" /></details>}
    </Card>
  )
}
