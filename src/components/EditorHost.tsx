import { createContext, useContext, useState, type ReactNode } from 'react'
import WargaForm from './WargaForm'
import KeluargaForm from './KeluargaForm'
import type { Warga } from '@/lib/types'

interface Ctx {
  openWarga: (id?: string, preset?: Partial<Warga>) => void
  openKeluarga: (id?: string, preset?: { noKK?: string; dasawisma?: string }) => void
}
const EditorCtx = createContext<Ctx>({ openWarga: () => {}, openKeluarga: () => {} })
export const useEditor = () => useContext(EditorCtx)

/** Menyediakan form tambah/ubah warga & KK yang bisa dibuka dari mana saja (termasuk dari laporan). */
export function EditorHost({ children }: { children: ReactNode }) {
  const [w, setW] = useState<{ id?: string; preset?: Partial<Warga>; key: number } | null>(null)
  const [k, setK] = useState<{ id?: string; preset?: { noKK?: string; dasawisma?: string }; key: number } | null>(null)
  return (
    <EditorCtx.Provider
      value={{
        openWarga: (id, preset) => setW({ id, preset, key: Date.now() }),
        openKeluarga: (id, preset) => setK({ id, preset, key: Date.now() }),
      }}
    >
      {children}
      {w && <WargaForm key={w.key} id={w.id} preset={w.preset} onClose={() => setW(null)} />}
      {k && <KeluargaForm key={k.key} id={k.id} preset={k.preset} onClose={() => setK(null)} />}
    </EditorCtx.Provider>
  )
}
