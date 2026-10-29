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

export function rayakan() {
  if (useStore.getState().settings.reduceMotion) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9'] })
}
