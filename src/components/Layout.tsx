import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Cloud, CloudOff, LogOut, LayoutDashboard, Users, House, Baby, FileText, Settings, Database, Trash2, History, Plus, Moon, Sun, Menu, Search, Sprout, X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLive } from '@/lib/store'
import { useUi } from '@/lib/ui'
import { useSession } from '@/lib/session'
import { useEditor } from './EditorHost'
import { REPORTS } from '@/lib/modules'
import { Avatar } from './ui'

const NAV = [
  { to: '/', label: 'Beranda', icon: LayoutDashboard, group: '' },
  { to: '/warga', label: 'Data Warga', icon: Users, group: 'Data' },
  { to: '/keluarga', label: 'Keluarga (KK)', icon: House, group: 'Data' },
  { to: '/ibu-anak', label: 'Ibu & Anak, KB', icon: Baby, group: 'Data' },
  { to: '/pekarangan', label: 'Pekarangan & IRT', icon: Sprout, group: 'Data' },
  { to: '/laporan', label: 'Laporan & Cetak', icon: FileText, group: 'Laporan' },
  { to: '/data', label: 'Impor / Ekspor', icon: Database, group: 'Sistem' },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings, group: 'Sistem' },
  { to: '/sampah', label: 'Tempat Sampah', icon: Trash2, group: 'Sistem' },
  { to: '/riwayat', label: 'Riwayat Perubahan', icon: History, group: 'Sistem' },
]

function SyncBadge() {
  const { server, sync, pending, user } = useSession()
  if (!server) return null
  const bad = sync === 'error'
  return (
    <span title={bad ? 'Belum tersimpan ke server, mencoba lagi…' : 'Terhubung ke server'} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${bad ? 'bg-red-50 text-red-600' : sync === 'saving' || pending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
      {bad ? <CloudOff size={12} /> : <Cloud size={12} />}
      {bad ? 'Gagal simpan' : sync === 'saving' || pending ? 'Menyimpan…' : user?.name ?? 'Tersimpan'}
    </span>
  )
}

function UserBox() {
  const { server, user, logout } = useSession()
  if (!server || !user) return null
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 p-2 dark:bg-white/5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">{(user.name || user.username).slice(0, 2).toUpperCase()}</div>
      <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-xs font-semibold">{user.name || user.username}</div><div className="text-[10px] uppercase tracking-wide text-slate-400">{user.role}</div></div>
      <button onClick={logout} title="Keluar" aria-label="Keluar" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white dark:hover:bg-white/10"><LogOut size={16} /></button>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <img src="./icon.svg" alt="" className="h-10 w-10 rounded-xl shadow-lg shadow-violet-500/30" />
      <div className="leading-tight">
        <div className="font-display text-base font-extrabold text-slate-900 dark:text-white">SIWARGA PKK</div>
        <div className="text-[11px] font-medium text-slate-500">RT 08 · Mantup</div>
      </div>
    </div>
  )
}

function NavList({ onNav }: { onNav?: () => void }) {
  let last = ''
  return (
    <nav className="space-y-0.5">
      {NAV.map((n) => {
        const head = n.group !== last ? n.group : ''
        last = n.group
        return (
          <div key={n.to}>
            {head && <div className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{head}</div>}
            <NavLink to={n.to} end={n.to === '/'} onClick={onNav}
              className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-violet-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-100 to-fuchsia-50 dark:from-violet-600/40 dark:to-fuchsia-600/20" />}
                  <n.icon size={18} className="relative" />
                  <span className="relative">{n.label}</span>
                </>
              )}
            </NavLink>
          </div>
        )
      })}
    </nav>
  )
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const warga = useLive('warga')
  const nav = useNavigate()
  useEffect(() => setQ(''), [open])
  const res = useMemo(() => {
    const s = q.toLowerCase().trim()
    if (!s) return { w: [], r: REPORTS.slice(0, 6), n: NAV.slice(0, 5) }
    return {
      w: warga.filter((w) => w.nama.toLowerCase().includes(s) || w.nik.includes(s) || w.noKK.includes(s)).slice(0, 8),
      r: REPORTS.filter((r) => r.title.toLowerCase().includes(s) || r.sheet.toLowerCase().includes(s)),
      n: NAV.filter((n) => n.label.toLowerCase().includes(s)),
    }
  }, [q, warga])
  const go = (to: string) => { nav(to); onClose() }
  return (
    <AnimatePresence>
      {open && (
        <div className="no-print fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-white/10">
              <Search size={18} className="text-slate-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari warga, NIK, laporan, menu…" className="h-14 flex-1 bg-transparent text-sm outline-none" />
              <kbd className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-500 dark:bg-white/10">ESC</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 text-sm">
              {res.w.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">Warga</div>}
              {res.w.map((w) => (
                <button key={w.id} onClick={() => go(`/warga/${w.id}`)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-violet-50 dark:hover:bg-white/5">
                  <Avatar nama={w.nama} jk={w.jk} />
                  <div><div className="font-semibold">{w.nama}</div><div className="text-xs text-slate-500">{w.dasawisma} · {w.statusKeluarga}</div></div>
                </button>
              ))}
              {res.r.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">Laporan</div>}
              {res.r.map((r) => (
                <button key={r.slug} onClick={() => go(`/laporan/${r.slug}`)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-violet-50 dark:hover:bg-white/5">
                  <r.icon size={18} className="text-violet-500" /> {r.title}
                </button>
              ))}
              {res.n.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">Menu</div>}
              {res.n.map((n) => (
                <button key={n.to} onClick={() => go(n.to)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-violet-50 dark:hover:bg-white/5">
                  <n.icon size={18} className="text-slate-400" /> {n.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const { dark, set: setUi } = useUi()
  const writable = useSession((x) => !x.server || x.user?.role !== 'viewer')
  const { openWarga } = useEditor()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true) }
      if (e.key === 'Escape') setPalette(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="print-root min-h-screen lg:pl-64">
      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/70 bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/80 lg:flex">
        <Brand />
        <button onClick={() => setPalette(true)} className="mt-5 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition hover:border-violet-300 dark:border-white/10 dark:bg-white/5">
          <Search size={16} /> Cari cepat… <kbd className="ml-auto rounded bg-white px-1.5 text-[10px] text-slate-500 shadow dark:bg-white/10">Ctrl K</kbd>
        </button>
        <div className="mt-2 flex-1 overflow-y-auto"><NavList /></div>
        <button onClick={() => setUi({ dark: !dark })} className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
          {dark ? <Sun size={18} /> : <Moon size={18} />} {dark ? 'Mode terang' : 'Mode gelap'}
        </button>
        <div className="mt-1 px-1"><SyncBadge /></div>
        <UserBox />
      </aside>

      {/* Header mobile */}
      <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200/70 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-white/10 dark:bg-slate-900/80 lg:hidden">
        <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Menu"><Menu size={20} /></button>
        <div className="flex-1"><Brand /></div>
        <SyncBadge />
        <button onClick={() => setPalette(true)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Cari"><Search size={20} /></button>
        <button onClick={() => setUi({ dark: !dark })} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Tema">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
      </header>

      <AnimatePresence>
        {drawer && (
          <div className="no-print fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-4 dark:bg-slate-900">
              <div className="flex items-center justify-between"><Brand /><button onClick={() => setDrawer(false)} className="p-2"><X size={20} /></button></div>
              <div className="mt-4"><NavList onNav={() => setDrawer(false)} /></div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 items-end">
          {[NAV[0], NAV[1]].map((n) => <BottomItem key={n.to} {...n} />)}
          <div className="flex justify-center">
            {writable && <motion.button whileTap={{ scale: 0.9 }} onClick={() => openWarga()} className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-xl shadow-violet-500/40" aria-label="Tambah warga">
              <Plus size={26} />
            </motion.button>}
          </div>
          {[NAV[5], NAV[2]].map((n) => <BottomItem key={n.to} {...n} />)}
        </div>
      </nav>

      {/* FAB desktop */}
      {writable && <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => openWarga()}
        className="no-print fixed bottom-8 right-8 z-30 hidden items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 px-5 py-3.5 font-semibold text-white shadow-xl shadow-violet-500/40 lg:flex">
        <Plus size={20} /> Tambah Warga
      </motion.button>}

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  )
}

function BottomItem({ to, label, icon: I }: { to: string; label: string; icon: typeof Users }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-violet-600 dark:text-violet-300' : 'text-slate-500'}`}>
      {({ isActive }) => (
        <>
          <motion.span animate={{ scale: isActive ? 1.15 : 1 }}><I size={22} /></motion.span>
          {label.split(' ')[0]}
        </>
      )}
    </NavLink>
  )
}
