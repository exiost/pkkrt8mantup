import { Activity, Archive, CalendarRange, Baby, Flower2, HeartHandshake, Home, House, IdCard, NotebookPen, Sprout, Stethoscope, Table, UserCheck, LayoutList, type LucideIcon } from 'lucide-react'
import type { Builder } from './common'
import { bKampungKB, bPencatatan, bPenduduk, bPUS, bRegister, bWUS } from './lists'
import { bCatatanKeluarga, bDataKeluarga, bHTIRT, bTPPKK } from './forms'
import { bIbuHamilDawis, bIbuHamilDawisTahunan, bRekapCatatan, bRekapDawis, bRekapIbuHamil, bRekapIbuHamilTahunan } from './rekap'

export type Use = 'acuan' | 'bulan' | 'tahun' | 'rentang' | 'dawis' | 'dawisWajib' | 'warga' | 'keluarga' | 'htwarga' | 'semuaPeriode' | 'isiKosong' | 'barisKosong' | 'manualKB'

export interface ReportDef {
  /** disembunyikan dari daftar & pencarian (tetap bisa dibuka lewat alamat langsung) */
  hidden?: boolean
  slug: string
  title: string
  sheet: string
  desc: string
  icon: LucideIcon
  color: string
  group: 'Kependudukan' | 'KB & PUS' | 'Dasawisma' | 'Ibu & Anak' | 'Formulir' | 'Arsip'
  tpl: string
  uses: Use[]
  build: Builder
  /** nilai awal opsi per laporan */
  defaults?: { barisKosong?: boolean }
}

export const REPORTS: ReportDef[] = [
  { slug: 'penduduk-15-59', title: 'Data Penduduk 15–59 Tahun', sheet: 'DATA PENDUDUK 15-59', desc: 'Daftar warga usia 15–59 th + riwayat sakit', icon: UserCheck, color: 'sky', group: 'Kependudukan', tpl: 'penduduk', uses: ['acuan', 'dawis', 'barisKosong', 'isiKosong'], build: bPenduduk, defaults: { barisKosong: false } },
  { slug: 'kampung-kb', title: 'Inventarisasi Kampung KB', sheet: 'INVENTARISASI KAMPUNG KB', desc: 'Data kependudukan, KB & ketahanan keluarga', icon: Home, color: 'emerald', group: 'Kependudukan', tpl: 'kampungkb', uses: ['acuan', 'bulan', 'manualKB'], build: bKampungKB },
  { slug: 'wus', title: 'Data WUS per Bulan', sheet: 'DATA WUS PER BULAN', desc: 'Wanita usia subur 15–49 th', icon: Flower2, color: 'pink', group: 'KB & PUS', tpl: 'wus', uses: ['acuan', 'dawis', 'barisKosong'], build: bWUS, defaults: { barisKosong: true } },
  { slug: 'pus', title: 'Data PUS per Bulan', sheet: 'DATA PUS PER BULAN', desc: 'Pasangan usia subur + kelompok umur & alkon', icon: HeartHandshake, color: 'rose', group: 'KB & PUS', tpl: 'pus', uses: ['acuan', 'dawis', 'barisKosong'], build: bPUS, defaults: { barisKosong: true } },
  { slug: 'pencatatan-hamil-kb', title: 'Pencatatan Ibu Hamil, KB Baru & PUS Baru', sheet: 'PENCATATAN IBU HAMIL,KB,PUS', desc: 'Ibu hamil (HPL), peserta KB baru, PUS baru/pindah', icon: Baby, color: 'fuchsia', group: 'KB & PUS', tpl: 'pencatatan', uses: ['acuan', 'bulan'], build: bPencatatan },
  { slug: 'rekap-catatan', title: 'Rekap Catatan Data & Kegiatan (RT)', sheet: 'rekap catatan data dan kegiatan', desc: 'Tingkat RT, baris = dasawisma (30 kolom)', icon: Table, color: 'teal', group: 'Dasawisma', tpl: 'rekapcatatan', uses: ['acuan', 'tahun'], build: bRekapCatatan },
  { slug: 'rekap-dawis', title: 'Rekap Catatan Data & Kegiatan (Dasawisma)', sheet: 'REKAP CAT DATA KEG DAWIS 1 & 2', desc: 'Per dasawisma, baris = kepala rumah tangga', icon: LayoutList, color: 'cyan', group: 'Dasawisma', tpl: 'rekapdawis', uses: ['acuan', 'tahun', 'dawisWajib'], build: bRekapDawis },
  { slug: 'rekap-ibu-hamil', title: 'Rekapitulasi Data Ibu Hamil, Melahirkan, Nifas', sheet: 'REKAPITULASI DATA IBU HAMIL', desc: 'Rekap per dasawisma tingkat RT', icon: Activity, color: 'red', group: 'Ibu & Anak', tpl: 'rekapibuhamil', uses: ['bulan'], build: bRekapIbuHamil },
  { slug: 'ibu-hamil-dawis', title: 'Catatan Ibu Hamil, Kelahiran & Kematian', sheet: 'rekap ibu hamil dawis 1, 2 & CUSTOM', desc: 'Per dasawisma atau seluruh RT', icon: Stethoscope, color: 'red', group: 'Ibu & Anak', tpl: 'ibuhamildawis', uses: ['bulan', 'dawis'], build: bIbuHamilDawis },
  { slug: 'rekap-ibu-hamil-tahunan', title: 'Rekapitulasi Ibu Hamil, Melahirkan, Nifas (Tahunan)', sheet: 'REKAPITULASI DATA IBU HAMIL', desc: 'Pilih bulan awal–akhir (mis. Jan–Des): ibu dihitung di semua status yang dialami', icon: CalendarRange, color: 'rose', group: 'Ibu & Anak', tpl: 'rekapibuhamil', uses: ['rentang'], hidden: true, build: bRekapIbuHamilTahunan },
  { slug: 'ibu-hamil-dawis-tahunan', title: 'Catatan Ibu Hamil, Kelahiran & Kematian (Tahunan)', sheet: 'rekap ibu hamil dawis 1, 2 & CUSTOM', desc: 'Rentang bulan per dasawisma atau seluruh RT', icon: CalendarRange, color: 'rose', group: 'Ibu & Anak', tpl: 'ibuhamildawis', uses: ['rentang', 'dawis'], hidden: true, build: bIbuHamilDawisTahunan },
  { slug: 'register-kelahiran', title: 'Register Bayi Lahir & Kematian', sheet: 'bayi lahir', desc: 'Daftar kelahiran dan kematian ibu/bayi/balita', icon: Baby, color: 'cyan', group: 'Ibu & Anak', tpl: 'registerlahir', uses: ['bulan', 'semuaPeriode', 'dawis'], build: bRegister },
  { slug: 'data-warga-tp-pkk', title: 'Data Warga TP PKK', sheet: 'data warga tp pkk', desc: 'Formulir biodata per warga', icon: IdCard, color: 'violet', group: 'Formulir', tpl: 'tppkk', uses: ['acuan', 'dawis', 'warga'], build: bTPPKK },
  { slug: 'data-keluarga', title: 'Data Keluarga', sheet: 'data keluarga', desc: 'Formulir per keluarga', icon: House, color: 'amber', group: 'Formulir', tpl: 'datakeluarga', uses: ['acuan', 'dawis', 'keluarga', 'isiKosong'], build: bDataKeluarga },
  { slug: 'catatan-keluarga', title: 'Catatan Keluarga', sheet: 'CATATAN KELUARGA', desc: 'Formulir per keluarga, kegiatan PKK', icon: NotebookPen, color: 'orange', group: 'Formulir', tpl: 'catatankeluarga', uses: ['acuan', 'tahun', 'dawis', 'keluarga'], build: bCatatanKeluarga },
  { slug: 'ht-irt', title: 'Pemanfaatan Tanah Pekarangan (HATINYA PKK) & IRT', sheet: 'HT_IRT', desc: 'Pekarangan dan industri rumah tangga per warga', icon: Sprout, color: 'lime', group: 'Formulir', tpl: 'htirt', uses: ['dawis', 'htwarga'], build: bHTIRT },
  { slug: 'arsip', title: 'Arsip Laporan', sheet: 'Sheet1 (arsip)', desc: 'Laporan bulanan yang sudah disimpan', icon: Archive, color: 'slate', group: 'Arsip', tpl: '', uses: [], build: () => [] },
]

export const REPORT_GROUPS = ['Kependudukan', 'KB & PUS', 'Dasawisma', 'Ibu & Anak', 'Formulir', 'Arsip'] as const
