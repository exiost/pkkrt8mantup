import { create } from 'zustand'
import { toast } from 'sonner'
import type { AppUser, Collections } from './types'
import { api, ApiError, getBase, getToken, probe, setBase, setToken } from './api'
import { setGuardHook, setPersistMode, setSyncHook, useStore, type Op } from './store'
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
  start: () => Promise<void>
  setup: (username: string, password: string, name: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  useLocal: () => void
}

interface DataResp { seq: number; full: boolean; collections: Partial<Collections> & { audit: AuditEntry[] }; settings: Settings | null }

const QKEY = 'siwarga-queue'
let queue: Op[] = []
let seq = 0
let timer: ReturnType<typeof setTimeout> | null = null
let poll: ReturnType<typeof setInterval> | null = null
let backoff = 0
let flushing = false

const loadQueue = () => { try { queue = JSON.parse(localStorage.getItem(QKEY) ?? '[]') } catch { queue = [] } }
const saveQueue = () => { try { queue.length ? localStorage.setItem(QKEY, JSON.stringify(queue)) : localStorage.removeItem(QKEY) } catch { /* penuh */ } }

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
      useStore.getState().muatDariServer(cols, d.settings, audit ?? [], d.full)
      seq = d.seq
      set({ lastSync: new Date().toISOString() })
    } catch (e) {
      if ((e as ApiError).status === 401) get().logout()
    }
  }

  async function enter(user: AppUser) {
    set({ user, boot: 'ready', server: true, error: '' })
    setPersistMode('server')
    loadQueue()
    seq = 0
    setGuardHook((level) => {
      const role = get().user?.role
      const ok = level === 'admin' ? role === 'admin' : role === 'admin' || role === 'editor'
      if (!ok) toast.error(level === 'admin' ? 'Hanya admin yang boleh melakukan ini' : 'Akun Anda hanya bisa melihat data')
      return ok
    })
    await pull(true)
    setSyncHook((ops) => { queue.push(...ops); saveQueue(); set({ pending: queue.length }); schedule() })
    if (queue.length) schedule(200)
    if (poll) clearInterval(poll)
    poll = setInterval(() => { if (document.visibilityState === 'visible') void pull() }, 15000)
  }

  return {
    boot: 'checking', server: false, user: null, sync: 'idle', pending: 0, lastSync: null, error: '',

    start: async () => {
      set({ boot: 'checking', error: '' })
      const p = await probe()
      if (!p) {
        if (getBase()) { set({ boot: 'error', error: `Tidak bisa terhubung ke server ${getBase()}` }); return }
        get().useLocal()
        return
      }
      if (p.needsSetup) { set({ boot: 'setup', server: true }); return }
      if (getToken()) {
        try {
          const me = await api<{ user: AppUser }>('/me')
          await enter(me.user)
          return
        } catch (e) {
          if ((e as ApiError).status === 0) { set({ boot: 'error', error: 'Tidak bisa terhubung ke server' }); return }
          setToken(null)
        }
      }
      set({ boot: 'login', server: true })
    },

    setup: async (username, password, name) => {
      const r = await api<{ token: string; user: AppUser }>('/setup', { method: 'POST', body: { username, password, name }, auth: false })
      setToken(r.token)
      await enter(r.user)
    },

    login: async (username, password) => {
      const r = await api<{ token: string; user: AppUser }>('/login', { method: 'POST', body: { username, password }, auth: false })
      setToken(r.token)
      await enter(r.user)
    },

    logout: () => {
      setToken(null)
      setSyncHook(null)
      setGuardHook(null)
      if (poll) clearInterval(poll)
      if (timer) clearTimeout(timer)
      queue = []
      saveQueue()
      useStore.setState({ warga: [], keluarga: [], kelahiran: [], kematian: [], pesertaKB: [], pusBaru: [], tags: [], kampungKB: [], arsip: [], audit: [] })
      set({ user: null, boot: 'login', sync: 'idle', pending: 0 })
    },

    useLocal: () => {
      setBase('')
      setSyncHook(null)
      setGuardHook(null)
      setPersistMode('local')
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
