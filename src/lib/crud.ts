import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { useStore } from './store'
import type { CollectionName } from './types'

/** Hapus (soft) dengan toast "Urungkan" */
export function hapusDenganUndo(k: CollectionName, id: string, label: string) {
  const st = useStore.getState()
  st.remove(k, id, label)
  toast.success(`${label} dipindah ke Tempat Sampah`, {
    action: { label: 'Urungkan', onClick: () => useStore.getState().restore(k, id, label) },
    duration: 5000,
  })
}

/** Hapus satu keluarga beserta semua anggotanya (bisa diurungkan) */
export function hapusKeluargaDenganAnggota(st: ReturnType<typeof useStore.getState>, keluargaId: string, label: string) {
  const anggota = useStore.getState().warga.filter((w) => w.keluargaId === keluargaId && !w.deletedAt)
  anggota.forEach((w) => st.remove('warga', w.id, w.nama))
  st.remove('keluarga', keluargaId, label)
  toast.success(`Keluarga ${label} dipindah ke Tempat Sampah`, {
    action: { label: 'Urungkan', onClick: () => { const s = useStore.getState(); s.restore('keluarga', keluargaId, label); anggota.forEach((w) => s.restore('warga', w.id, w.nama)) } },
    duration: 6000,
  })
}

export function rayakan() {
  if (useStore.getState().settings.reduceMotion) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9'] })
}
