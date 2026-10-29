# Catatan Keputusan v1.0

Pemilik proyek menyerahkan keputusan teknis ("yang penting jadi dulu"). Berikut keputusan yang diambil dan alasannya — semuanya bisa diubah di versi berikutnya.

| # | Topik | Keputusan v1.0 | Alasan / rencana lanjutan |
|---|---|---|---|
| K1 | Penyimpanan data | Disimpan di **browser perangkat** (localStorage), plus **cadangan/pulihkan .json** dan ekspor Excel | Bisa langsung dipakai tanpa server/akun/biaya. Sinkron antar-HP (Supabase + login + hak akses per peran) dijadwalkan v1.1 — struktur data sudah siap |
| K2 | Login & peran | Belum ada di v1.0 | Ikut K1; tanpa server, login tidak melindungi apa pun. NIK tetap disamarkan di tampilan |
| K3 | Tanggal acuan umur | Dipilih per laporan (bawaan: hari ini) | Excel punya tanggal acuan tidak konsisten (sel 15-09-2026 vs judul 15 Oktober 2026) |
| K4 | Dasawisma "Drupadi" (tanpa I/II) | Diimpor apa adanya sebagai dasawisma terpisah + muncul di "Perlu Perhatian" | Perlu diputuskan orang yang tahu warganya. Perbaiki lewat **Data Warga → pilih → Ubah massal → dasawisma** |
| K5 | Batas umur | Balita < 5 th, Lansia ≥ 60 th | Bisa diubah di Pengaturan |
| K6 | Rentang rumus Excel (`$2:$179`) | Aplikasi menghitung **semua** warga | Memperbaiki bug warga baris terakhir tidak ikut rekap |
| K7 | Data rumah & sanitasi | Disimpan **per KK** (bukan per orang) | Di Excel diisi berulang tiap baris anggota |
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
| No KK | 61 | 61 |
| Penduduk 15–59 | 111 | 111 |
| WUS | 43 | 43 |
| PUS | 24 | 24 |
| Bayi lahir | 2 | 2 |

28 peringatan data (mis. 2 bayi tanpa No KK, 1 NIK tidak 16 digit, 20 warga dasawisma "Drupadi") ditampilkan saat impor.
