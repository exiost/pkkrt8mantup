export type JK = 'L' | 'P'
export type StatusWarga = 'Aktif' | 'Pindah' | 'Meninggal'

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
  // A. Identitas
  noKK: string
  nik: string
  nama: string
  jk: JK
  tempatLahir: string
  tglLahir: string // ISO yyyy-mm-dd
  agama: string
  pendidikan: string
  pekerjaan: string
  golDarah: string
  statusKawin: string
  tglNikahCerai: string
  statusKeluarga: string
  statusWarga: StatusWarga
  catatan: string
  // B. Wilayah
  dasawisma: string
  alamat: string
  dusun: string
  // D. Kegiatan PKK & warga
  ikutPKK: boolean
  jabatan: string
  ppp: boolean
  kegiatanDiikuti: string
  kerjaBakti: boolean
  kerjaBaktiJenis: string
  rukunKematian: boolean
  rukunKematianJenis: string
  keagamaan: boolean
  keagamaanJenis: string
  jimpitan: boolean
  arisan: boolean
  barkas: boolean
  apotekHidup: boolean
  jumantik: boolean
  // E. Kesehatan & KB
  kontrasepsi: string
  riwayatSakit: string
  posyandu: boolean
  frekPosyandu: string
  bkb: boolean
  perencanaanSehat: boolean
  // F. Ibu
  hamil: boolean
  hamilKe: string
  hpl: string
  melahirkan: boolean
  menyusui: boolean
  nifas: boolean
  // G. Pendidikan & ekonomi
  tigaButa: boolean
  berkebutuhanKhusus: boolean
  tabungan: boolean
  kelompokBelajar: boolean
  jenisKelompokBelajar: string
  paud: boolean
  koperasi: boolean
  jenisKoperasi: string
  pendidikanKetrampilan: boolean
  sandang: boolean
  pangan: boolean
  // H/I
  pekarangan: ItemPekarangan[]
  irt: ItemIRT[]
  tags: string[]
}

export interface Keluarga extends Meta {
  noKK: string
  dasawisma: string
  alamat: string
  sumberAir: string
  spal: boolean
  kamarMandi: boolean
  jumlahWC: string
  mckSeptic: boolean
  makananPokok: string
  kriteriaRumah: string // Layak Huni / Tidak Layak Huni
  rumahSehat: string // Sehat / Kurang Sehat
  tps: boolean
  up2k: boolean
  jenisUp2k: string
  kesehatanLingkungan: boolean
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
  nilai: Record<string, number>
}

export interface Arsip extends Meta {
  judul: string
  jenis: string
  periode: string
  html: string
}

export interface Settings {
  rt: string
  rw: string
  padukuhan: string
  kalurahan: string
  kapanewon: string
  kabupaten: string
  provinsi: string
  ketuaPKK: string
  sekretaris: string
  tempatTTD: string
  umurBalita: number
  umurLansia: number
  pilihan: Record<string, string[]>
  reduceMotion: boolean
  dark: boolean
}

export interface AuditEntry {
  id: string
  waktu: string
  koleksi: string
  recordId: string
  aksi: 'Tambah' | 'Ubah' | 'Hapus' | 'Pulihkan' | 'Hapus Permanen'
  label: string
}

export interface Collections {
  warga: Warga[]
  keluarga: Keluarga[]
  kelahiran: Kelahiran[]
  kematian: Kematian[]
  pesertaKB: PesertaKB[]
  dasawisma: Dasawisma[]
  tags: Tag[]
  kampungKB: KampungKBManual[]
  arsip: Arsip[]
}

export type CollectionName = keyof Collections
