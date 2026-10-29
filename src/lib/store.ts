import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuditEntry, CollectionName, Collections, Settings } from './types'
import { DEFAULT_PILIHAN } from './options'
import { uid } from './format'
import { blankKeluarga } from './factories'

type Rec<K extends CollectionName> = Collections[K][number]
type NewRec<K extends CollectionName> = Omit<Rec<K>, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export const DEFAULT_SETTINGS: Settings = {
  rt: 'RT 08',
  rw: '-',
  padukuhan: 'Mantup',
  kalurahan: 'Baturetno',
  kapanewon: 'Banguntapan',
  kabupaten: 'Bantul',
  provinsi: 'DIY',
  ketuaPKK: '',
  sekretaris: '',
  tempatTTD: 'Baturetno',
  umurBalita: 5,
  umurLansia: 60,
  pilihan: DEFAULT_PILIHAN,
  reduceMotion: false,
  dark: false,
}

const now = () => new Date().toISOString()

const emptyCollections = (): Collections => ({
  warga: [],
  keluarga: [],
  kelahiran: [],
  kematian: [],
  pesertaKB: [],
  dasawisma: [
    { id: 'dw1', nama: 'Drupadi I', ketua: '', warna: 'teal', createdAt: now(), updatedAt: now() },
    { id: 'dw2', nama: 'Drupadi II', ketua: '', warna: 'orange', createdAt: now(), updatedAt: now() },
  ],
  tags: [],
  kampungKB: [],
  arsip: [],
})

interface State extends Collections {
  settings: Settings
  audit: AuditEntry[]
  create: <K extends CollectionName>(k: K, rec: NewRec<K>, label?: string) => Rec<K>
  update: <K extends CollectionName>(k: K, id: string, patch: Partial<Rec<K>>, label?: string) => void
  remove: <K extends CollectionName>(k: K, id: string, label?: string) => void
  restore: <K extends CollectionName>(k: K, id: string, label?: string) => void
  purge: <K extends CollectionName>(k: K, id: string, label?: string) => void
  bulkUpdate: <K extends CollectionName>(k: K, ids: string[], patch: Partial<Rec<K>>) => void
  setSettings: (p: Partial<Settings>) => void
  replaceAll: (c: Partial<Collections>, settings?: Settings) => void
  ensureKeluarga: (noKK: string, dasawisma: string) => void
  resetAll: () => void
}

function log(set: (fn: (s: State) => Partial<State>) => void, koleksi: string, recordId: string, aksi: AuditEntry['aksi'], label = '') {
  set((s) => ({ audit: [{ id: uid(), waktu: now(), koleksi, recordId, aksi, label }, ...s.audit].slice(0, 2000) }))
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...emptyCollections(),
      settings: DEFAULT_SETTINGS,
      audit: [],
      create: (k, rec, label) => {
        const r = { ...rec, id: rec.id ?? uid(), createdAt: now(), updatedAt: now(), deletedAt: null } as unknown as Rec<typeof k>
        set((s) => ({ [k]: [...(s[k] as unknown[]), r] }) as Partial<State>)
        log(set, k, r.id, 'Tambah', label)
        return r
      },
      update: (k, id, patch, label) => {
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)) }) as Partial<State>)
        log(set, k, id, 'Ubah', label)
      },
      remove: (k, id, label) => {
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).map((r) => (r.id === id ? { ...r, deletedAt: now() } : r)) }) as Partial<State>)
        log(set, k, id, 'Hapus', label)
      },
      restore: (k, id, label) => {
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).map((r) => (r.id === id ? { ...r, deletedAt: null } : r)) }) as Partial<State>)
        log(set, k, id, 'Pulihkan', label)
      },
      purge: (k, id, label) => {
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).filter((r) => r.id !== id) }) as Partial<State>)
        log(set, k, id, 'Hapus Permanen', label)
      },
      bulkUpdate: (k, ids, patch) => {
        const set_ = new Set(ids)
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).map((r) => (set_.has(r.id) ? { ...r, ...patch, updatedAt: now() } : r)) }) as Partial<State>)
        log(set, k, ids.join(','), 'Ubah', `${ids.length} data (massal)`)
      },
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      replaceAll: (c, settings) => set((s) => ({ ...s, ...c, ...(settings ? { settings } : {}) })),
      ensureKeluarga: (noKK, dasawisma) => {
        if (!noKK) return
        if (get().keluarga.some((k) => k.noKK === noKK && !k.deletedAt)) return
        get().create('keluarga', { ...blankKeluarga(), noKK, dasawisma }, `KK ${noKK}`)
      },
      resetAll: () => set({ ...emptyCollections(), audit: [] }),
    }),
    {
      name: 'siwarga-pkk-rt08',
      version: 1,
      merge: (persisted, current) => {
        const p = persisted as Partial<State>
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p?.settings ?? {}), pilihan: { ...DEFAULT_PILIHAN, ...(p?.settings?.pilihan ?? {}) } } }
      },
    },
  ),
)

/** Hook praktis: daftar yang belum dihapus */
export function useLive<K extends CollectionName>(k: K): Collections[K] {
  const list = useStore((s) => s[k])
  return (list as Rec<K>[]).filter((r) => !r.deletedAt) as Collections[K]
}
