import type { Keluarga, Warga } from './types'

type NoMeta<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export function blankWarga(): NoMeta<Warga> {
  return {
    noKK: '', nik: '', nama: '', jk: 'L', tempatLahir: '', tglLahir: '', agama: 'Islam', pendidikan: '', pekerjaan: '',
    golDarah: '', statusKawin: 'Belum Kawin', tglNikahCerai: '', statusKeluarga: 'Anak', statusWarga: 'Aktif', catatan: '',
    dasawisma: '', alamat: 'Mantup RT 08', dusun: 'Mantup',
    ikutPKK: true, jabatan: 'Anggota', ppp: true, kegiatanDiikuti: '', kerjaBakti: true, kerjaBaktiJenis: '',
    rukunKematian: false, rukunKematianJenis: '', keagamaan: true, keagamaanJenis: '', jimpitan: false, arisan: false,
    barkas: false, apotekHidup: false, jumantik: false,
    kontrasepsi: '', riwayatSakit: '', posyandu: false, frekPosyandu: '', bkb: false, perencanaanSehat: false,
    hamil: false, hamilKe: '', hpl: '', melahirkan: false, menyusui: false, nifas: false,
    tigaButa: false, berkebutuhanKhusus: false, tabungan: false, kelompokBelajar: false, jenisKelompokBelajar: '',
    paud: false, koperasi: false, jenisKoperasi: '', pendidikanKetrampilan: false, sandang: false, pangan: true,
    pekarangan: [], irt: [], tags: [],
  }
}

export function blankKeluarga(): NoMeta<Keluarga> {
  return {
    noKK: '', dasawisma: '', alamat: 'Mantup RT 08', sumberAir: 'Sumur', spal: true, kamarMandi: true, jumlahWC: '1',
    mckSeptic: true, makananPokok: 'Beras', kriteriaRumah: 'Layak Huni', rumahSehat: 'Sehat', tps: true,
    up2k: false, jenisUp2k: '', kesehatanLingkungan: true,
  }
}
