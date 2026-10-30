import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Loader2, LogIn, ServerOff, ShieldCheck, UserPlus } from 'lucide-react'
import { Button, Field, Input } from './ui'
import { useSession } from '@/lib/session'
import { getBase, setBase } from '@/lib/api'

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-4">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <img src="./icon.svg" alt="" className="h-12 w-12 rounded-2xl shadow-lg shadow-violet-500/30" />
          <div>
            <div className="font-display text-lg font-extrabold leading-tight text-slate-900 dark:text-white">SIWARGA PKK</div>
            <div className="text-xs text-slate-500">RT 08 · Mantup</div>
          </div>
        </div>
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mb-4 mt-1 text-sm text-slate-500">{subtitle}</p>}
        {children}
      </motion.div>
    </div>
  )
}

export default function Boot({ children }: { children: ReactNode }) {
  const s = useSession()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [p2, setP2] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    // penolakan hak akses (akun hanya-baca) sudah diberi tahu lewat notifikasi; jangan dianggap error halaman
    const quiet = (m: unknown) => /tidak boleh melakukan ini/.test(String(m))
    const onErr = (e: ErrorEvent) => { if (quiet(e.message)) e.preventDefault() }
    const onRej = (e: PromiseRejectionEvent) => { if (quiet((e.reason as Error)?.message)) e.preventDefault() }
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    void useSession.getState().start()
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej) }
  }, [])

  async function submit(e: FormEvent, mode: 'login' | 'setup') {
    e.preventDefault()
    setErr('')
    if (mode === 'setup' && p !== p2) return setErr('Kata sandi dan ulangannya tidak sama')
    setBusy(true)
    try {
      if (mode === 'login') await s.login(u, p)
      else await s.setup(u, p, name)
    } catch (x) {
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (s.boot === 'ready' || s.boot === 'local') return <>{children}</>

  if (s.boot === 'checking')
    return (
      <Shell title="Menyiapkan aplikasi…">
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} /> Memeriksa server</div>
      </Shell>
    )

  if (s.boot === 'error')
    return (
      <Shell title="Server tidak terjangkau" subtitle={s.error}>
        <div className="space-y-2">
          <Button className="w-full" icon={ServerOff} onClick={() => void s.start()}>Coba lagi</Button>
          <Button className="w-full" variant="outline" onClick={() => { setBase(''); s.useLocal() }}>Pakai mode lokal (tanpa server)</Button>
          <p className="pt-1 text-center text-[11px] text-slate-400">Alamat server: {getBase() || '(server ini)'}</p>
        </div>
      </Shell>
    )

  if (s.boot === 'setup')
    return (
      <Shell title="Buat akun admin pertama" subtitle="Server baru siap dipakai. Buat akun admin untuk mengelola pengguna dan data.">
        <form className="space-y-3" onSubmit={(e) => submit(e, 'setup')}>
          <Field label="Nama lengkap"><Input id="setup-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
          <Field label="Nama pengguna"><Input id="setup-user" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required /></Field>
          <Field label="Kata sandi (min. 8 karakter)"><Input id="setup-pass" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="new-password" required minLength={8} /></Field>
          <Field label="Ulangi kata sandi"><Input id="setup-pass2" type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" required /></Field>
          {err && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-600">{err}</p>}
          <Button className="w-full" icon={busy ? Loader2 : UserPlus} disabled={busy} type="submit">Buat akun & masuk</Button>
        </form>
      </Shell>
    )

  return (
    <Shell title="Masuk" subtitle="Data warga hanya bisa dibuka setelah login.">
      <form className="space-y-3" onSubmit={(e) => submit(e, 'login')}>
        <Field label="Nama pengguna"><Input id="login-user" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoFocus required /></Field>
        <Field label="Kata sandi"><Input id="login-pass" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></Field>
        {err && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-600">{err}</p>}
        <Button className="w-full" icon={busy ? Loader2 : LogIn} disabled={busy} type="submit">Masuk</Button>
      </form>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"><ShieldCheck size={16} className="shrink-0" /> Lupa kata sandi? Minta admin untuk mengatur ulang di menu Pengaturan → Pengguna.</div>
      {getBase() && <button className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600" onClick={() => { setBase(''); s.useLocal() }}><KeyRound size={12} /> Pakai mode lokal (tanpa server)</button>}
    </Shell>
  )
}
