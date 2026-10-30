import type { Dasawisma, Keluarga, KampungKBManual, Kelahiran, Kematian, PesertaKB, PUSBaru, Settings, Warga } from '@/lib/types'
import type { CellObj, Val } from '@/sheet/engine'
import type { SheetViewProps } from '@/sheet/SheetView'
import { BULAN } from '@/lib/options'

export interface ReportParams {
  acuan: string // yyyy-mm-dd
  bulan: number // 0-11
  tahun: number
  dawis: string // '' = semua
  pick: string // id warga / keluarga terpilih
  semua: boolean // cetak semua (formulir per orang/keluarga)
  semuaPeriode: boolean // register: tanpa filter bulan
}

export interface ReportOpts {
  /** tampilkan baris kosong sampai ukuran tabel di Excel */
  barisKosong: boolean
  /** isi kotak/kolom yang di Excel dibiarkan kosong (alamat, 3 buta, ibu hamil, menyusui) */
  isiKosong: boolean
}

export interface Ctx {
  p: ReportParams
  o: ReportOpts
  warga: Warga[] // belum dihapus, urut seperti DATA WARGA
  aktif: Warga[] // status Aktif
  keluarga: Keluarga[]
  fam: Map<string, Keluarga>
  kelahiran: Kelahiran[]
  kematian: Kematian[]
  pesertaKB: PesertaKB[]
  pusBaru: PUSBaru[]
  dasawisma: Dasawisma[]
  kb?: KampungKBManual
  settings: Settings
}

export interface PageSpec extends SheetViewProps {
  key: string
  label?: string
}
export type Builder = (c: Ctx) => PageSpec[]

export const link = (w: Warga): CellObj => ({ v: w.nama, w: w.id })
export const jkText = (w: Warga) => (w.jk === 'L' ? 'Laki - Laki' : 'Perempuan')
export const drill = (title: string, list: Warga[]) => ({ title, list })
export const yes = (x: string) => x.trim().toLowerCase() === 'ya'
export const tidak = (x: string) => x.trim().toLowerCase() === 'tidak'
export const has = (x: string, sub: string) => x.toLowerCase().includes(sub.toLowerCase())

export function inMonth(iso: string, p: Pick<ReportParams, 'bulan' | 'tahun' | 'semuaPeriode'>): boolean {
  if (p.semuaPeriode) return true
  if (!iso) return false
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.getMonth() === p.bulan && d.getFullYear() === p.tahun
}

/** "15 / Oktober / 2026" */
export function tglPanjang(acuan: string): string {
  const [y, m, d] = acuan.split('-')
  return `${Number(d)} / ${BULAN[Number(m) - 1]} / ${y}`
}

export const rowsOf = (list: Record<string, Val>[], size: number, fill: boolean) => (fill ? Math.max(list.length, size) : list.length)

/** Isian manual Kampung KB yang di Excel diketik tangan (alamat sel → label) */
export const KB_MANUAL: { title: string; cells: { addr: string; label: string; text?: boolean }[] }[] = [
  {
    title: 'III.1 Balita ikut Posyandu & BKB',
    cells: ['5', '6'].flatMap((r) => [['L', 'Jumlah'], ['M', 'Posyandu ikut'], ['N', 'Posyandu tdk ikut'], ['O', 'BKB ikut'], ['P', 'BKB tdk ikut']].map(([c, l]) => ({ addr: c + r, label: `${r === '5' ? '1 - < 2 th' : '2 - < 5 th'} · ${l}` }))),
  },
  {
    title: 'III.2 Remaja ikut PIK-R & BKR',
    cells: ['11', '12', '13'].flatMap((r) => [['L', 'Jumlah'], ['M', 'PIK-R ikut'], ['N', 'PIK-R tdk ikut'], ['O', 'BKR ikut'], ['P', 'BKR tdk ikut']].map(([c, l]) => ({ addr: c + r, label: `${r === '11' ? '7 - 14 th' : r === '12' ? '15 - 19 th' : '19 - 24 th'} · ${l}` }))),
  },
  {
    title: 'III.3 Lansia & keluarga lansia (BKL)',
    cells: ['17', '18'].flatMap((r) => [['L', 'Jumlah'], ['M', 'Ikut'], ['O', 'Tdk ikut']].map(([c, l]) => ({ addr: c + r, label: `${r === '17' ? 'Lansia' : 'Kelg. lansia'} · ${l}` }))),
  },
  {
    title: 'III.4 Kelompok UPPKA',
    cells: ['22', '23', '24', '25', '26'].flatMap((r, i) => [{ addr: `K${r}`, label: `Kelompok ${i + 1} · nama`, text: true }, { addr: `L${r}`, label: `Kelompok ${i + 1} · jumlah anggota` }]),
  },
  {
    title: 'II.3 PUS bukan peserta KB',
    cells: [{ addr: 'H29', label: 'Ingin anak segera' }, { addr: 'H30', label: 'Ingin anak ditunda' }, { addr: 'H31', label: 'Tidak ingin anak lagi' }, { addr: 'H32', label: 'Jumlah' }],
  },
]
