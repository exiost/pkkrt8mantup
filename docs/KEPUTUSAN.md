# Catatan Keputusan v1.0

Pemilik proyek menyerahkan keputusan teknis ("yang penting jadi dulu"). Berikut keputusan yang diambil dan alasannya — semuanya bisa diubah di versi berikutnya.

| # | Topik | Keputusan v1.0 | Alasan / rencana lanjutan |
|---|---|---|---|
| K1 | Penyimpanan data | **Dua mode**: lokal (browser) dan **server SQLite** dengan sinkronisasi antar perangkat | Mode lokal tetap ada agar bisa dipakai tanpa hosting; mode server untuk data bersama. Lihat docs/SERVER.md |
| K2 | Login & peran | Mode server: **login** dengan peran Admin / Pengurus / Pembaca | Mode lokal tidak punya login (data hanya ada di browser itu) |
| K3 | Tanggal acuan umur | Dipilih per laporan (bawaan: hari ini) | Excel punya tanggal acuan tidak konsisten (sel 15-09-2026 vs judul 15 Oktober 2026) |
| K4 | Dasawisma "Drupadi" (tanpa I/II) | Diimpor apa adanya sebagai dasawisma terpisah + muncul di "Perlu Perhatian" | Perlu diputuskan orang yang tahu warganya. Perbaiki lewat **Data Warga → pilih → Ubah massal → dasawisma** |
| K5 | Batas umur | Balita < 5 th, **Lansia ≥ 50 th** | Sama dengan rumus Excel (EDATE(acuan, -600)); bisa diubah di Pengaturan |
| K6 | Rentang rumus Excel (`$2:$179`) | Aplikasi menghitung **semua** warga | Memperbaiki bug warga baris terakhir tidak ikut rekap |
| K7 | Data rumah & sanitasi | Disimpan **per keluarga** (bukan per orang) | Di Excel diisi berulang tiap baris anggota |
| K8 | Pekarangan & IRT | Disimpan sebagai **daftar item** (kategori, komoditi, jumlah) | Menggantikan teks `"Cabe, 2 pot;"` + makro VBA |
| K9 | Warga "Tidak Ikut PKK" | Tetap tersimpan, tidak dihitung di laporan PKK | Sama dengan rumus Excel |
| K10 | Rekap Dawis 1/2, rekap ibu hamil dawis 1/2/CUSTOM | Digabung jadi satu laporan dengan pilihan Dasawisma | Tidak perlu tab duplikat; dasawisma baru otomatis didukung |
| K11 | Sheet1 (duplikat rekap ibu hamil April) | Jadi fitur **Arsip Laporan** (snapshot per bulan) | |
| K12 | Isian Kampung KB yang tidak ada di data master (PIK-R, BKR, BKL, UPPKA, alasan PUS tidak ber-KB) | Diketik langsung di laporan, tersimpan per bulan | Balita Posyandu/BKB dihitung otomatis dari data warga |
| K13 | Kolom kosong di Excel (Pekerjaan ke-2, jenis rukun kematian) | Pekerjaan ke-2 tidak dibawa; jenis rukun kematian tetap tersedia | |
| K14 | Kolom "Kesehatan" di Catatan Keluarga | Dicentang bila aktif posyandu atau akseptor KB | Excel tidak punya kolom sumber khusus |

## Hasil verifikasi impor file asli (tanggal acuan 15-09-2026)

| Ukuran | Excel | Aplikasi |
|---|---|---|
| Warga | 181 | 181 |
| Keluarga (ID, kolom DE) | 57 | 57 |
| Penduduk 15–59 | 111 | 111 |
| WUS | 43 | 43 |
| PUS | 24 | 24 |
| Bayi lahir | 2 | 2 |

28 peringatan data (mis. 2 bayi tanpa No KK, 1 NIK tidak 16 digit, 20 warga dasawisma "Drupadi") ditampilkan saat impor.

## Keputusan tambahan (versi 1.1)

| # | Topik | Keputusan | Alasan |
|---|---|---|---|
| K15 | Tampilan laporan | Desain dibaca otomatis dari file Excel asli → `src/sheet/templates.json` | Hasil cetak identik dengan sheet yang sudah disetujui |
| K16 | Keluarga | Keluarga = ID di kolom DE (nomor urut kepala keluarga). Warga satu ID dianggap satu keluarga walau No KK beda | Sesuai penjelasan pemilik; 57 keluarga, 5 di antaranya punya lebih dari satu No KK |
| K17 | Isian Ya / Tidak | Disimpan "Ya", "Tidak", atau kosong (belum diisi) | Excel membedakan kosong dari "Tidak" di formulir |
| K18 | Tanda tangan | Tidak ada | Tidak ada di sheet Excel |
| K19 | Kolom/kotak yang di Excel kosong (Alamat di Penduduk 15–59; 3 buta, ibu hamil, menyusui di Data Keluarga) | Tetap kosong; ada pilihan **“Isi kotak yang di Excel kosong”** | "Sama persis" bila tidak dicentang |
| K20 | Browser tidak bisa memecah kolom ke halaman berikutnya seperti Excel | Bila tabel lebih lebar dari kertas pada skala Excel, otomatis dikecilkan (bisa diubah di Atur cetak) | Mencegah tabel terpotong |
| K21 | Alamat per orang | Desa, kecamatan, kabupaten, provinsi disimpan per warga | Di Excel berbeda-beda per warga |
| K22 | Peran viewer | Hanya halaman Laporan (menu & alamat lain dialihkan); tidak bisa mengubah data, teks lembar, arsip, atau kunci tanggal. Beranda dan Impor/Ekspor hanya admin | Permintaan pemilik; dijaga juga di server (viewer tidak bisa menulis) |
| K23 | Kunci tanggal laporan | Admin mengunci tanggal acuan + bulan + tahun sekali, berlaku untuk semua laporan bagi akun viewer; viewer tidak melihat kontrol tanggal. Tanpa kunci: hari ini. Admin & editor tetap bebas memilih | Tanggal yang tercetak di judul lembar tetap tampil karena bagian dari hasil cetak seperti Excel |
| K24 | Status ibu per bulan | Catatan opsional `riwayatIbu` per ibu: satu entri per bulan (Hamil / Melahirkan / Nifas / Menyusui, cara lahir, “tetap dilaporkan Hamil”). Bila ada catatan, laporan bulan itu memakai catatan; bulan tanpa catatan tidak dilaporkan. Tanpa catatan sama sekali: memakai saklar lama (sama dengan Excel) | Laporan tahunan: ibu yang sudah melahirkan SC tetap ditulis Hamil di bulan itu |
| K25 | Urutan Status Ibu | Makin banyak status & info terisi, makin di atas (urutan baru diterapkan ±1 detik setelah saklar digeser agar kartu tidak melompat) | Permintaan pemilik |

### Perbedaan angka dengan Excel (kesalahan rumus di Excel)

| Lembar | Excel | Aplikasi | Penyebab |
|---|---|---|---|
| Kampung KB, Perguruan Tinggi (C26) | 13 | 8 | "Diploma IV / Strata I" terhitung dua kali di Excel. Jumlah KK per pendidikan kini = 50 = jumlah KK |
| Kampung KB, kelompok umur (C30–C37) | beberapa lebih kecil | semua warga terhitung | Batas tanggal di Excel melewatkan warga (mis. umur 6 th, dan umur batas atas yang sudah lewat ulang tahun) |
| Rekap (RT), baris Drupadi II kolom KRT/KK | memakai rumus Drupadi I | dihitung sendiri | Rumus C16 di Excel menyalin kriteria "Drupadi I" |
| Penduduk 15–59, kolom Riwayat Sakit | bergeser 1 baris | sejajar dengan namanya | Rumus G memakai `ROW()-4`, kolom lain `ROW()-5` |
| Rekap warga di baris > 179 | tidak ikut | ikut | Rumus Excel membaca sampai baris 179 saja |

Nilai lain yang dibandingkan (Rekap RT, Rekap per Dasawisma, WUS, PUS, Penduduk 15–59, Kampung KB bagian kependudukan dan KB) **cocok persis** dengan Excel — lihat `src/__tests__/impor.test.ts`.
