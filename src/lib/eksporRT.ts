import { toast } from 'sonner'
import { useStore } from './store'
import { useSession } from './session'
import { COLLECTION_NAMES } from './types'

/** kode RT dua angka dari sesi (server) atau dari nama RT di pengaturan (mode lokal) */
export const kodeRT = (sesiRT: string, nama: string) => sesiRT || (nama.match(/\d+/)?.[0] ?? '08').padStart(2, '0')

/** unduh satu file .siwarga berisi semua data RT di perangkat ini (termasuk perubahan yang belum terkirim) */
export function eksporRT() {
  const st = useStore.getState()
  const rt = kodeRT(useSession.getState().rt, st.settings.rt)
  const data: Record<string, unknown> = { format: 'siwarga-rt', versi: 1, rt, dibuat: new Date().toISOString(), settings: st.settings }
  for (const c of COLLECTION_NAMES) data[c] = st[c]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  a.download = `RT${rt}_${String(data.dibuat).slice(0, 10)}.siwarga`
  a.click()
  toast.success(`File data RT ${rt} diunduh — kirim lewat WhatsApp / flashdisk ke Admin Padukuhan`)
}
