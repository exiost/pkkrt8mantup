import {
  Activity, Archive, Baby, ClipboardList, Flower2, HeartHandshake, Home, House, IdCard, LayoutList, NotebookPen,
  Sprout, Stethoscope, Table, UserCheck, type LucideIcon,
} from 'lucide-react'

export interface ReportDef {
  slug: string
  title: string
  sheet: string
  desc: string
  icon: LucideIcon
  color: string
  group: 'Kependudukan' | 'KB & PUS' | 'Dasawisma' | 'Ibu & Anak' | 'Formulir'
}

export const REPORTS: ReportDef[] = [
  { slug: 'penduduk-15-59', title: 'Penduduk 15–59 Tahun', sheet: 'DATA PENDUDUK 15-59', desc: 'Daftar warga usia 15–59 th + riwayat sakit', icon: UserCheck, color: 'sky', group: 'Kependudukan' },
  { slug: 'kampung-kb', title: 'Inventarisasi Kampung KB', sheet: 'INVENTARISASI KAMPUNG KB', desc: 'Data kependudukan, KB & ketahanan keluarga', icon: Home, color: 'emerald', group: 'Kependudukan' },
  { slug: 'wus', title: 'WUS per Bulan', sheet: 'DATA WUS PER BULAN', desc: 'Wanita usia subur 15–49 th', icon: Flower2, color: 'pink', group: 'KB & PUS' },
  { slug: 'pus', title: 'PUS per Bulan', sheet: 'DATA PUS PER BULAN', desc: 'Pasangan usia subur + kelompok umur & alkon', icon: HeartHandshake, color: 'rose', group: 'KB & PUS' },
  { slug: 'pencatatan-hamil-kb', title: 'Pencatatan Ibu Hamil & KB Baru', sheet: 'PENCATATAN IBU HAMIL,KB,PUS', desc: 'Ibu hamil (HPL) & peserta KB baru', icon: Baby, color: 'fuchsia', group: 'KB & PUS' },
  { slug: 'rekap-catatan', title: 'Rekap Catatan Data & Kegiatan', sheet: 'rekap catatan data dan kegiatan · REKAP CAT DATA KEG DAWIS 1 & 2', desc: 'Tingkat RT atau per Dasawisma (30 kolom)', icon: Table, color: 'teal', group: 'Dasawisma' },
  { slug: 'rekap-ibu-hamil', title: 'Rekap Ibu Hamil, Melahirkan, Nifas', sheet: 'REKAPITULASI DATA IBU HAMIL · Sheet1', desc: 'Rekap per dasawisma tingkat RT', icon: Activity, color: 'red', group: 'Ibu & Anak' },
  { slug: 'ibu-hamil-dawis', title: 'Catatan Ibu Hamil, Kelahiran & Kematian', sheet: 'rekap ibu hamil dawis 1, 2 & CUSTOM', desc: 'Per dasawisma, filter bebas', icon: Stethoscope, color: 'red', group: 'Ibu & Anak' },
  { slug: 'register-kelahiran', title: 'Register Kelahiran & Kematian', sheet: 'bayi lahir', desc: 'Daftar bayi lahir & kematian bayi/balita/ibu', icon: Baby, color: 'cyan', group: 'Ibu & Anak' },
  { slug: 'data-warga-tp-pkk', title: 'Data Warga TP PKK', sheet: 'data warga tp pkk', desc: 'Formulir biodata per warga', icon: IdCard, color: 'violet', group: 'Formulir' },
  { slug: 'data-keluarga', title: 'Data Keluarga', sheet: 'data keluarga', desc: 'Formulir per KK', icon: House, color: 'amber', group: 'Formulir' },
  { slug: 'catatan-keluarga', title: 'Catatan Keluarga', sheet: 'CATATAN KELUARGA', desc: 'Formulir per KK, 19 kolom kegiatan', icon: NotebookPen, color: 'orange', group: 'Formulir' },
  { slug: 'ht-irt', title: 'HATINYA PKK & IRT', sheet: 'HT_IRT', desc: 'Pemanfaatan pekarangan & industri rumah tangga', icon: Sprout, color: 'lime', group: 'Formulir' },
  { slug: 'arsip', title: 'Arsip Laporan', sheet: 'Sheet1 (arsip)', desc: 'Laporan bulanan yang sudah disimpan', icon: Archive, color: 'slate', group: 'Ibu & Anak' },
]

export const REPORT_GROUPS = ['Kependudukan', 'KB & PUS', 'Dasawisma', 'Ibu & Anak', 'Formulir'] as const
export { ClipboardList, LayoutList }
