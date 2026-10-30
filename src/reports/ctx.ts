import type { Dasawisma, Keluarga, KampungKBManual, Kelahiran, Kematian, PesertaKB, PUSBaru, Settings, Warga } from '@/lib/types'
import type { Ctx, ReportOpts, ReportParams } from './common'

export interface ReportData {
  warga: Warga[]
  keluarga: Keluarga[]
  kelahiran: Kelahiran[]
  kematian: Kematian[]
  pesertaKB: PesertaKB[]
  pusBaru: PUSBaru[]
  dasawisma: Dasawisma[]
  kampungKB: KampungKBManual[]
  settings: Settings
}

/** Menyusun bahan laporan (dipakai halaman laporan dan uji kecocokan dengan Excel) */
export function makeCtx(d: ReportData, p: ReportParams, o: ReportOpts, ym?: string): Ctx {
  // nama dasawisma disamakan dengan yang terdaftar (spasi/huruf besar-kecil tidak membuat warga hilang dari rekap)
  const dws = d.dasawisma.filter((x) => !x.deletedAt)
  const canon = (n: string) => dws.find((x) => x.nama.trim().toLowerCase() === (n ?? '').trim().toLowerCase())?.nama ?? n
  const warga = d.warga.filter((w) => !w.deletedAt).map((w) => (canon(w.dasawisma) === w.dasawisma ? w : { ...w, dasawisma: canon(w.dasawisma) })).sort((a, b) => a.urut - b.urut)
  const keluarga = d.keluarga.filter((k) => !k.deletedAt)
  const periode = `${p.tahun}-${String(p.bulan + 1).padStart(2, '0')}`
  return {
    p, o, warga, aktif: warga.filter((w) => w.statusWarga === 'Aktif'), keluarga, fam: new Map(keluarga.map((k) => [k.id, k])),
    kelahiran: d.kelahiran.filter((x) => !x.deletedAt).map((x) => ({ ...x, dasawisma: canon(x.dasawisma) })), kematian: d.kematian.filter((x) => !x.deletedAt).map((x) => ({ ...x, dasawisma: canon(x.dasawisma) })), pesertaKB: d.pesertaKB.filter((x) => !x.deletedAt),
    pusBaru: d.pusBaru.filter((x) => !x.deletedAt), dasawisma: d.dasawisma.filter((x) => !x.deletedAt),
    kb: d.kampungKB.find((x) => x.periode === periode && !x.deletedAt), settings: d.settings,
    ym: ym ?? periode,
  }
}
