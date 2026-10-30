import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Cloud, DatabaseBackup, KeyRound, LogOut, Pencil, Plus, Save, Server, Trash2, Unplug, Upload, UserCog } from 'lucide-react'
import { api, getBase, setBase } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useStore } from '@/lib/store'
import { Button, Chip, Field, IconBtn, Input, Modal, Section, Select, Toggle, useConfirm } from '@/components/ui'
import type { AppUser, Role } from '@/lib/types'

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin (semua hak)', editor: 'Pengurus (ubah data)', viewer: 'Pembaca (hanya lihat)' }

export default function AkunServer() {
  const s = useSession()
  return s.server && s.user ? <ServerMode /> : <LocalMode />
}

/* ---------------- mode lokal: sambungkan ke server ---------------- */
function LocalMode() {
  const [url, setUrl] = useState(getBase())
  return (
    <div className="space-y-4">
      <Section title="Mode lokal (tanpa login)" icon={Cloud} color="slate">
        <p className="text-sm text-slate-600 dark:text-slate-300">Data saat ini tersimpan <b>hanya di browser perangkat ini</b>. Tidak ada login dan tidak ikut tersimpan di server. Pakai menu <b>Impor / Ekspor</b> untuk membuat cadangan.</p>
      </Section>
      <Section title="Hubungkan ke server (data tersimpan di SQLite + login)" icon={Server} color="violet">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Jika server SIWARGA sudah Anda pasang, masukkan alamatnya (mis. <code>https://siwarga.contoh.com</code>). Setelah itu aplikasi meminta login dan semua data disimpan di server.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="server-url" placeholder="https://alamat-server-anda" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button icon={Server} onClick={() => { if (!/^https?:\/\//i.test(url.trim())) return toast.error('Alamat harus diawali http:// atau https://'); setBase(url.trim()); location.reload() }}>Hubungkan</Button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Panduan memasang server ada di docs/SERVER.md.</p>
      </Section>
    </div>
  )
}

/* ---------------- mode server ---------------- */
function ServerMode() {
  const s = useSession()
  const confirm = useConfirm()
  const user = s.user!
  const admin = user.role === 'admin'
  return (
    <div className="space-y-4">
      <Section title="Akun saya" icon={KeyRound} color="violet" actions={<Button size="sm" variant="outline" icon={LogOut} onClick={s.logout}>Keluar</Button>}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <b>{user.name || user.username}</b> <Chip color="violet">{ROLE_LABEL[user.role]}</Chip> <Chip color="emerald" icon={Cloud}>Terhubung ke server {getBase() || '(server ini)'}</Chip>
        </div>
        <ChangePassword />
      </Section>
      {admin && <Users />}
      {admin && <Backup />}
      {getBase() && (
        <Section title="Putuskan dari server" icon={Unplug} color="slate">
          <p className="mb-2 text-sm text-slate-500">Kembali memakai mode lokal di perangkat ini. Data di server tidak dihapus.</p>
          <Button variant="outline" onClick={async () => { if (await confirm({ title: 'Putuskan dari server?', message: 'Aplikasi kembali ke mode lokal.', okText: 'Putuskan' })) { setBase(''); s.logout(); location.reload() } }}>Putuskan</Button>
        </Section>
      )}
    </div>
  )
}

function ChangePassword() {
  const [old, setOld] = useState('')
  const [nw, setNw] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true)
      try { await api('/me/password', { method: 'POST', body: { old, next: nw } }); toast.success('Kata sandi diganti'); setOld(''); setNw('') } catch (x) { toast.error((x as Error).message) } finally { setBusy(false) }
    }}>
      <Field label="Kata sandi lama"><Input type="password" value={old} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" required /></Field>
      <Field label="Kata sandi baru (min. 8)"><Input type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" minLength={8} required /></Field>
      <Button type="submit" icon={Save} disabled={busy}>Ganti</Button>
    </form>
  )
}

function Users() {
  const me = useSession((x) => x.user)!
  const confirm = useConfirm()
  const [users, setUsers] = useState<(AppUser & { created_at?: string })[]>([])
  const [edit, setEdit] = useState<Partial<AppUser> & { password?: string; baru?: boolean } | null>(null)
  const load = useCallback(async () => { try { setUsers((await api<{ users: AppUser[] }>('/users')).users) } catch (e) { toast.error((e as Error).message) } }, [])
  useEffect(() => { void load() }, [load])

  async function save() {
    if (!edit) return
    try {
      if (edit.baru) await api('/users', { method: 'POST', body: { username: edit.username, name: edit.name, password: edit.password, role: edit.role } })
      else await api(`/users/${edit.id}`, { method: 'PUT', body: { name: edit.name, role: edit.role, active: edit.active, ...(edit.password ? { password: edit.password } : {}) } })
      toast.success('Pengguna disimpan')
      setEdit(null)
      void load()
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Section title="Pengguna" icon={UserCog} color="indigo" actions={<Button size="sm" icon={Plus} onClick={() => setEdit({ baru: true, role: 'editor', active: true, username: '', name: '', password: '' })}>Tambah</Button>}>
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">{(u.name || u.username).slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{u.name || u.username} {u.id === me.id && <Chip color="emerald">Anda</Chip>}</div><div className="text-xs text-slate-500">@{u.username}</div></div>
            <Chip color={u.role === 'admin' ? 'red' : u.role === 'editor' ? 'violet' : 'slate'}>{u.role}</Chip>
            {!u.active && <Chip color="slate">nonaktif</Chip>}
            <IconBtn icon={Pencil} label="Ubah" onClick={() => setEdit({ ...u, password: '' })} />
            <IconBtn icon={Trash2} label="Hapus" disabled={u.id === me.id} onClick={async () => {
              if (!(await confirm({ title: 'Hapus pengguna?', message: `${u.name || u.username} tidak bisa masuk lagi.`, danger: true, okText: 'Hapus' }))) return
              try { await api(`/users/${u.id}`, { method: 'DELETE' }); void load() } catch (e) { toast.error((e as Error).message) }
            }} />
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.baru ? 'Tambah pengguna' : 'Ubah pengguna'} icon={UserCog} size="sm"
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button icon={Save} onClick={save}>Simpan</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Nama lengkap"><Input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Nama pengguna (untuk login)"><Input value={edit.username ?? ''} disabled={!edit.baru} onChange={(e) => setEdit({ ...edit, username: e.target.value })} /></Field>
            <Field label="Peran"><Select options={['admin', 'editor', 'viewer']} value={edit.role ?? 'editor'} onChange={(v) => setEdit({ ...edit, role: (v || 'viewer') as Role })} /></Field>
            <p className="-mt-1 text-xs text-slate-400">{ROLE_LABEL[edit.role ?? 'editor']}</p>
            <Field label={edit.baru ? 'Kata sandi (min. 8)' : 'Kata sandi baru (kosongkan bila tidak diganti)'}><Input type="password" value={edit.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" /></Field>
            {!edit.baru && <Toggle checked={edit.active !== false} onChange={(b) => setEdit({ ...edit, active: b })} label="Akun aktif" />}
          </div>
        )}
      </Modal>
    </Section>
  )
}

function Backup() {
  const st = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  async function unduh() {
    try {
      const d = await api('/backup')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' }))
      a.download = `cadangan-server-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
    } catch (e) { toast.error((e as Error).message) }
  }
  async function pulihkan(f: File) {
    try {
      const d = JSON.parse(await f.text())
      if (!(await confirm({ title: 'Pulihkan data server?', message: 'Semua data di server diganti isi file cadangan ini.', danger: true, okText: 'Pulihkan' }))) return
      await api('/restore', { method: 'POST', body: d })
      toast.success('Data server dipulihkan')
      location.reload()
    } catch (e) { toast.error((e as Error).message) }
  }
  async function dariLokal() {
    let raw: string | null = null
    try { raw = localStorage.getItem('siwarga-pkk-rt08') } catch { /* ditolak */ }
    if (!raw) return toast.error('Tidak ada data lokal di browser ini')
    try {
      const state = JSON.parse(raw).state
      if (!Array.isArray(state?.warga)) throw new Error('format tidak dikenali')
      if (!(await confirm({ title: 'Kirim data lokal ke server?', message: `${state.warga.length} warga dari browser ini akan menggantikan data di server.`, danger: true, okText: 'Kirim' }))) return
      const { settings, audit: _a, ...cols } = state
      st.replaceAll(cols, settings)
      toast.success('Data lokal dikirim ke server')
    } catch (e) { toast.error(`Gagal: ${(e as Error).message}`) }
  }
  return (
    <Section title="Cadangan server" icon={DatabaseBackup} color="sky">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" icon={DatabaseBackup} onClick={unduh}>Unduh cadangan (.json)</Button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && pulihkan(e.target.files[0])} />
        <Button variant="outline" icon={Upload} onClick={() => fileRef.current?.click()}>Pulihkan dari cadangan</Button>
        <Button variant="outline" icon={Server} onClick={dariLokal}>Kirim data dari browser ini (mode lokal)</Button>
      </div>
      <p className="mt-2 text-xs text-slate-400">Impor file Excel lama juga bisa dilakukan di menu Impor / Ekspor; hasilnya langsung tersimpan di server.</p>
    </Section>
  )
}
