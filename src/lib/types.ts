export type JK = 'L' | 'P'
export type StatusWarga = 'Aktif' | 'Nonaktif' | 'Pindah' | 'Meninggal'
/** Sama seperti isian di Excel: "Ya", "Tidak", atau kosong (belum diisi) */
export type YT = 'Ya' | 'Tidak' | ''

export interface Meta {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface ItemPekarangan {
  kategori: string
  komoditi: string
  jumlah: string
}

export interface ItemIRT {
  kategori: string
  komoditi: string
  volume: string
}

export interface Warga extends Meta {
  /** Urutan baris seperti di sheet DATA WARGA (anggota keluarga mengikuti kepala keluarga) */
  urut: number
  /** Keluarga (ID di kolom DE). Satu ID = satu keluarga walau No KK-nya beda */
  keluargaId: string
  /** No Registrasi = kolom "NO" di DATA WARGA */
  noReg: number
  noKK: string
  nik: string
  nama: string
  jk: JK
  tempatLahir: string
  tglLahir: string // yyyy-mm-dd
  agama: string
  pendidikan: string
  pekerjaan: string
  golDarah: string
  statusKawin: string
  tglNikahCerai: string
  statusKeluarga: string
  statusWarga: StatusWarga
  catatan: string
  // wilayah
  dasawisma: string
  alamat: string
  desa: string
  kecamatan: string
  kabupaten: string
  provinsi: string
  dusun: string
  // kegiatan PKK & warga
  ikutPKK: boolean
  jabatan: string
  ppp: YT
  kegiatanDiikuti: string
  kerjaBakti: YT
  kerjaBaktiJenis: string
  rukunKematian: YT
  rukunKematianJenis: string
  keagamaan: YT
  keagamaanJenis: string
  jimpitan: YT
  arisan: YT
  barkas: YT
  apotekHidup: YT
  jumantik: YT
  // kesehatan & KB
  kontrasepsi: string
  riwayatSakit: string
  posyandu: YT
  frekPosyandu: string
  bkb: YT
  perencanaanSehat: YT
  // ibu
  hamil: boolean
  hamilKe: string
  hpl: string
  melahirkan: boolean
  menyusui: boolean
  nifas: boolean
  /** Catatan status ibu per bulan (mis. hamil Jan–Jul, lahir SC Agustus tetap dilaporkan hamil). Kosong = pakai saklar di atas. */
  riwayatIbu?: RiwayatIbu[]
  // pendidikan & ekonomi
  tigaButa: boolean
  berkebutuhanKhusus: string
  tabungan: YT
  kelompokBelajar: YT
  paket: string[] // 'Paket A' | 'Paket B' | 'Paket C' | 'KF'
  paud: YT
  koperasi: YT
  jenisKoperasi: string
  pendidikanKetrampilan: YT
  sandang: YT
  up2k: YT
  jenisUp2k: string
  // pekarangan & industri rumah tangga
  pekarangan: ItemPekarangan[]
  irt: ItemIRT[]
  tags: string[]
}

export interface Keluarga extends Meta {
  /** Nomor urut keluarga (ID keluarga, kolom DE) */
  nomor: number
  sumberAir: string
  spal: YT
  kamarMandi: string
  jumlahWC: string
  makananPokok: string
  kriteriaRumah: string // Layak Huni / Tidak Layak Huni
  rumahSehat: string // Sehat / Kurang Sehat
  tps: string // Ada / Tidak
}

export interface Kelahiran extends Meta {
  dasawisma: string
  namaIbu: string
  namaSuami: string
  namaBayi: string
  jk: JK
  tglLahir: string
  akte: boolean
  keterangan: string
}

export interface Kematian extends Meta {
  kategori: 'Ibu' | 'Bayi' | 'Balita'
  dasawisma: string
  nama: string
  namaIbu: string
  jk: JK
  tgl: string
  sebab: string
  keterangan: string
}

export interface PesertaKB extends Meta {
  namaIstri: string
  namaSuami: string
  umur: string
  rt: string
  jaminan: string
  jumlahAnak: string
  tglKB: string
  tempatKB: string
  jenisAlkon: string
}

export interface PUSBaru extends Meta {
  namaIstri: string
  umur: string
  namaSuami: string
  tanggal: string
  keterangan: string
}

export interface Dasawisma extends Meta {
  nama: string
  ketua: string
  warna: string
}

export interface Tag extends Meta {
  nama: string
  warna: string
}

export interface KampungKBManual extends Meta {
  periode: string // yyyy-mm
  nilai: Record<string, number | string>
}

export interface Arsip extends Meta {
  judul: string
  jenis: string
  periode: string
  html: string
}

export type StatusIbuLapor = 'Hamil' | 'Melahirkan' | 'Nifas' | 'Menyusui'

/** Satu catatan status ibu untuk satu bulan */
export interface RiwayatIbu {
  /** YYYY-MM */
  bulan: string
  status: StatusIbuLapor
  /** cara melahirkan (diisi bila status Melahirkan) */
  cara?: 'Normal' | 'SC' | 'Lainnya'
  /** laporan tahunan: bulan ini tetap ditulis "Hamil" walau sudah melahirkan (mis. SC) */
  tetapHamil?: boolean
  catatan?: string
}

/** Tanggal laporan yang dikunci admin; dipakai akun viewer */
export interface KunciTanggal {
  aktif: boolean
  acuan: string // yyyy-mm-dd
  bulan: number // 0-11
  tahun: number
}

export interface Settings {
  rt: string
  rw: string
  padukuhan: string
  kalurahan: string
  kapanewon: string
  kabupaten: string
  provinsi: string
  umurBalita: number
  umurLansia: number
  pilihan: Record<string, string[]>
  /** Ubahan teks tetap pada lembar laporan: "idLaporan!A1" → teks */
  teks: Record<string, string>
  /** Kunci tanggal laporan untuk akun viewer (diatur admin) */
  kunci?: KunciTanggal
}

export interface AuditEntry {
  id: string
  waktu: string
  koleksi: string
  recordId: string
  aksi: 'Tambah' | 'Ubah' | 'Hapus' | 'Pulihkan' | 'Hapus Permanen'
  label: string
  oleh?: string
}

export interface Collections {
  warga: Warga[]
  keluarga: Keluarga[]
  kelahiran: Kelahiran[]
  kematian: Kematian[]
  pesertaKB: PesertaKB[]
  pusBaru: PUSBaru[]
  dasawisma: Dasawisma[]
  tags: Tag[]
  kampungKB: KampungKBManual[]
  arsip: Arsip[]
}

export type CollectionName = keyof Collections
export const COLLECTION_NAMES: CollectionName[] = ['warga', 'keluarga', 'kelahiran', 'kematian', 'pesertaKB', 'pusBaru', 'dasawisma', 'tags', 'kampungKB', 'arsip']

export type Role = 'admin' | 'editor' | 'viewer'
export interface AppUser {
  id: string
  username: string
  name: string
  role: Role
  active: boolean
}
