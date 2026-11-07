import { create } from 'zustand'
import { toast } from 'sonner'
import type { AppUser, Collections } from './types'
import { api, ApiError, getBase, getToken, probe, setBase, setRT, setToken } from './api'
import { DEFAULT_SETTINGS, setGuardHook, setPersistMode, setSyncHook, useStore, type Op } from './store'
import type { AuditEntry, Settings } from './types'

export type Boot = 'checking' | 'local' | 'setup' | 'login' | 'ready' | 'error'
export type SyncState = 'idle' | 'saving' | 'error'

interface Session {
  boot: Boot
  server: boolean
  user: AppUser | null
  sync: SyncState
  pending: number
  lastSync: string | null
  error: string
  /** sedang tanpa internet: memakai salinan data terakhir, perubahan dikirim saat online lagi */
  offline: boolean
  /** RT yang sedang dibuka ("08") */
  rt: string
  /** daftar semua RT (untuk Admin Desa) */
  rts: string[]
  /** Admin Desa: pindah ke RT lain */
  pilihRT: (rt: string) => Promise<boolean>
  /** ambil ulang seluruh data RT ini dari server */
  muatUlang: () => Promise<void>
  start: () => Promise<void>
  setup: (username: string, password: string, name: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  useLocal: () => void
}

interface DataResp { seq: number; rt?: string; full: boolean; collections: Partial<Collections> & { audit: AuditEntry[] }; settings: Settings | null }

const QKEY = 'siwarga-queue'
const CKEY = 'siwarga-cache'
interface Cache { uid: string; rt: string; user: AppUser; rts: string[]; seq: number; waktu: string; data: Partial<Collections>; settings: Settings; audit: AuditEntry[] }
const readCache = (): Cache | null => { try { return JSON.parse(localStorage.getItem(CKEY) ?? 'null') } catch { return null } }
const clearCache = () => { try { localStorage.removeItem(CKEY) } catch { /* abaikan */ } }
let cacheTimer: ReturnType<typeof setTimeout> | null = null
let unsubCache: (() => void) | null = null
let online: ReturnType<typeof setInterval> | null = null
let queue: Op[] = []
let seq = 0
let timer: ReturnType<typeof setTimeout> | null = null
let poll: ReturnType<typeof setInterval> | null = null
let backoff = 0
let flushing = false

const loadQueue = () => { try { queue = JSON.parse(localStorage.getItem(QKEY) ?? '[]') } catch { queue = [] } }
const SKEY = 'siwarga-queue-sejak'
const saveQueue = () => {
  try {
    if (queue.length) {
      localStorage.setItem(QKEY, JSON.stringify(queue))
      if (!localStorage.getItem(SKEY)) localStorage.setItem(SKEY, new Date().toISOString())
    } else { localStorage.removeItem(QKEY); localStorage.removeItem(SKEY) }
  } catch { /* penuh */ }
}
/** sejak kapan ada perubahan yang belum terkirim ke server (null = tidak ada) */
export const pendingSejak = (): string | null => { try { return localStorage.getItem(SKEY) } catch { return null } }

/** minta browser tidak menghapus data aplikasi ini otomatis saat memori HP hampir penuh */
export async function mintaPenyimpananTetap(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch { return false }
}

function coalesce(ops: Op[]): Op[] {
  const last = new Map<string, number>()
  ops.forEach((o, i) => { if (o.t === 'put') last.set(`${o.k}:${o.rec.id}`, i); else if (o.t === 'del') last.set(`${o.k}:${o.id}`, i) })
  return ops.filter((o, i) => (o.t === 'put' ? last.get(`${o.k}:${o.rec.id}`) === i : o.t === 'del' ? last.get(`${o.k}:${o.id}`) === i : true))
}

export const useSession = create<Session>()((set, get) => {
  const setSync = (sync: SyncState, extra: Partial<Session> = {}) => set({ sync, pending: queue.length, ...extra })

  async function flush() {
    if (flushing || !queue.length || !get().server) return
    flushing = true
    try {
      while (queue.length) {
        queue = coalesce(queue)
        const batch = queue.slice(0, 400)
        setSync('saving')
        try {
          const r = await api<{ seq: number; conflicts: { k: keyof Collections; rec: { id: string; updatedAt: string } }[] }>('/ops', { method: 'POST', body: { ops: batch } })
          queue = queue.slice(batch.length)
          saveQueue()
          backoff = 0
          if (r.conflicts?.length) {
            const byColl: Partial<Record<keyof Collections, unknown[]>> = {}
            r.conflicts.forEach((c) => { (byColl[c.k] ??= []).push(c.rec) })
            useStore.getState().muatDariServer(byColl as Partial<Collections>, null, [], false)
          }
        } catch (e) {
          const err = e as ApiError
          if (err.status === 401) { get().logout(); return }
          if (err.status === 400 || err.status === 403 || err.status === 413) {
            // ditolak server: buang paket ini, ambil ulang data server agar tampilan sama
            queue = queue.slice(batch.length)
            saveQueue()
            toast.error(err.message)
            void pull(true)
            continue
          }
          setSync('error', { error: err.message })
          backoff = Math.min(60000, (backoff || 2000) * 2)
          schedule(backoff)
          return
        }
      }
      setSync('idle', { lastSync: new Date().toISOString(), error: '' })
    } finally {
      flushing = false
    }
  }

  function schedule(ms = 400) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; void flush() }, ms)
  }

  async function pull(full = false) {
    if (!get().server) return
    if (queue.length && !full) return // jangan menimpa perubahan yang belum terkirim
    try {
      const d = await api<DataResp>(`/data${full || !seq ? '' : `?since=${seq}`}`)
      const { audit, ...cols } = d.collections
      // RT yang belum punya pengaturan: pakai bawaan dengan nama RT-nya sendiri
      const settings = d.settings ?? (d.full && d.rt ? { ...DEFAULT_SETTINGS, rt: `RT ${d.rt}` } : null)
      useStore.getState().muatDariServer(cols, settings, audit ?? [], d.full)
      if (d.rt) set({ rt: d.rt })
      if (get().offline) set({ offline: false })
      seq = d.seq
      set({ lastSync: new Date().toISOString() })
    } catch (e) {
      if ((e as ApiError).status === 401) get().logout()
    }
  }

  /** simpan salinan data RT ini di perangkat (agar aplikasi tetap bisa dibuka tanpa internet) */
  function saveCache() {
    if (cacheTimer) clearTimeout(cacheTimer)
    cacheTimer = setTimeout(() => {
      const { user, rt, rts } = get()
      if (!user || !rt) return
      const st = useStore.getState()
      const data: Partial<Collections> = {}
      for (const k of ['warga', 'keluarga', 'kelahiran', 'kematian', 'pesertaKB', 'pusBaru', 'dasawisma', 'tags', 'kampungKB'] as const) (data as Record<string, unknown>)[k] = st[k]
      const c: Cache = { uid: user.id, rt, user, rts, seq, waktu: new Date().toISOString(), data, settings: st.settings, audit: st.audit.slice(0, 100) }
      try { localStorage.setItem(CKEY, JSON.stringify(c)) } catch { /* memori penuh: lewati */ }
    }, 1500)
  }
  function watchCache() {
    unsubCache?.()
    unsubCache = useStore.subscribe(() => saveCache())
  }
  /** cek internet berkala; begitu server terjangkau lagi, kirim antrian & ambil data terbaru */
  function watchOnline() {
    if (online) clearInterval(online)
    online = setInterval(async () => {
      if (!get().offline) { if (online) clearInterval(online); online = null; return }
      const p = await probe()
      if (!p) return
      try {
        const me = await api<{ user: AppUser; rts: string[]; rt: string }>('/me')
        set({ offline: false, user: me.user, rts: me.rts })
        toast.success('Kembali online — perubahan dikirim ke server')
        await flush()
        await pull(true)
      } catch (e) { if ((e as ApiError).status === 401) get().logout() }
    }, 15000)
  }
  /** masuk tanpa internet memakai salinan terakhir di perangkat ini */
  function enterOffline(c: Cache) {
    if (c.user.desa) setRT(c.rt)
    set({ user: c.user, boot: 'ready', server: true, offline: true, error: '', rt: c.rt, rts: c.rts })
    setPersistMode('server')
    loadQueue()
    seq = c.seq
    setGuard()
    useStore.getState().muatDariServer(c.data, c.settings, c.audit ?? [], true)
    setSyncHook((ops) => { queue.push(...ops); saveQueue(); set({ pending: queue.length }); schedule() })
    set({ pending: queue.length })
    watchCache()
    watchOnline()
    void mintaPenyimpananTetap()
    window.addEventListener('online', () => { void (async () => { if (get().offline && (await probe())) { set({ offline: false }); await flush(); await pull(true) } })() })
  }
  function setGuard() {
    setGuardHook((level) => {
      const role = get().user?.role
      const ok = level === 'admin' ? role === 'admin' : role === 'admin' || role === 'editor'
      if (!ok) toast.error(level === 'admin' ? 'Hanya admin yang boleh melakukan ini' : 'Akun Anda hanya bisa melihat data')
      return ok
    })
  }

  async function enter(user: AppUser, info?: { rts?: string[]; rt?: string }) {
    if (!user.desa) setRT('')
    const c = readCache()
    if (c && (c.uid !== user.id || c.rt !== (info?.rt ?? user.rt))) clearCache()
    set({ user, boot: 'ready', server: true, offline: false, error: '', rt: info?.rt ?? user.rt ?? '', rts: info?.rts ?? [] })
    setPersistMode('server')
    loadQueue()
    seq = 0
    setGuard()
    await pull(true)
    watchCache()
    saveCache()
    void mintaPenyimpananTetap()
    setSyncHook((ops) => { queue.push(...ops); saveQueue(); set({ pending: queue.length }); schedule() })
    if (queue.length) schedule(200)
    if (poll) clearInterval(poll)
    poll = setInterval(() => { if (document.visibilityState === 'visible') void pull() }, 15000)
  }

  /** sesudah login/setup: ambil daftar RT & RT aktif dari server */
  async function enterFresh(user: AppUser) {
    if (!user.desa) setRT('')
    try { const me = await api<{ user: AppUser; rts: string[]; rt: string }>('/me'); await enter(me.user, me) } catch { await enter(user) }
  }

  return {
    boot: 'checking', server: false, user: null, sync: 'idle', pending: 0, lastSync: null, error: '', rt: '', rts: [], offline: false,

    muatUlang: async () => { await pull(true) },

    pilihRT: async (rt) => {
      if (!get().user?.desa || rt === get().rt) return false
      if (get().offline) { toast.error('Sedang offline: pindah RT bisa dilakukan setelah tersambung internet'); return false }
      if (queue.length) { toast.error('Tunggu sebentar, masih ada perubahan yang belum terkirim ke server'); void flush(); return false }
      setRT(rt)
      seq = 0
      useStore.setState({ warga: [], keluarga: [], kelahiran: [], kematian: [], pesertaKB: [], pusBaru: [], dasawisma: [], tags: [], kampungKB: [], arsip: [], audit: [] })
      set({ rt })
      await pull(true)
      toast.success(`Sekarang membuka data RT ${rt}`)
      return true
    },

    start: async () => {
      set({ boot: 'checking', error: '' })
      const p = await probe()
      if (!p) {
        // pernah login di perangkat ini: buka salinan terakhir (tanpa internet)
        const c = getToken() ? readCache() : null
        if (c) { enterOffline(c); return }
        if (getBase()) { set({ boot: 'error', error: `Tidak bisa terhubung ke server ${getBase()}` }); return }
        get().useLocal()
        return
      }
      if (p.needsSetup) { set({ boot: 'setup', server: true }); return }
      if (getToken()) {
        try {
          const me = await api<{ user: AppUser; rts: string[]; rt: string }>('/me')
          await enter(me.user, me)
          return
        } catch (e) {
          if ((e as ApiError).status === 0) {
            const c = readCache()
            if (c) { enterOffline(c); return }
            set({ boot: 'error', error: 'Tidak bisa terhubung ke server' }); return
          }
          setToken(null)
        }
      }
      set({ boot: 'login', server: true })
    },

    setup: async (username, password, name) => {
      const r = await api<{ token: string; user: AppUser }>('/setup', { method: 'POST', body: { username, password, name }, auth: false })
      setToken(r.token)
      await enterFresh(r.user)
    },

    login: async (username, password) => {
      const r = await api<{ token: string; user: AppUser }>('/login', { method: 'POST', body: { username, password }, auth: false })
      setToken(r.token)
      await enterFresh(r.user)
    },

    logout: () => {
      if (get().offline && queue.length) { toast.error(`Masih ada ${queue.length} perubahan yang belum terkirim. Keluar setelah tersambung internet agar tidak hilang.`); return }
      setToken(null)
      setSyncHook(null)
      setGuardHook(null)
      if (poll) clearInterval(poll)
      if (timer) clearTimeout(timer)
      queue = []
      saveQueue()
      setRT('')
      clearCache()
      unsubCache?.(); unsubCache = null
      useStore.setState({ warga: [], keluarga: [], kelahiran: [], kematian: [], pesertaKB: [], pusBaru: [], dasawisma: [], tags: [], kampungKB: [], arsip: [], audit: [] })
      set({ user: null, boot: 'login', sync: 'idle', pending: 0, rt: '', rts: [], offline: false })
    },

    useLocal: () => {
      setBase('')
      setSyncHook(null)
      setGuardHook(null)
      setPersistMode('local')
      void mintaPenyimpananTetap()
      void useStore.persist.rehydrate()
      set({ boot: 'local', server: false, user: null })
    },
  }
})

export const isAdmin = () => useSession.getState().user?.role === 'admin'
export const canWrite = () => {
  const s = useSession.getState()
  return !s.server || s.user?.role === 'admin' || s.user?.role === 'editor'
}
