import {
  Baby, Bath, BadgeCheck, BookOpen, Briefcase, Building2, Cake, CalendarDays, Crown, Droplet, Droplets, FileText, GraduationCap, Hash, HeartHandshake, HeartPulse,
  Home, House, IdCard, Landmark, ListChecks, Map, MapPin, Milk, Palette, PiggyBank, Phone, ShieldCheck, Sigma, Sprout, StickyNote, Store, Tag, Trash2, UserRound, Users,
  Waves, Wheat, type LucideIcon,
} from 'lucide-react'

/** Ikon otomatis berdasarkan teks label isian (agar semua form & tabel punya ikon tanpa diatur satu per satu) */
const RULES: [RegExp, LucideIcon][] = [
  [/\bnik\b|ktp/i, IdCard], [/registrasi|^no\b|nomor|^rt$|^rw$/i, Hash], [/nama (ibu|istri)/i, UserRound], [/nama (suami|ketua|kepala)/i, Crown], [/nama bayi|bayi/i, Baby],
  [/nama/i, UserRound], [/jenis kelamin|^l\/p$|^jk$/i, Users], [/tempat lahir|alamat/i, MapPin], [/tanggal|tgl|hpl|tahun|bulan/i, CalendarDays],
  [/umur|usia|balita|lansia/i, Cake], [/agama/i, BookOpen], [/pendidikan/i, GraduationCap], [/pekerjaan|jabatan/i, Briefcase],
  [/golongan darah/i, Droplet], [/status (warga|keluarga)/i, BadgeCheck], [/status|perkawinan|kawin/i, HeartHandshake], [/kontrasepsi|kb|alkon|jaminan/i, ShieldCheck],
  [/sakit|kesehatan|posyandu/i, HeartPulse], [/menyusui/i, Milk], [/padukuhan|dusun/i, Home], [/kalurahan|desa|kelurahan/i, Landmark], [/kapanewon|kecamatan/i, Building2],
  [/kabupaten|provinsi|wilayah/i, Map], [/dasawisma|dasa wisma/i, Home], [/sumber air/i, Droplets], [/makanan/i, Wheat], [/kamar mandi|mck|wc|jamban/i, Bath],
  [/spal/i, Waves], [/sampah/i, Trash2], [/rumah|kriteria/i, House], [/tabungan|koperasi|up2k/i, PiggyBank], [/pekarangan|komoditi|toga/i, Sprout], [/irt|usaha|volume/i, Store],
  [/warna/i, Palette], [/tag/i, Tag], [/telepon|hp|wa\b/i, Phone], [/jumlah|batas/i, Sigma], [/kategori|pilihan|jenis/i, ListChecks], [/keterangan|catatan|sebab/i, StickyNote],
  [/teks|judul|kop/i, FileText],
]

export function labelIcon(label: string): LucideIcon | undefined {
  const t = label.replace(/\*/g, '').trim()
  return RULES.find(([re]) => re.test(t))?.[1]
}
