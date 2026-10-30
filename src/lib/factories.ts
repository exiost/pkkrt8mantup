import type { Keluarga, Warga } from './types'

type NoMeta<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export function blankWarga(): NoMeta<Warga> {
  return {
    urut: 0, keluargaId: '', noReg: 0, noKK: '', nik: '', nama: '', jk: 'L', tempatLahir: '', tglLahir: '', agama: 'Islam',
    pendidikan: '', pekerjaan: '', golDarah: '', statusKawin: 'Belum Kawin', tglNikahCerai: '', statusKeluarga: 'Anak',
    statusWarga: 'Aktif', catatan: '',
    dasawisma: '', alamat: 'Mantup RT 08', desa: 'Baturetno', kecamatan: 'Banguntapan', kabupaten: 'Bantul', provinsi: 'DIY', dusun: 'Mantup',
    ikutPKK: true, jabatan: 'Anggota', ppp: 'Ya', kegiatanDiikuti: '', kerjaBakti: 'Ya', kerjaBaktiJenis: '',
    rukunKematian: 'Tidak', rukunKematianJenis: '', keagamaan: 'Ya', keagamaanJenis: '', jimpitan: 'Tidak', arisan: 'Tidak',
    barkas: 'Tidak', apotekHidup: 'Tidak', jumantik: 'Ya',
    kontrasepsi: '', riwayatSakit: '', posyandu: 'Tidak', frekPosyandu: '', bkb: 'Tidak', perencanaanSehat: 'Ya',
    hamil: false, hamilKe: '', hpl: '', melahirkan: false, menyusui: false, nifas: false,
    tigaButa: false, berkebutuhanKhusus: '', tabungan: 'Ya', kelompokBelajar: 'Tidak', paket: [], paud: 'Tidak',
    koperasi: 'Tidak', jenisKoperasi: '', pendidikanKetrampilan: 'Tidak', sandang: 'Ya', up2k: 'Tidak', jenisUp2k: '',
    pekarangan: [], irt: [], tags: [],
  }
}

export function blankKeluarga(): NoMeta<Keluarga> {
  return {
    nomor: 0, sumberAir: 'Sumur', spal: 'Ya', kamarMandi: '1', jumlahWC: '1', makananPokok: 'Beras',
    kriteriaRumah: 'Layak Huni', rumahSehat: 'Sehat', tps: 'Ada',
  }
}
