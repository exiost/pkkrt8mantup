import { AnimatePresence, motion } from 'framer-motion'
import { X, Search, Inbox, type LucideIcon } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/* ---------- palet warna (kelas statis agar terbaca Tailwind) ---------- */
export const C: Record<string, { bg: string; text: string; soft: string; ring: string; grad: string; dot: string; banner: string; wash: string }> = {
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700 dark:text-indigo-300', soft: 'bg-indigo-50 dark:bg-indigo-500/15', ring: 'ring-indigo-200 dark:ring-indigo-500/30', grad: 'from-indigo-500 to-violet-500', dot: 'bg-indigo-500', banner: 'from-indigo-600 via-violet-600 to-purple-600', wash: 'from-indigo-50/80 via-white to-white dark:from-indigo-500/10 dark:via-slate-900 dark:to-slate-900' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-700 dark:text-violet-300', soft: 'bg-violet-50 dark:bg-violet-500/15', ring: 'ring-violet-200 dark:ring-violet-500/30', grad: 'from-violet-500 to-purple-500', dot: 'bg-violet-500', banner: 'from-violet-600 via-purple-600 to-fuchsia-600', wash: 'from-violet-50/80 via-white to-white dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900' },
  fuchsia: { bg: 'bg-fuchsia-600', text: 'text-fuchsia-700 dark:text-fuchsia-300', soft: 'bg-fuchsia-50 dark:bg-fuchsia-500/15', ring: 'ring-fuchsia-200 dark:ring-fuchsia-500/30', grad: 'from-fuchsia-500 to-pink-500', dot: 'bg-fuchsia-500', banner: 'from-fuchsia-600 via-pink-500 to-rose-500', wash: 'from-fuchsia-50/80 via-white to-white dark:from-fuchsia-500/10 dark:via-slate-900 dark:to-slate-900' },
  pink: { bg: 'bg-pink-600', text: 'text-pink-700 dark:text-pink-300', soft: 'bg-pink-50 dark:bg-pink-500/15', ring: 'ring-pink-200 dark:ring-pink-500/30', grad: 'from-pink-500 to-rose-500', dot: 'bg-pink-500', banner: 'from-pink-500 via-rose-500 to-orange-400', wash: 'from-pink-50/80 via-white to-white dark:from-pink-500/10 dark:via-slate-900 dark:to-slate-900' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-700 dark:text-rose-300', soft: 'bg-rose-50 dark:bg-rose-500/15', ring: 'ring-rose-200 dark:ring-rose-500/30', grad: 'from-rose-500 to-red-500', dot: 'bg-rose-500', banner: 'from-rose-600 via-red-500 to-orange-500', wash: 'from-rose-50/80 via-white to-white dark:from-rose-500/10 dark:via-slate-900 dark:to-slate-900' },
  red: { bg: 'bg-red-600', text: 'text-red-700 dark:text-red-300', soft: 'bg-red-50 dark:bg-red-500/15', ring: 'ring-red-200 dark:ring-red-500/30', grad: 'from-red-500 to-orange-500', dot: 'bg-red-500', banner: 'from-red-600 via-rose-500 to-pink-500', wash: 'from-red-50/80 via-white to-white dark:from-red-500/10 dark:via-slate-900 dark:to-slate-900' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', soft: 'bg-orange-50 dark:bg-orange-500/15', ring: 'ring-orange-200 dark:ring-orange-500/30', grad: 'from-orange-500 to-amber-500', dot: 'bg-orange-500', banner: 'from-orange-500 via-orange-500 to-amber-500', wash: 'from-orange-50/80 via-white to-white dark:from-orange-500/10 dark:via-slate-900 dark:to-slate-900' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', soft: 'bg-amber-50 dark:bg-amber-500/15', ring: 'ring-amber-200 dark:ring-amber-500/30', grad: 'from-amber-400 to-orange-500', dot: 'bg-amber-500', banner: 'from-amber-500 via-orange-500 to-red-400', wash: 'from-amber-50/80 via-white to-white dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-900' },
  lime: { bg: 'bg-lime-600', text: 'text-lime-700 dark:text-lime-300', soft: 'bg-lime-50 dark:bg-lime-500/15', ring: 'ring-lime-200 dark:ring-lime-500/30', grad: 'from-lime-500 to-green-500', dot: 'bg-lime-500', banner: 'from-lime-500 via-green-500 to-emerald-500', wash: 'from-lime-50/80 via-white to-white dark:from-lime-500/10 dark:via-slate-900 dark:to-slate-900' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-300', soft: 'bg-emerald-50 dark:bg-emerald-500/15', ring: 'ring-emerald-200 dark:ring-emerald-500/30', grad: 'from-emerald-500 to-teal-500', dot: 'bg-emerald-500', banner: 'from-emerald-600 via-teal-500 to-cyan-500', wash: 'from-emerald-50/80 via-white to-white dark:from-emerald-500/10 dark:via-slate-900 dark:to-slate-900' },
  teal: { bg: 'bg-teal-600', text: 'text-teal-700 dark:text-teal-300', soft: 'bg-teal-50 dark:bg-teal-500/15', ring: 'ring-teal-200 dark:ring-teal-500/30', grad: 'from-teal-500 to-cyan-500', dot: 'bg-teal-500', banner: 'from-teal-600 via-cyan-500 to-sky-500', wash: 'from-teal-50/80 via-white to-white dark:from-teal-500/10 dark:via-slate-900 dark:to-slate-900' },
  cyan: { bg: 'bg-cyan-600', text: 'text-cyan-700 dark:text-cyan-300', soft: 'bg-cyan-50 dark:bg-cyan-500/15', ring: 'ring-cyan-200 dark:ring-cyan-500/30', grad: 'from-cyan-500 to-sky-500', dot: 'bg-cyan-500', banner: 'from-cyan-600 via-sky-500 to-blue-500', wash: 'from-cyan-50/80 via-white to-white dark:from-cyan-500/10 dark:via-slate-900 dark:to-slate-900' },
  sky: { bg: 'bg-sky-600', text: 'text-sky-700 dark:text-sky-300', soft: 'bg-sky-50 dark:bg-sky-500/15', ring: 'ring-sky-200 dark:ring-sky-500/30', grad: 'from-sky-500 to-blue-500', dot: 'bg-sky-500', banner: 'from-sky-500 via-blue-500 to-indigo-500', wash: 'from-sky-50/80 via-white to-white dark:from-sky-500/10 dark:via-slate-900 dark:to-slate-900' },
  slate: { bg: 'bg-slate-600', text: 'text-slate-700 dark:text-slate-300', soft: 'bg-slate-100 dark:bg-slate-500/15', ring: 'ring-slate-200 dark:ring-slate-500/30', grad: 'from-slate-500 to-slate-700', dot: 'bg-slate-500', banner: 'from-slate-600 via-slate-500 to-zinc-500', wash: 'from-slate-50/80 via-white to-white dark:from-slate-500/10 dark:via-slate-900 dark:to-slate-900' },
}
export const col = (c?: string) => C[c ?? 'indigo'] ?? C.indigo

type Icon = LucideIcon

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline'
export function Button({
  children, variant = 'primary', icon: I, className = '', size = 'md', ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: Icon; size?: 'sm' | 'md' }) {
  const v = {
    primary: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/30 hover:-translate-y-px hover:shadow-lg hover:shadow-fuchsia-500/30',
    soft: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 ring-1 ring-violet-200/70 hover:from-violet-100 hover:to-fuchsia-100 dark:from-violet-500/15 dark:to-fuchsia-500/15 dark:text-violet-200 dark:ring-violet-500/30',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
    danger: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-red-500/25',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
  }[variant]
  const s = size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : 'h-10 px-4 text-sm gap-2'
  return (
    <button
      {...p}
      className={`${variant === 'primary' || variant === 'danger' ? 'shine ' : ''}relative inline-flex select-none items-center justify-center rounded-xl font-semibold transition active:scale-[0.97] disabled:opacity-50 ${s} ${v} ${className}`}
    >
      {I && <I size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

export function IconBtn({ icon: I, label, className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon; label: string }) {
  return (
    <button {...p} title={label} aria-label={label} className={`grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95 dark:hover:bg-white/10 dark:text-slate-300 ${className}`}>
      <I size={18} />
    </button>
  )
}

/* ---------- Card ---------- */
export function Card({ children, className = '', tone, shine, ...p }: React.HTMLAttributes<HTMLDivElement> & { tone?: string; shine?: boolean }) {
  const c = tone ? col(tone) : null
  const sh = shine ?? !!tone
  return (
    <div {...p} className={`relative rounded-2xl border bg-gradient-to-br shadow-sm ${c ? `${c.wash} border-transparent ring-1 ${c.ring}` : 'border-slate-200/70 from-white to-slate-50/60 dark:border-white/10 dark:from-slate-900 dark:to-slate-900'} ${sh ? 'shine transition duration-300 hover:-translate-y-0.5 hover:shadow-xl' : ''} ${className}`}>
      {c && <span aria-hidden className={`pointer-events-none absolute inset-x-4 top-0 h-1 rounded-b-full bg-gradient-to-r ${c.banner}`} />}
      {children}
    </div>
  )
}

/* ---------- Chip / Tag ---------- */
export function Chip({ children, color = 'slate', icon: I, pulse, className = '' }: { children: ReactNode; color?: string; icon?: Icon; pulse?: boolean; className?: string }) {
  const c = col(color)
  return (
    <span className={`chip inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r px-2 py-0.5 text-[11px] font-semibold ring-1 ${c.soft} ${c.text} ${c.ring} ${className}`}>
      {pulse && <span className={`h-1.5 w-1.5 animate-ping rounded-full ${c.dot}`} />}
      {I && <I size={11} />}
      {children}
    </span>
  )
}

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, icon: I, color = 'violet', actions }: { title: string; subtitle?: string; icon: Icon; color?: string; actions?: ReactNode }) {
  const c = col(color)
  return (
    <div className={`no-print relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-r p-4 text-white shadow-lg sm:p-5 ${c.banner}`}>
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15 blur-sm" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />
      <I aria-hidden size={120} className="pointer-events-none absolute -right-4 -bottom-6 rotate-12 text-white/10" />
      <div className="relative flex flex-wrap items-center gap-3">
        <motion.div initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/40 backdrop-blur">
          <I size={24} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-extrabold tracking-tight drop-shadow-sm sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-white/85">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/* ---------- Stat card ---------- */
export function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const dur = 700
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{n.toLocaleString('id-ID')}</>
}

export function StatCard({ label, value, icon: I, color = 'indigo', hint, onClick, i = 0 }: { label: string; value: number; icon: Icon; color?: string; hint?: string; onClick?: () => void; i?: number }) {
  const c = col(color)
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      whileHover={{ y: -4 }}
      className={`shine group relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-md transition hover:shadow-xl ${c.banner}`}
    >
      <I aria-hidden size={84} className="pointer-events-none absolute -right-3 -top-3 rotate-12 text-white/15 transition duration-500 group-hover:rotate-0 group-hover:scale-110" />
      <div className="relative mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/20 ring-1 ring-white/40 backdrop-blur">
        <I size={20} />
      </div>
      <div className="relative font-display text-3xl font-extrabold leading-none drop-shadow-sm">
        <CountUp value={value} />
      </div>
      <div className="relative mt-1 text-xs font-semibold text-white/90">{label}</div>
      {hint && <div className="relative mt-1 text-[11px] font-semibold text-white/80">{hint}</div>}
    </motion.button>
  )
}

/* ---------- Modal & Drawer ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md', icon: I, color = 'violet' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; icon?: Icon; color?: string }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl', full: 'sm:max-w-[95vw]' }[size]
  const c = col(color)
  return (
    <AnimatePresence>
      {open && (
        <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl ${w}`}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
              {I && (
                <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white ${c.grad}`}>
                  <I size={18} />
                </div>
              )}
              <h2 className="flex-1 font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
              <IconBtn icon={X} label="Tutup" onClick={onClose} />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-white/10 dark:bg-white/5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Confirm ---------- */
type ConfirmOpts = { title: string; message: ReactNode; okText?: string; danger?: boolean }
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<(ConfirmOpts & { resolve: (b: boolean) => void }) | null>(null)
  const ask = (o: ConfirmOpts) => new Promise<boolean>((resolve) => setSt({ ...o, resolve }))
  const close = (b: boolean) => {
    st?.resolve(b)
    setSt(null)
  }
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={!!st} onClose={() => close(false)} title={st?.title ?? ''} size="sm" color={st?.danger ? 'red' : 'violet'}
        footer={<><Button variant="ghost" onClick={() => close(false)}>Batal</Button><Button variant={st?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{st?.okText ?? 'Ya'}</Button></>}>
        <div className="text-sm text-slate-600 dark:text-slate-300">{st?.message}</div>
      </Modal>
    </ConfirmCtx.Provider>
  )
}

/* ---------- Form fields ---------- */
const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100'

export function Field({ label, children, hint, error, className = '' }: { label: string; children: ReactNode; hint?: string; error?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${inputCls} ${p.className ?? ''}`} />
}

export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`${inputCls} h-auto min-h-[72px] py-2 ${p.className ?? ''}`} />
}

export function Select({ options, value, onChange, placeholder = '— pilih —', allowCustom = false, className = '' }: { options: string[]; value: string; onChange: (v: string) => void; placeholder?: string; allowCustom?: boolean; className?: string }) {
  const opts = value && !options.includes(value) ? [value, ...options] : options
  const [custom, setCustom] = useState(false)
  if (custom) return <Input autoFocus value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setCustom(false)} placeholder="Ketik nilai lain…" />
  return (
    <select
      value={value}
      onChange={(e) => (e.target.value === '__lain' ? setCustom(true) : onChange(e.target.value))}
      className={`${inputCls} ${className}`}
    >
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
      {allowCustom && <option value="__lain">✏️ Lainnya (ketik)…</option>}
    </select>
  )
}

/** Isian Ya / Tidak / (belum diisi) seperti di Excel */
export function YesNo({ value, onChange, label }: { value: 'Ya' | 'Tidak' | ''; onChange: (v: 'Ya' | 'Tidak' | '') => void; label: string }) {
  const opts: ['Ya' | 'Tidak' | '', string][] = [['Ya', 'Ya'], ['Tidak', 'Tidak'], ['', '–']]
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-white/5">
      <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{label}</span>
      <div className="inline-flex shrink-0 rounded-lg bg-white p-0.5 shadow-sm dark:bg-slate-800">
        {opts.map(([v, l]) => (
          <button key={l} type="button" onClick={() => onChange(v)} title={v === '' ? 'Belum diisi' : l}
            className={`min-w-[2.25rem] rounded-md px-2 py-1 text-xs font-semibold transition ${value === v ? (v === 'Ya' ? 'bg-emerald-500 text-white' : v === 'Tidak' ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white') : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}>{l}</button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-left text-sm text-slate-700 dark:text-slate-200">
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ease-out ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      {label && <span>{label}</span>}
    </button>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: Icon }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? 'text-violet-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join()}`} className="absolute inset-0 rounded-lg bg-white shadow dark:bg-violet-600" />}
          <span className="relative flex items-center gap-1.5">{o.icon && <o.icon size={14} />}{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Cari…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pl-9`} />
      {value && (
        <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700" onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export function Empty({ title, desc, icon: I = Inbox, action }: { title: string; desc?: string; icon?: Icon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-100 to-pink-100 text-violet-500 dark:from-violet-500/20 dark:to-pink-500/20">
        <I size={36} />
      </motion.div>
      <h3 className="font-display text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-sm text-slate-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Avatar({ nama, jk }: { nama: string; jk: 'L' | 'P' }) {
  const ini = nama.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
  return (
    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow ring-2 ring-white dark:ring-slate-800 ${jk === 'P' ? 'from-pink-400 to-fuchsia-500' : 'from-sky-400 to-indigo-500'}`}>
      {ini || '?'}
    </div>
  )
}

export function Section({ title, icon: I, color = 'violet', children, actions }: { title: string; icon?: Icon; color?: string; children: ReactNode; actions?: ReactNode }) {
  const c = col(color)
  return (
    <Card tone={color} shine={false} className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        {I && <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow ${c.grad}`}><I size={16} /></span>}
        <h3 className="flex-1 font-display text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
        {actions}
      </div>
      {children}
    </Card>
  )
}
