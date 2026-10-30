import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { COLLECTION_NAMES, type AuditEntry, type CollectionName, type Collections, type Keluarga, type Settings, type Warga } from './types'
import { DEFAULT_PILIHAN } from './options'
import { uid } from './format'
import { blankKeluarga } from './factories'
import { selarasRiwayat } from './rules'

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
  umurBalita: 5,
  umurLansia: 50,
  pilihan: DEFAULT_PILIHAN,
  teks: {},
}

/* ---------- sinkronisasi ke server (jika mode server) ---------- */
export type Op =
  | { t: 'put'; k: CollectionName; rec: { id: string; updatedAt: string } }
  | { t: 'del'; k: CollectionName; id: string }
  | { t: 'settings'; settings: Settings }
  | { t: 'audit'; entry: AuditEntry }

let syncHook: ((ops: Op[]) => void) | null = null
export const setSyncHook = (f: ((ops: Op[]) => void) | null) => { syncHook = f }
const emit = (ops: Op[]) => { if (syncHook && ops.length) syncHook(ops) }

/** Pembatas hak akses (mode server): 'write' = ubah data, 'admin' = hapus permanen/pengaturan/impor */
let guardHook: ((level: 'write' | 'admin') => boolean) | null = null
export const setGuardHook = (f: ((level: 'write' | 'admin') => boolean) | null) => { guardHook = f }
const guard = (level: 'write' | 'admin' = 'write') => {
  if (guardHook && !guardHook(level)) throw new Error('Akun Anda tidak boleh melakukan ini')
}

/* ---------- penyimpanan browser: hanya di mode lokal ---------- */
let persistMode: 'pending' | 'local' | 'server' = 'pending'
export const setPersistMode = (m: 'pending' | 'local' | 'server') => { persistMode = m }
const guardedStorage: StateStorage = {
  getItem: (n) => { try { return persistMode === 'local' ? localStorage.getItem(n) : null } catch { return null } },
  setItem: (n, v) => { try { if (persistMode === 'local') localStorage.setItem(n, v) } catch { /* penuh/diblokir */ } },
  removeItem: (n) => { try { if (persistMode === 'local') localStorage.removeItem(n) } catch { /* abaikan */ } },
}

const now = () => new Date().toISOString()

const emptyCollections = (): Collections => ({
  warga: [],
  keluarga: [],
  kelahiran: [],
  kematian: [],
  pesertaKB: [],
  pusBaru: [],
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
  /** Tambah warga. Jika keluargaId kosong → buat keluarga baru (nomor urut berikutnya). */
  tambahWarga: (w: Omit<Warga, 'id' | 'createdAt' | 'updatedAt' | 'urut' | 'noReg'> & { urut?: number; noReg?: number }) => Warga
  /** Pindahkan warga ke keluarga lain (atau keluar: keluargaId kosong → keluarga baru). */
  pindahWarga: (id: string, keluargaId: string) => void
  keluargaBaru: (extra?: Partial<Keluarga>) => Keluarga
  /** Data dari server (tanpa memicu sinkronisasi balik) */
  muatDariServer: (c: Partial<Collections>, settings: Settings | null, audit: AuditEntry[], penuh: boolean) => void
  resetAll: () => void
}

const maxOf = (xs: number[]) => xs.reduce((a, b) => (b > a ? b : a), 0)

function log(set: (fn: (s: State) => Partial<State>) => void, koleksi: string, recordId: string, aksi: AuditEntry['aksi'], label = '') {
  const entry: AuditEntry = { id: uid(), waktu: now(), koleksi, recordId, aksi, label }
  set((s) => ({ audit: [entry, ...s.audit].slice(0, 2000) }))
  emit([{ t: 'audit', entry }])
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...emptyCollections(),
      settings: DEFAULT_SETTINGS,
      audit: [],
      create: (k, rec, label) => {
        guard()
        const r = { ...rec, id: rec.id ?? uid(), createdAt: now(), updatedAt: now(), deletedAt: null } as unknown as Rec<typeof k>
        set((s) => ({ [k]: [...(s[k] as unknown[]), r] }) as Partial<State>)
        emit([{ t: 'put', k, rec: r }])
        log(set, k, r.id, 'Tambah', label)
        return r
      },
      update: (k, id, patch, label) => {
        guard()
        let next: Rec<typeof k> | undefined
        set((s) => ({
          [k]: (s[k] as Rec<typeof k>[]).map((r) => {
            if (r.id !== id) return r
            next = { ...r, ...patch, updatedAt: now() }
            // saklar status ibu berubah → selaraskan catatan bulan ini (riwayat untuk laporan)
            if (k === 'warga' && ['hamil', 'melahirkan', 'nifas', 'menyusui'].some((x) => x in (patch as object)) && !('riwayatIbu' in (patch as object))) {
              ;(next as unknown as Warga).riwayatIbu = selarasRiwayat(next as unknown as Warga)
            }
            return next
          }),
        }) as Partial<State>)
        if (next) emit([{ t: 'put', k, rec: next }])
        log(set, k, id, 'Ubah', label)
      },
      remove: (k, id, label) => {
        guard()
        let next: Rec<typeof k> | undefined
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).map((r) => (r.id === id ? (next = { ...r, deletedAt: now(), updatedAt: now() }) : r)) }) as Partial<State>)
        if (next) emit([{ t: 'put', k, rec: next }])
        log(set, k, id, 'Hapus', label)
      },
      restore: (k, id, label) => {
        guard()
        let next: Rec<typeof k> | undefined
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).map((r) => (r.id === id ? (next = { ...r, deletedAt: null, updatedAt: now() }) : r)) }) as Partial<State>)
        if (next) emit([{ t: 'put', k, rec: next }])
        log(set, k, id, 'Pulihkan', label)
      },
      purge: (k, id, label) => {
        guard('admin')
        set((s) => ({ [k]: (s[k] as Rec<typeof k>[]).filter((r) => r.id !== id) }) as Partial<State>)
        emit([{ t: 'del', k, id }])
        log(set, k, id, 'Hapus Permanen', label)
      },
      bulkUpdate: (k, ids, patch) => {
        guard()
        const target = new Set(ids)
        const changed: Rec<typeof k>[] = []
        set((s) => ({
          [k]: (s[k] as Rec<typeof k>[]).map((r) => {
            if (!target.has(r.id)) return r
            const n = { ...r, ...patch, updatedAt: now() }
            changed.push(n)
            return n
          }),
        }) as Partial<State>)
        emit(changed.map((rec) => ({ t: 'put' as const, k, rec })))
        log(set, k, ids.join(','), 'Ubah', `${ids.length} data (massal)`)
      },
      setSettings: (p) => {
        guard()
        set((s) => ({ settings: { ...s.settings, ...p } }))
        emit([{ t: 'settings', settings: get().settings }])
      },
      replaceAll: (c, settings) => {
        guard('admin')
        set((s) => ({ ...s, ...c, ...(settings ? { settings } : {}) }))
        const ops: Op[] = []
        for (const k of Object.keys(c) as CollectionName[]) for (const rec of (c[k] ?? []) as { id: string; updatedAt: string }[]) ops.push({ t: 'put', k, rec })
        if (settings) ops.push({ t: 'settings', settings })
        emit(ops)
      },
      keluargaBaru: (extra) => {
        const nomor = maxOf(get().keluarga.map((x) => x.nomor)) + 1
        return get().create('keluarga', { ...blankKeluarga(), nomor, deletedAt: null, ...(extra ?? {}) } as NewRec<'keluarga'>, `Keluarga ${nomor}`)
      },
      tambahWarga: (w) => {
        const s = get()
        let keluargaId = w.keluargaId
        if (!keluargaId) keluargaId = get().keluargaBaru().id
        const fam = s.warga.filter((x) => x.keluargaId === keluargaId)
        const urut = w.urut ?? (fam.length ? maxOf(fam.map((x) => x.urut)) + 0.001 : maxOf(s.warga.map((x) => x.urut)) + 1)
        const noReg = w.noReg || maxOf(s.warga.map((x) => x.noReg)) + 1
        return get().create('warga', { ...w, keluargaId, urut, noReg, deletedAt: null } as NewRec<'warga'>, w.nama)
      },
      pindahWarga: (id, keluargaId) => {
        const s = get()
        const w = s.warga.find((x) => x.id === id)
        if (!w) return
        const target = keluargaId || get().keluargaBaru().id
        const fam = s.warga.filter((x) => x.keluargaId === target && x.id !== id)
        const urut = fam.length ? maxOf(fam.map((x) => x.urut)) + 0.001 : w.urut
        get().update('warga', id, { keluargaId: target, urut }, w.nama)
      },
      muatDariServer: (c, settings, audit, penuh) => {
        set((s) => {
          const next: Partial<State> = {}
          for (const k of COLLECTION_NAMES) {
            const incoming = c[k] as { id: string; updatedAt: string; purged?: boolean }[] | undefined
            if (!incoming) continue
            if (penuh) { (next as Record<string, unknown>)[k] = incoming.filter((r) => !r.purged); continue }
            const map = new Map((s[k] as { id: string; updatedAt: string }[]).map((r) => [r.id, r]))
            for (const r of incoming) {
              if (r.purged) map.delete(r.id)
              else { const old = map.get(r.id); if (!old || old.updatedAt <= r.updatedAt) map.set(r.id, r) }
            }
            ;(next as Record<string, unknown>)[k] = [...map.values()]
          }
          if (settings) next.settings = { ...DEFAULT_SETTINGS, ...settings, pilihan: { ...DEFAULT_PILIHAN, ...(settings.pilihan ?? {}) } }
          if (audit.length) {
            const have = new Set(s.audit.map((a) => a.id))
            next.audit = [...audit.filter((a) => !have.has(a.id)), ...(penuh ? [] : s.audit)].sort((a, b) => b.waktu.localeCompare(a.waktu)).slice(0, 2000)
            if (penuh) next.audit = audit.slice(0, 2000)
          } else if (penuh) next.audit = []
          return next
        })
      },
      resetAll: () => {
        guard('admin')
        const ops: Op[] = []
        const s = get()
        for (const k of COLLECTION_NAMES) for (const r of s[k] as { id: string }[]) ops.push({ t: 'del', k, id: r.id })
        set({ ...emptyCollections(), audit: [] })
        emit(ops)
      },
    }),
    {
      name: 'siwarga-pkk-rt08',
      version: 2,
      storage: createJSONStorage(() => guardedStorage),
      skipHydration: true,
      migrate: (persisted, version) => (version < 2 ? migrateV1(persisted as Record<string, unknown>) : persisted) as State,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}), pilihan: { ...DEFAULT_PILIHAN, ...(p.settings?.pilihan ?? {}) } } }
      },
    },
  ),
)

/** Hook praktis: daftar yang belum dihapus */
export function useLive<K extends CollectionName>(k: K): Collections[K] {
  const list = useStore((s) => s[k])
  return (list as Rec<K>[]).filter((r) => !r.deletedAt) as Collections[K]
}

/* ---------- migrasi dari versi 1 (keluarga dikelompokkan per No KK, isian Ya/Tidak berupa true/false) ---------- */
const yt = (b: unknown) => (b === true || b === 'Ya' ? 'Ya' : b === false || b === 'Tidak' ? 'Tidak' : '')
function migrateV1(p: Record<string, unknown>): Record<string, unknown> {
  type Old = Record<string, unknown> & { id: string; noKK?: string }
  const oldW = ((p.warga as Old[]) ?? []).filter(Boolean)
  const oldK = ((p.keluarga as Old[]) ?? []).filter(Boolean)
  const byKK = new Map<string, Old>()
  oldK.forEach((k) => k.noKK && byKK.set(String(k.noKK), k))
  const famId = new Map<string, string>()
  const keluarga: Keluarga[] = []
  const t = now()
  const ensure = (kk: string, old?: Old) => {
    const key = kk || `__${keluarga.length}`
    if (famId.has(key)) return famId.get(key)!
    const id = old?.id ?? uid()
    famId.set(key, id)
    keluarga.push({
      ...blankKeluarga(), nomor: keluarga.length + 1, id, createdAt: t, updatedAt: t, deletedAt: null,
      sumberAir: String(old?.sumberAir ?? 'Sumur'), spal: yt(old?.spal ?? true) as Keluarga['spal'], kamarMandi: old?.kamarMandi ? '1' : '',
      jumlahWC: String(old?.jumlahWC ?? ''), makananPokok: String(old?.makananPokok ?? 'Beras'), kriteriaRumah: String(old?.kriteriaRumah ?? 'Layak Huni'),
      rumahSehat: String(old?.rumahSehat ?? 'Sehat'), tps: old?.tps === false ? 'Tidak' : 'Ada',
    })
    return id
  }
  const warga = oldW.map((w, i) => ({
    ...w,
    urut: i + 1, noReg: i + 1, keluargaId: ensure(String(w.noKK ?? ''), byKK.get(String(w.noKK ?? ''))),
    desa: 'Baturetno', kecamatan: 'Banguntapan', kabupaten: 'Bantul', provinsi: 'DIY',
    ppp: yt(w.ppp), kerjaBakti: yt(w.kerjaBakti), rukunKematian: yt(w.rukunKematian), keagamaan: yt(w.keagamaan), jimpitan: yt(w.jimpitan),
    arisan: yt(w.arisan), barkas: yt(w.barkas), apotekHidup: yt(w.apotekHidup), jumantik: yt(w.jumantik), posyandu: yt(w.posyandu),
    bkb: yt(w.bkb), perencanaanSehat: yt(w.perencanaanSehat), tabungan: yt(w.tabungan), kelompokBelajar: yt(w.kelompokBelajar),
    paket: w.jenisKelompokBelajar ? String(w.jenisKelompokBelajar).split(/,\s*/) : [], paud: yt(w.paud), koperasi: yt(w.koperasi),
    pendidikanKetrampilan: yt(w.pendidikanKetrampilan), sandang: yt(w.sandang), up2k: 'Tidak', jenisUp2k: '',
    berkebutuhanKhusus: w.berkebutuhanKhusus ? 'Ya' : '',
  }))
  const s = (p.settings ?? {}) as Record<string, unknown>
  return { ...p, warga, keluarga, pusBaru: [], settings: { ...s, umurLansia: s.umurLansia === 60 ? 50 : s.umurLansia, teks: {} } }
}
