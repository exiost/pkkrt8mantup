import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Preferensi tampilan per perangkat (tidak ikut tersimpan di server) */
export const useUi = create<{ dark: boolean; reduceMotion: boolean; set: (p: Partial<{ dark: boolean; reduceMotion: boolean }>) => void }>()(
  persist((set) => ({ dark: false, reduceMotion: false, set: (p) => set(p) }), { name: 'siwarga-ui' }),
)
