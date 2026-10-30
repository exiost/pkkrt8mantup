# PRD — SIWARGA PKK RT 08 Mantup

> **Pembaruan v1.1:** laporan kini direplikasi persis dari desain Excel, keluarga mengikuti ID (kolom DE), ada pengaturan cetak (skala/area cetak), dan tersedia mode server SQLite + login. Rincian keputusan: [KEPUTUSAN.md](./KEPUTUSAN.md), pemasangan server: [SERVER.md](./SERVER.md). Bagian di bawah adalah rencana awal.

**Sistem Informasi Data Warga & Laporan PKK berbasis Web (Desktop + Mobile)**

| | |
|---|---|
| Versi dokumen | 1.0 |
| Tanggal | 29 Oktober 2026 |
| Sumber | `Data_Warga_mantup_RT_8_VB.xlsm` (19 sheet, 1 modul VBA) |
| Wilayah | RT 08, Padukuhan Mantup, Kalurahan Baturetno, Kapanewon Banguntapan, Kab. Bantul, DIY |
| Pengguna utama | Kader / Sekretaris TP PKK RT 08, Ketua Dasawisma Drupadi I & Drupadi II |

---

## 1. Latar Belakang

Saat ini data warga dan semua laporan PKK dikelola di satu file Excel bermakro (`.xlsm`):

- **1 sheet master** (`DATA WARGA`): 181 warga (baris 2–182), 61 No KK unik, 57 kepala keluarga, 109 kolom.
- **18 sheet laporan / formulir** yang semuanya mengambil data dari master lewat rumus `INDEX/SMALL/AGGREGATE/COUNTIFS`.
- **5 makro VBA** untuk melengkapi nomor urut keluarga, sinkronisasi rumus Dawis, dan menampilkan data HATINYA PKK / IRT.

Masalah yang muncul:

1. **Hanya bisa dibuka di laptop dengan Excel.** Makro tidak jalan di HP, Excel Online, atau Google Sheets.
2. **Rumusnya rapuh.** Banyak rumus memakai rentang tetap (`$2:$179`, `$2:$180`, `$2:$282`). Data sekarang sudah sampai baris 182, jadi **beberapa warga terakhir tidak ikut terhitung** di rekap Dawis dan rekap ibu hamil. Makro `SinkronkanSemuaDawis` / `PulihkanDanPerbaikiSemua` dibuat untuk menambal masalah ini.
3. **Data tidak konsisten.** Contohnya `"Ya"` / `"ya"` / `"Ya  "`, `"Tidak "` dengan spasi, `"Laki - Laki "`, `"anak"` vs `"Anak"`, dasawisma `"Drupadi"` tanpa angka (20 warga), dan tanggal acuan yang tidak cocok (sel `J2` = 15 Sep 2026, judul tertulis 15 Oktober 2026).
4. **Data pekarangan & IRT berupa teks bebas** (`"Cabe, 2 pot; Pandan, 1 pot;"`) yang harus diurai makro.
5. **Formulir per-keluarga / per-orang** (`data keluarga`, `CATATAN KELUARGA`, `data warga tp pkk`, `HT_IRT`) harus diganti nomornya secara manual satu-satu sebelum dicetak.
6. **Data sensitif** (NIK, No KK, riwayat sakit, kontrasepsi) tersimpan di file yang mudah tersebar.

## 2. Tujuan & Sasaran

| # | Tujuan | Ukuran keberhasilan |
|---|---|---|
| G1 | Semua fungsi 19 sheet tersedia di web, bisa dipakai di HP & desktop | 100% sheet punya padanan halaman (lihat §5) |
| G2 | Setiap laporan bisa dicetak / disimpan sebagai PDF dengan tata letak formulir resmi | Cetak A4/F4 rapi tanpa terpotong, di Chrome/Edge/Safari |
| G3 | Input data cepat & valid | Tambah 1 warga ≤ 2 menit di HP; tidak ada lagi variasi ejaan |
| G4 | Rekap otomatis & selalu akurat | Angka rekap sama dengan hitungan manual; tidak ada batas jumlah baris |
| G5 | Tampilan menarik: berwarna, ikon, tag, animasi, popup | Skor kepuasan kader ≥ 4/5 |
| G6 | Data aman | Login wajib, NIK disamarkan, hak akses per peran |

**Di luar cakupan v1:** integrasi ke SIGA/Dukcapil, pembayaran iuran/jimpitan online, notifikasi WhatsApp otomatis (bisa di v2).

## 3. Persona & Peran

| Peran | Deskripsi | Hak akses |
|---|---|---|
| **Admin / Sekretaris PKK RT** | Pengelola utama | Semua data & laporan, kelola pengguna, impor/ekspor, pengaturan |
| **Ketua Dasawisma** | Ketua Drupadi I / Drupadi II | Lihat & ubah warga di dasawismanya, cetak laporan dasawismanya |
| **Kader** | Pencatat lapangan (posyandu, KB) | Tambah/ubah data kesehatan (ibu hamil, KB, posyandu), lihat laporan |
| **Pembaca (Ketua RT / Pengurus)** | Hanya melihat | Dashboard & laporan, NIK selalu disamarkan |

## 4. Ringkasan Struktur Data Sumber

### 4.1 Master `DATA WARGA` (109 kolom) → dikelompokkan jadi 9 bagian form

| Bagian | Kolom Excel | Field |
|---|---|---|
| **A. Identitas** | A–O | No, Nomor Urut KK, No KK, NIK, Nama, Jenis Kelamin, Tempat/Tgl Lahir, Agama, Pendidikan, Pekerjaan, Gol. Darah, Status Kawin, Tgl Nikah/Cerai, Status dalam Keluarga |
| **B. Alamat & Wilayah** | AJ–AN, AV, AW | Alamat, Desa, Kecamatan, Kabupaten, Provinsi, Dasawisma, Dusun |
| **C. Rumah & Sanitasi** (per KK) | AO–AT, AX–AZ | Sumber Air, SPAL, Kamar Mandi, Jumlah WC, Makanan Pokok, Kriteria Rumah, TPS |
| **D. Kegiatan PKK & Warga** | P–AB, AG–AI, BC, BD | Catatan, Ikut PKK, PPP (Penghayatan Pancasila), Kegiatan diikuti, Kerja Bakti (+jenis), Rukun Kematian (+jenis), Keagamaan (+jenis), Jimpitan, Arisan, Barang Bekas, Apotek Hidup, Jumantik, Jabatan |
| **E. Kesehatan & KB** | R, S, CC–CE, CP | Kontrasepsi, Riwayat Sakit (DM/Hipertensi), Aktif Posyandu (+frekuensi), BKB, Perencanaan Sehat |
| **F. Ibu & Anak** | BE–BT, CV–DD | Hamil, Hamil ke-, HPL, Melahirkan, Menyusui, Nifas, Ibu meninggal (hamil/melahirkan/nifas), Bayi lahir L/P, Nama & Tgl lahir bayi, Akte, Bayi/Balita meninggal (L/P, tanggal, sebab) |
| **G. Pendidikan & Ekonomi** | BU, BV, CF–CO, CQ, CR, BA, BB | 3 Buta, Berkebutuhan Khusus, Tabungan, Kelompok Belajar (Paket A/B/C/KF), PAUD, Koperasi (+jenis), Pendidikan Ketrampilan, Sandang, UP2K (+jenis) |
| **H. Pekarangan (HATINYA PKK)** | BW–CB | Peternakan, Perikanan, Warung Hidup, Toga, Tanaman Buah, Tanaman Lain → **diubah jadi tabel item** (komoditi + jumlah + satuan) |
| **I. Industri Rumah Tangga** | CS–CU | Kategori, Komoditi, Volume → **diubah jadi tabel item** |

Kolom hasil rumus (`AC` Umur WUS, `AD`, `AE` WUS, `AF` PUS, `AU` Umur, `DE` ID Keluarga) **tidak disimpan**, tapi dihitung otomatis oleh aplikasi.

### 4.2 Aturan Bisnis (diambil dari rumus Excel)

| Kode | Aturan | Sumber rumus |
|---|---|---|
| R1 | **Umur** = selisih tahun penuh antara tanggal lahir dan **tanggal acuan laporan** (bisa dipilih per laporan) | `AU`, `DATEDIF(...,"Y")` |
| R2 | **Penduduk 15–59**: umur 15–59 **dan** status PKK ≠ "Tidak Ikut PKK" | `AD` → sheet DATA PENDUDUK 15-59 |
| R3 | **WUS**: perempuan, umur 15–49, ikut PKK | `AE` → DATA WUS PER BULAN |
| R4 | **PUS**: status keluarga = Istri, status kawin = Kawin Tercatat, umur ≤ 49, ikut PKK. Dikelompokkan <15, 15–19, 20–34, 35–49 | `AF` → DATA PUS PER BULAN |
| R5 | **Keluarga**: semua anggota dengan No KK yang sama; Kepala Keluarga = status "Kepala Keluarga". Menggantikan kolom `B` / `DE` dan makro `LengkapiNomorUrutKeluarga` | VBA Module1 |
| R6 | **Nama Suami** dari ibu = Kepala Keluarga dalam KK yang sama | `LOOKUP(2,1/...SEARCH("Kepala"...))` |
| R7 | **Status ibu**: Hamil > Melahirkan > Nifas (prioritas tampilan) | rekap ibu hamil dawis |
| R8 | **Rekap per Dasawisma** dihitung per kepala keluarga (KRT/KK), dipisah L/P, balita, PUS, WUS, ibu hamil, menyusui, lansia, 3 buta, berkebutuhan khusus, kriteria rumah, sanitasi, air, makanan pokok, UP2K, pekarangan, IRT, kesehatan lingkungan | REKAP CAT DATA KEG DAWIS 1/2 |
| R9 | **Balita** umur < 5 th; **Lansia** umur ≥ 60 th (dibuat bisa diatur di Pengaturan) | rekap catatan |
| R10 | Kelompok umur Kampung KB: 1–<2, 2–<5, 5–6, 7–14, 15–24, 25–49, 50–<65, >65; plus 18–56, remaja putri 12–17, perempuan subur 15–49 | INVENTARISASI KAMPUNG KB |
| R11 | Pendidikan KK dipetakan: Tidak Sekolah / Tidak Lulus SD / SD / SLTP / SLTA / Perguruan Tinggi | INVENTARISASI KAMPUNG KB |
| R12 | Warga dengan status "Tidak Ikut PKK" tetap tersimpan tapi tidak dihitung di laporan PKK (bisa ditampilkan dengan toggle) | semua `COUNTIFS ... "<>Tidak Ikut PKK"` |

## 5. Pemetaan Sheet → Modul Aplikasi

Setiap sheet Excel punya **halaman layar** (interaktif, bisa filter & cari) dan **halaman cetak** (meniru tata letak formulir resmi).

| # | Sheet Excel | Modul / Halaman Web | Tipe | Ikon | Warna tag |
|---|---|---|---|---|---|
| 1 | DATA WARGA | **Data Warga** (tabel + form 9 bagian + detail) | Master | `Users` | Indigo |
| 2 | DATA PENDUDUK 15-59 | Laporan **Penduduk 15–59 th** | Daftar | `UserCheck` | Sky |
| 3 | DATA WUS PER BULAN | Laporan **WUS per Bulan** | Daftar | `Flower2` | Pink |
| 4 | DATA PUS PER BULAN | Laporan **PUS per Bulan** (+kelompok umur & alkon) | Daftar | `HeartHandshake` | Rose |
| 5 | PENCATATAN IBU HAMIL, KB, PUS | **Pencatatan Ibu Hamil & Peserta KB Baru** | Daftar | `Baby` | Fuchsia |
| 6 | INVENTARISASI KAMPUNG KB | Laporan **Inventarisasi Kampung KB** (I. Kependudukan, II. KB, III. Ketahanan Keluarga) | Rekap | `Home` | Emerald |
| 7 | data warga tp pkk | Formulir **Data Warga TP PKK** (per orang, pilih warga) | Formulir | `IdCard` | Violet |
| 8 | data keluarga | Formulir **Data Keluarga** (per KK, pilih keluarga) | Formulir | `House` | Amber |
| 9 | CATATAN KELUARGA | Formulir **Catatan Keluarga** (per KK, 19 kolom kegiatan) | Formulir | `NotebookPen` | Orange |
| 10 | rekap catatan data dan kegiatan | **Rekap Catatan Data & Kegiatan – tingkat RT** (baris = dasawisma) | Rekap | `Table` | Teal |
| 11 | REKAP CAT DATA KEG DAWIS 1 | **Rekap Catatan – per Dasawisma** (pilih Drupadi I) | Rekap | `LayoutList` | Teal |
| 12 | REKAP CAT DATA KEG DAWIS 2 | (halaman sama, pilih Drupadi II) | Rekap | `LayoutList` | Teal |
| 13 | REKAPITULASI DATA IBU HAMIL | **Rekap Ibu Hamil/Melahirkan/Nifas – tingkat RT** (per bulan) | Rekap | `Activity` | Red |
| 14 | Sheet1 | (duplikat #13 bulan April → jadi **arsip laporan bulanan**) | Arsip | `Archive` | Slate |
| 15 | rekap ibu hamil dawis 1 | **Catatan Ibu Hamil, Kelahiran & Kematian – per Dasawisma** | Daftar | `Stethoscope` | Red |
| 16 | rekap ibu hamil dawis 2 | (halaman sama, pilih Drupadi II) | Daftar | `Stethoscope` | Red |
| 17 | rekap ibu hamil dawis CUSTOM | (halaman sama, filter bebas: dasawisma, bulan, status) | Daftar | `SlidersHorizontal` | Red |
| 18 | bayi lahir | **Register Kelahiran & Kematian Bayi/Balita** | Master | `BabyIcon` | Cyan |
| 19 | HT_IRT | **HATINYA PKK & IRT** (pilih warga: pekarangan + industri rumah tangga) | Formulir | `Sprout` | Lime |

Selain itu ada halaman tambahan: **Dashboard**, **Keluarga (KK)**, **Pengaturan**, **Impor/Ekspor**, **Riwayat Perubahan**.

## 6. Kebutuhan Fungsional

### F0. CRUD Menyeluruh (Tambah · Lihat · Ubah · Hapus)

Semua data yang di Excel bisa diketik, di aplikasi bisa **dibuat, dilihat, diubah, dan dihapus** lewat layar, tanpa menyentuh rumus.

#### F0.1 Matriks CRUD per data

| Data | Create | Read | Update | Delete | Catatan |
|---|---|---|---|---|---|
| Warga | ✅ wizard 9 bagian / form cepat | ✅ tabel, kartu, detail | ✅ per bagian / inline | ✅ soft delete → Tempat Sampah | Bisa duplikat warga sebagai template |
| Keluarga (KK) | ✅ (sekaligus tambah Kepala Keluarga) | ✅ | ✅ data rumah & sanitasi | ✅ hanya jika tanpa anggota, atau pilih "hapus beserta anggota" | Pindah anggota, pecah/gabung KK |
| Anggota keluarga | ✅ dari halaman KK | ✅ | ✅ status dalam keluarga, urutan | ✅ keluarkan dari KK | Urutan bisa digeser (drag) |
| Dasawisma | ✅ | ✅ | ✅ nama, ketua, warna | ✅ hanya jika kosong / pindahkan warga dulu | Tidak lagi terbatas Drupadi I & II |
| Kegiatan warga (PPP, kerja bakti, dll.) | ✅ | ✅ | ✅ Y/T + jenis | ✅ | Bisa ubah massal per dasawisma |
| Status ibu (hamil/melahirkan/menyusui/nifas) | ✅ | ✅ riwayat | ✅ tanggal, HPL, hamil ke- | ✅ | Riwayat tidak tertimpa |
| Kelahiran bayi | ✅ | ✅ register | ✅ | ✅ | Opsi otomatis buat data warga bayi |
| Kematian ibu/bayi/balita | ✅ | ✅ | ✅ | ✅ | Warga terkait otomatis berstatus "Meninggal" |
| Peserta KB baru | ✅ | ✅ | ✅ | ✅ | |
| Item pekarangan (HATINYA PKK) | ✅ | ✅ | ✅ inline di tabel | ✅ | Menggantikan teks `"Cabe, 2 pot;"` |
| Item IRT | ✅ | ✅ | ✅ inline | ✅ | |
| Isian manual Kampung KB (PIK-R, BKR, BKL, UPPKA, PUS bukan KB) | ✅ per bulan | ✅ | ✅ | ✅ | Langsung diketik di halaman laporan |
| Arsip laporan bulanan | ✅ "Simpan arsip" | ✅ | ✏️ judul/catatan saja | ✅ | Isi angka dikunci (snapshot) |
| Tag kustom | ✅ | ✅ | ✅ nama, warna, ikon | ✅ (dilepas dari semua warga) | Tag otomatis tidak bisa dihapus |
| Daftar pilihan (agama, pendidikan, pekerjaan, alkon, jabatan, satuan, …) | ✅ | ✅ | ✅ ganti nama → ikut berubah di semua data | ✅ hanya jika tidak dipakai, atau gabungkan ke nilai lain | |
| Pengaturan wilayah & penanda tangan | — | ✅ | ✅ | — | Satu set per RT |
| Pengguna | ✅ undang via email | ✅ | ✅ peran, dasawisma, aktif/nonaktif | ✅ nonaktifkan | Hanya Admin |

#### F0.2 Perilaku standar semua CRUD
- **Create**: tombol ➕ (FAB di HP, tombol "Tambah" berwarna di desktop) → dialog/halaman form; setelah simpan muncul toast ✅ dan opsi "Tambah lagi".
- **Read**: daftar dengan cari, filter, urut, pagination; klik baris → detail di drawer (desktop) / halaman (HP).
- **Update**: tombol ✏️ di detail, atau **edit inline** langsung di sel tabel (klik dua kali di desktop) untuk field sederhana; perubahan yang belum disimpan ditandai dan diperingatkan jika halaman ditutup.
- **Delete**: dialog konfirmasi merah dengan nama data, lalu **toast "Urungkan" (Undo) 5 detik**. Data masuk Tempat Sampah 30 hari dan bisa dipulihkan (Admin bisa hapus permanen).
- **Aksi massal**: pilih banyak baris → ubah field yang sama, beri tag, pindah dasawisma, hapus, ekspor.
- **Validasi** sama di klien (Zod) dan server (constraint DB); pesan kesalahan tampil di bawah field dalam Bahasa Indonesia.
- **Kunci bentrok**: jika dua orang mengubah data yang sama, yang kedua mendapat peringatan "Data sudah diubah oleh X" dan bisa melihat perbedaannya.
- **Audit**: setiap Create/Update/Delete tercatat (F10).
- **Dari halaman laporan & formulir**: setiap nama warga/KK bisa diklik → popup ubah cepat, lalu laporan langsung diperbarui. Jadi seperti Excel, data bisa dibetulkan saat sedang melihat laporan.

#### F0.3 Hak CRUD per peran

| Data | Admin | Ketua Dasawisma | Kader | Pembaca |
|---|---|---|---|---|
| Warga, Keluarga, Kegiatan, Pekarangan, IRT | CRUD | CRUD (dasawismanya) | R + U kesehatan/KB | R |
| Ibu & Anak, Kelahiran, Kematian, KB | CRUD | CRUD (dasawismanya) | CRUD | R |
| Isian Kampung KB, Arsip laporan | CRUD | R | CRU | R |
| Dasawisma, Tag, Daftar pilihan, Pengaturan | CRUD | R (tag: CRU) | R | R |
| Pengguna | CRUD | — | — | — |
| Hapus permanen / pulihkan Tempat Sampah | ✅ | pulihkan saja | — | — |

### F1. Autentikasi & Hak Akses
- F1.1 Login email + password (atau magic link); sesi tetap login di HP.
- F1.2 Peran: Admin, Ketua Dasawisma, Kader, Pembaca (§3). Ketua Dasawisma otomatis terfilter ke dasawismanya.
- F1.3 NIK & No KK tampil tersamar (`3402 •••• •••• 0006`) kecuali untuk Admin. Ada tombol mata 👁 untuk menampilkan (tercatat di log).

### F2. Dashboard
- F2.1 Kartu statistik beranimasi (angka naik/count-up): Total Warga, KK, L/P, Balita, WUS, PUS, Ibu Hamil, Lansia.
- F2.2 Grafik: piramida umur, donat agama/pendidikan/pekerjaan, batang per dasawisma, tren kelahiran per bulan.
- F2.3 Kartu "Perlu Perhatian": ibu hamil dengan HPL ≤ 30 hari, warga tanpa NIK/tanggal lahir, data duplikat NIK, warga dasawisma belum diisi.
- F2.4 Ulang tahun minggu ini (opsional, bisa dimatikan).
- F2.5 Akses cepat ke 19 laporan dalam bentuk grid kartu berwarna dengan ikon.

### F3. Data Warga (pengganti sheet DATA WARGA)
- F3.1 **Tabel** dengan cari (nama/NIK/KK), filter (dasawisma, JK, umur, status keluarga, ikut PKK, tag), urutkan, pilih kolom yang tampil, pagination / infinite scroll.
- F3.2 **Tampilan HP**: kartu warga (avatar inisial berwarna sesuai JK, nama, umur, tag), geser kiri untuk aksi (ubah/hapus).
- F3.3 **Form tambah/ubah** berbentuk **wizard 9 langkah** (§4.1) dengan progress bar; di desktop berupa tab samping.
  - Semua pilihan berupa dropdown/chip (tidak ada ketik bebas untuk nilai baku) → mengatasi `"Ya"/"ya"/"Ya "`.
  - Validasi: NIK & No KK 16 digit angka, NIK unik, tanggal lahir ≤ hari ini, HPL > hari ini saat hamil.
  - Isi otomatis dari NIK: tanggal lahir & jenis kelamin (digit 7–12, perempuan +40) sebagai saran.
  - Data rumah/sanitasi (bagian C) diisi **sekali per KK** dan dipakai bersama semua anggota.
  - Pekarangan & IRT diisi sebagai daftar item: **[+ Tambah]** → Kategori, Komoditi, Jumlah, Satuan (pot/pohon/ekor/pcs per hari).
- F3.4 **Detail warga**: halaman profil dengan header berwarna, umur otomatis, tag, timeline (lahir, nikah, hamil, melahirkan, dsb.), anggota keluarga lain.
- F3.5 Hapus = pindah ke **Tempat Sampah** (bisa dipulihkan 30 hari). Status warga: Aktif / Pindah / Meninggal (tidak dihapus, tidak dihitung di laporan).
- F3.6 Aksi massal: ubah dasawisma, ubah tag, ekspor terpilih.
- F3.7 **Tag** bebas berwarna (mis. `Lansia`, `Disabilitas`, `Kader`, `Pengurus RT`, `Penerima Bantuan`) + **tag otomatis** dari aturan: `WUS`, `PUS`, `Balita`, `Lansia`, `Ibu Hamil`, `Menyusui`, `Nifas`, `Hipertensi`, `DM`, `Akseptor KB`, `Tidak Ikut PKK`.

### F4. Keluarga (KK)
- F4.1 Daftar KK: kepala keluarga, jumlah anggota (L/P), dasawisma, kriteria rumah — tampil sebagai kartu.
- F4.2 Detail KK: anggota (urut: KK, istri, anak, famili lain), data rumah & sanitasi, ringkasan balita/PUS/WUS/ibu hamil/menyusui/lansia/3 buta.
- F4.3 Pindah anggota antar-KK, pecah KK.

### F5. Kesehatan Ibu & Anak
- F5.1 Catat status ibu: hamil (hamil ke-, HPL), melahirkan, menyusui, nifas — dengan **tanggal mulai/selesai**, jadi bisa dibuat laporan per bulan (Excel sekarang hanya status saat ini).
- F5.2 Catat kelahiran → otomatis menawarkan **"Tambahkan bayi sebagai warga baru"** ke KK yang sama.
- F5.3 Catat kematian ibu / bayi / balita (tanggal, sebab, JK).
- F5.4 Catat peserta KB baru (tgl KB, tempat, jenis alkon, jaminan kesehatan, jumlah anak).
- F5.5 Pengingat HPL (badge merah berkedip di dashboard).

### F6. Laporan (19 halaman, §5)
Setiap laporan punya:
- F6.1 **Parameter di atas**: tanggal acuan / bulan & tahun, dasawisma, (opsional) toggle "termasuk Tidak Ikut PKK". Nilainya diingat.
- F6.2 **Tampilan layar**: tabel berwarna, baris total tebal, angka bisa diklik → popup daftar nama warga di balik angka itu (drill-down).
- F6.3 **Tombol Cetak** 🖨 → membuka **Pratinjau Cetak** (§F7).
- F6.4 Tombol **Ekspor Excel** (.xlsx) dan **Unduh CSV**.
- F6.5 Kop laporan otomatis dari Pengaturan (RT, Padukuhan, Kalurahan, Kapanewon, Kabupaten, Provinsi, Tahun, Bulan).
- F6.6 Formulir per-orang/KK (data warga tp pkk, data keluarga, catatan keluarga, HT_IRT) punya pemilih warga/KK dengan pencarian + tombol ◀ ▶ untuk pindah ke berikutnya, dan **"Cetak Semua"** (satu halaman per KK/orang, dipisah page-break).

Rincian per laporan:

| Laporan | Kolom / isi |
|---|---|
| Penduduk 15–59 | No, Nama, NIK, Tgl Lahir, JK, Alamat, Riwayat Sakit (DM/Hipertensi) |
| WUS per Bulan | No, NIK, Nama, Tgl Lahir, Umur, Status |
| PUS per Bulan | No, Nama Istri, Tgl Lahir, Umur, ✓ kelompok umur (<15, 15–19, 20–34, 35–49), Jenis Alkon |
| Pencatatan Ibu Hamil & KB Baru | A: Nama Istri, Umur, Nama Suami, Hamil ke-, HPL. B: Nama Istri, Umur, Nama Suami, RT, Jaminan Kesehatan, Jml Anak, Tgl KB, Tempat KB, Jenis Alkon |
| Inventarisasi Kampung KB | I.1 KK per JK; I.2 Penduduk per JK; I.3 KK per pendidikan; I.4 Jiwa per kelompok umur (+18–56, remaja putri 12–17, perempuan 15–49). II.1 PUS per umur wanita; II.2 KB per kontrasepsi (IUD, MOW, MOP, Implan, Suntik, Pil, Kondom); II.3 PUS bukan peserta KB (hamil, ingin anak segera, ditunda, tidak ingin lagi). III.1 Balita ikut Posyandu/BKB; III.2 Remaja ikut PIK-R/BKR; III.3 Lansia & keluarga lansia ikut BKL; III.4 Kelompok UPPKA |
| Data Warga TP PKK | Formulir biodata (No Registrasi, NIK, Nama, Jabatan, JK, TTL/Umur, Status Kawin, Status Keluarga, Agama, Alamat…, Pendidikan, Pekerjaan, Akseptor KB, Posyandu + frekuensi, BKB, Tabungan, Kelompok Belajar + jenis, PAUD, Koperasi + jenis) + tabel Kegiatan Warga (9 kegiatan, Y/T + keterangan). Pilihan ditandai kotak centang ☑ |
| Data Keluarga | Kop (Dasawisma, RT, Dusun, Desa, Kec, Kab, Prov), Nama KRT, jumlah anggota L/P, jumlah KK, Balita, PUS, WUS, 3 Buta, Ibu Hamil, Menyusui, Lansia; tabel anggota (No Reg, Nama, Status dlm Keluarga, Status Kawin, JK L/P, Tgl Lahir/Umur, Pendidikan, Pekerjaan); butir 3–10 (makanan pokok, MCK & septic tank + jumlah, sumber air, tempat sampah, SPAL, kriteria rumah, UP2K + jenis, kesehatan lingkungan) |
| Catatan Keluarga | Kop (nama KK, dasawisma, tahun, kriteria rumah, jamban + jumlah, sumber air, tempat sampah); tabel 19 kolom: Nama, Status Kawin, L/P, Tempat Lahir, Tgl Lahir/Umur, Agama, Pendidikan, Pekerjaan, Berkebutuhan Khusus, 8 kegiatan PKK (Penghayatan Pancasila, Gotong Royong, Pendidikan & Ketrampilan, Pengembangan Kehidupan Berkoperasi, Pangan, Sandang, Kesehatan, Perencanaan Sehat), Ket |
| Rekap Catatan Data & Kegiatan (RT / per Dasawisma) | 30 kolom: Nama Dasawisma atau Nama KRT, Jml KRT, Jml KK, Anggota L/P, Balita L/P, PUS, WUS, Ibu Hamil, Ibu Menyusui, Lansia, 3 Buta, Berkebutuhan Khusus, Rumah Sehat Layak Huni / Tidak, Tempat Sampah, SPAL, MCK & Septic Tank, Air PDAM/Sumur/DLL, Beras/Non Beras, UP2K, Pemanfaatan Pekarangan, Industri RT, Kesehatan Lingkungan, Ket + baris JUMLAH |
| Rekap Ibu Hamil (RT) | per Dasawisma: Ibu Hamil, Melahirkan, Nifas, Meninggal; Bayi Lahir L/P; Akte Ada/Tidak; Bayi Meninggal L/P; Balita Meninggal L/P; Ket + JUMLAH; catatan kaki *ibu meninggal karena hamil/melahirkan/nifas |
| Ibu Hamil per Dasawisma | Nama Ibu, Nama Suami, Status, Nama Bayi, JK L/P, Tgl Lahir, Akte Ada/Tidak, Nama Ibu/Balita/Bayi meninggal, Status, JK, Tgl Meninggal, Sebab, Ket |
| Register Kelahiran | Dasawisma, Nama Ibu, Suami, Hamil/Melahirkan/Nifas, Bayi, JK, Tgl Lahir, Akte, data kematian, Ket |
| HATINYA PKK & IRT | Pilih warga; Tabel 1 Pemanfaatan Pekarangan (No, Kategori, Komoditi, Jumlah); Tabel 2 Industri Rumah Tangga (No, Kategori, Komoditi, Volume) + rekap total semua warga |

### F7. Cetak & PDF
- F7.1 **Pratinjau Cetak** dalam popup layar penuh: pilih ukuran kertas (A4 / F4 / Legal), orientasi (otomatis: rekap 30 kolom = lanskap, formulir = potret), margin, skala (pas lebar), tampilkan/sembunyikan kolom NIK, tanggal & tempat tanda tangan.
- F7.2 Tombol **Cetak** memanggil dialog cetak browser (`window.print()`), jadi pengguna bisa pilih printer **atau "Simpan sebagai PDF"** — sesuai permintaan.
- F7.3 CSS cetak khusus (`@media print`, `@page`): latar putih, garis tabel hitam tipis, warna tag jadi tulisan (hemat tinta, opsi "cetak berwarna"), header tabel diulang di setiap halaman, tidak ada baris yang terpotong, nomor halaman "Hal x dari y".
- F7.4 Blok **tanda tangan** (Mengetahui Ketua TP PKK RT / Ketua Dasawisma / Pembuat) dengan nama dari Pengaturan.
- F7.5 **Cetak Massal**: semua formulir Data Keluarga / Catatan Keluarga per dasawisma dalam satu dokumen.
- F7.6 Pada HP: tombol cetak tetap berfungsi (Android "Simpan PDF", iOS "Bagikan → Cetak").

### F8. Impor / Ekspor / Cadangan
- F8.1 **Impor dari file Excel lama** (`.xlsm/.xlsx`, sheet DATA WARGA): pemetaan kolom otomatis, pembersihan nilai (trim spasi, samakan kapital, `"Drupadi"` → minta pilih I/II), uraian teks pekarangan/IRT jadi item, laporan hasil (berhasil / peringatan / gagal) sebelum disimpan.
- F8.2 Impor `bayi lahir` ke register kelahiran.
- F8.3 Ekspor seluruh data ke `.xlsx` dengan struktur kolom yang sama seperti DATA WARGA lama (agar tetap bisa dipakai di Excel).
- F8.4 Cadangan JSON otomatis harian (Admin bisa unduh).

### F9. Pengaturan
- Identitas wilayah (kop laporan), daftar Dasawisma (bisa tambah), nama pejabat penanda tangan, tanggal acuan bawaan, batas umur balita/lansia, daftar pilihan (agama, pendidikan, pekerjaan, alkon, jabatan, kegiatan, kategori pekarangan/IRT, satuan), warna & ikon tag, tema terang/gelap.

### F10. Riwayat & Audit
- Setiap tambah/ubah/hapus dicatat (siapa, kapan, field apa, sebelum → sesudah). Tampil di detail warga sebagai timeline.

### F11. Offline & PWA
- Bisa "Instal ke layar utama" (PWA) dengan ikon PKK.
- Data terakhir dapat dibaca saat offline; input offline disimpan antrean lalu disinkronkan saat online (v1.1).

## 7. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| Responsif | Mobile-first, breakpoint 360 / 768 / 1024 / 1440 px. Navigasi bawah (bottom nav) di HP, sidebar di desktop |
| Kinerja | Muat awal < 3 dtk di 4G; rekap 1.000 warga < 300 ms (dihitung di klien) |
| Keamanan | HTTPS, Row Level Security per dasawisma, NIK disamarkan, kata sandi ≥ 8 karakter, sesi kedaluwarsa 30 hari |
| Privasi | Sesuai UU PDP No. 27/2022: data hanya untuk keperluan PKK, ada halaman kebijakan privasi, ekspor hanya Admin |
| Aksesibilitas | Kontras WCAG AA, ukuran sentuh ≥ 44 px, ukuran huruf bisa diperbesar, `prefers-reduced-motion` mematikan animasi |
| Bahasa | Bahasa Indonesia; format tanggal `15 Oktober 2026`, angka `1.234` |
| Browser | Chrome/Edge/Firefox/Safari 2 versi terakhir, Android 9+, iOS 15+ |
| Ketersediaan | Hosting gratis/murah (Vercel/Netlify + Supabase free tier cukup untuk 1 RT) |

## 8. Desain UI/UX — "Penuh Warna & Enak Dilihat"

### 8.1 Gaya visual
- Nuansa **ceria-profesional**: latar lembut (`slate-50`), kartu putih membulat (`rounded-2xl`), bayangan halus, aksen gradasi.
- **Warna utama**: Ungu-Indigo PKK (`#6D28D9 → #4F46E5`), aksen Pink (`#EC4899`) & Kuning (`#F59E0B`).
- Setiap modul punya **warna identitas** (§5) yang dipakai di ikon, header halaman, dan chip.
- Font: **Plus Jakarta Sans** (judul) + **Inter** (isi); angka tabel `tabular-nums`.
- Mode gelap tersedia.

### 8.2 Ikon
- Pustaka **Lucide** (ikon garis konsisten) + ilustrasi kecil di empty state (mis. "Belum ada ibu hamil bulan ini 🌸").
- Ikon per field penting: 🩸 gol. darah, 🎂 umur, 🏠 dasawisma, ♂/♀ JK berwarna biru/pink.

### 8.3 Tagging (chip berwarna)
| Tag | Warna | Ikon |
|---|---|---|
| Laki-laki / Perempuan | Biru / Pink | `Mars` / `Venus` |
| Kepala Keluarga | Indigo | `Crown` |
| Balita | Kuning | `Baby` |
| WUS | Pink | `Flower2` |
| PUS | Rose | `HeartHandshake` |
| Ibu Hamil | Fuchsia, berdenyut | `Baby` |
| Menyusui / Nifas | Ungu muda | `Milk` |
| Lansia | Abu-coklat | `Armchair` |
| Hipertensi / DM | Merah | `HeartPulse` |
| Akseptor KB | Hijau | `ShieldCheck` |
| Tidak Ikut PKK | Abu, garis putus-putus | `CircleSlash` |
| Drupadi I / Drupadi II | Teal / Oranye | `Users` |
| Tag kustom | Pilih dari 12 warna | Pilih ikon |

### 8.4 Animasi & efek (Framer Motion)
- Transisi halaman: geser + pudar (200 ms).
- Kartu statistik: **count-up** angka, muncul berurutan (stagger).
- Hover kartu: naik sedikit + bayangan berwarna.
- Tombol: efek tekan (scale 0.97) + ripple.
- Grafik: animasi tumbuh saat tampil.
- Simpan berhasil: **toast** hijau ✅ + konfeti kecil saat menambah warga baru / kelahiran 🎉.
- Skeleton loading berkilau saat memuat.
- Tag Ibu Hamil dengan HPL dekat: berdenyut halus.
- Semua animasi mati bila pengguna memilih "kurangi gerakan".

### 8.5 Popup & interaksi
- **Modal/Dialog**: form cepat, konfirmasi hapus (dengan ikon peringatan merah), pratinjau cetak.
- **Bottom Sheet** di HP untuk filter & aksi.
- **Drawer** samping di desktop untuk detail warga tanpa pindah halaman.
- **Toast** untuk notifikasi; **Tooltip** penjelasan istilah (WUS, PUS, SPAL, UP2K, 3 Buta, HATINYA PKK).
- **Command palette** (`Ctrl+K`) untuk mencari warga/laporan cepat.
- **Onboarding tour** singkat pertama kali login.

### 8.6 Navigasi
- **Desktop**: sidebar berikon dengan grup — Beranda · Data (Warga, Keluarga, Kesehatan Ibu & Anak, Pekarangan & IRT) · Laporan (Kependudukan, KB, Dasawisma, Ibu & Anak, Formulir) · Pengaturan.
- **HP**: bottom nav 5 tombol — Beranda, Warga, ➕ (tombol tengah besar, FAB), Laporan, Lainnya.
- Halaman **Laporan** = grid kartu berwarna (seperti tab Excel, tapi lebih mudah), bisa difavoritkan ⭐.

## 9. Model Data (ringkas)

```
settings(id, rt, padukuhan, kalurahan, kapanewon, kabupaten, provinsi, ketua_pkk, sekretaris, tgl_acuan_default, umur_balita, umur_lansia)
dasawisma(id, nama, ketua_warga_id, warna)
keluarga(id, no_kk, dasawisma_id, alamat, desa, kecamatan, kabupaten, provinsi, dusun,
         sumber_air, spal, kamar_mandi, jumlah_wc, makanan_pokok, kriteria_rumah, rumah_sehat, tps,
         up2k, jenis_up2k, kesehatan_lingkungan, status)
warga(id, keluarga_id, no_registrasi, nik, nama, jk, tempat_lahir, tgl_lahir, agama, pendidikan, pekerjaan,
      gol_darah, status_kawin, tgl_nikah_cerai, status_keluarga, ikut_pkk, jabatan, catatan,
      kontrasepsi, riwayat_sakit[], aktif_posyandu, frek_posyandu, bkb, perencanaan_sehat,
      tiga_buta, berkebutuhan_khusus, tabungan, kelompok_belajar, jenis_kelompok_belajar, paud,
      koperasi, jenis_koperasi, pendidikan_ketrampilan, sandang, jumantik, status_warga, deleted_at)
kegiatan_warga(warga_id, kegiatan, ikut bool, jenis)   -- PPP, Kerja Bakti, Rukun Kematian, Keagamaan, Jimpitan, Arisan, Barkas, Apotek Hidup, Lain-lain
status_ibu(id, warga_id, jenis[hamil|melahirkan|menyusui|nifas|meninggal], hamil_ke, hpl, tgl_mulai, tgl_selesai, sebab)
kelahiran(id, ibu_id, nama_bayi, jk, tgl_lahir, akte bool, bayi_warga_id)
kematian(id, warga_id?, nama, kategori[ibu|bayi|balita], jk, tgl, sebab)
peserta_kb(id, warga_id, tgl_kb, tempat_kb, jenis_alkon, jaminan_kesehatan, jumlah_anak)
pekarangan_item(id, warga_id, kategori[Peternakan|Perikanan|Warung Hidup|Toga|Tanaman Buah|Lain-lain], komoditi, jumlah, satuan)
irt_item(id, warga_id, kategori, komoditi, volume, satuan)
tag(id, nama, warna, ikon) ; warga_tag(warga_id, tag_id)
master_pilihan(grup, nilai, urutan)
audit_log(id, user_id, tabel, record_id, aksi, sebelum jsonb, sesudah jsonb, waktu)
pengguna(id, email, nama, peran, dasawisma_id)
```

Kolom rumus Excel (umur, WUS, PUS, ID keluarga) → **fungsi turunan** di kode (`hitungUmur`, `isWUS`, `isPUS`, `isBalita`, `isLansia`), selalu memakai tanggal acuan laporan.

## 10. Stack Teknologi (rekomendasi)

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** | Cepat, ekosistem besar |
| UI | **Tailwind CSS + shadcn/ui (Radix)** | Komponen modal/drawer/toast/tooltip siap pakai & aksesibel |
| Ikon | **lucide-react** | Konsisten, ringan |
| Animasi | **Framer Motion** + canvas-confetti | Animasi halus, mudah dimatikan |
| Grafik | **Recharts** | Grafik responsif |
| Tabel | **TanStack Table** + TanStack Virtual | Filter/sort/kolom, ribuan baris lancar |
| Form | **React Hook Form + Zod** | Validasi NIK, tanggal, dsb. |
| Data & Auth | **Supabase** (PostgreSQL + Auth + Row Level Security) | Gratis untuk skala RT, sinkron antar-HP & laptop |
| State/Cache | TanStack Query | Cache & sinkronisasi |
| Excel | **SheetJS (xlsx)** | Impor `.xlsm` lama & ekspor `.xlsx` |
| Cetak | CSS `@media print` + `@page` + `window.print()` | Tanpa server, hasil bisa "Simpan sebagai PDF" |
| PWA | vite-plugin-pwa | Bisa diinstal di HP, cache offline |
| Hosting | Vercel / Netlify | Gratis, HTTPS otomatis |
| Uji | Vitest (aturan R1–R12), Playwright (alur + cetak) | Menjamin angka rekap benar |

## 11. Kriteria Penerimaan Utama

1. Impor file `.xlsm` saat ini menghasilkan **181 warga & 61 KK**, dengan daftar peringatan untuk nilai tidak baku (mis. 2 warga tanpa No KK, KK tanpa Kepala Keluarga).
2. Untuk tanggal acuan yang sama, angka WUS, PUS, Penduduk 15–59 dan rekap Dawis **sama** dengan Excel (setelah koreksi bug rentang baris — selisih karena bug harus dijelaskan di laporan impor).
3. Ke-19 laporan bisa dibuka, difilter, dicetak, dan disimpan PDF dari Chrome desktop & Chrome Android tanpa tabel terpotong.
4. Ketua Dasawisma Drupadi I tidak bisa melihat/mengubah warga Drupadi II.
5. Setiap data di matriks F0.1 bisa ditambah, dilihat, diubah, dan dihapus (lalu dipulihkan) dari HP maupun desktop, dan perubahannya langsung terlihat di semua laporan terkait.
6. Semua halaman bisa dipakai di layar 360 px tanpa scroll horizontal (kecuali tabel lebar dengan scroll di dalam kartu).
7. Lighthouse: Performance ≥ 85, Accessibility ≥ 90, PWA installable.

## 12. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Data pribadi bocor | RLS, NIK disamarkan, ekspor hanya Admin, audit log, jangan simpan file Excel asli di repo |
| Kader kurang terbiasa aplikasi | Wizard sederhana, tooltip istilah, tour, tampilan mirip formulir kertas |
| Tabel rekap 30 kolom sulit di HP | Di HP tampil sebagai kartu per dasawisma/KRT; tabel penuh hanya di cetak & desktop |
| Format cetak berbeda tiap browser | Uji cetak Playwright (PDF snapshot), ukuran pakai mm, opsi skala |
| Data lama tidak konsisten | Wizard pembersihan saat impor + laporan peringatan |
| Internet tidak stabil | PWA cache + antrean offline (v1.1) |

## 13. Istilah

**PKK** Pemberdayaan Kesejahteraan Keluarga · **Dasawisma (Dawis)** kelompok ±10 KK · **KRT** Kepala Rumah Tangga · **WUS** Wanita Usia Subur (15–49) · **PUS** Pasangan Usia Subur · **HPL** Hari Perkiraan Lahir · **Alkon** alat kontrasepsi · **MOW/MOP** sterilisasi wanita/pria · **BKB/BKR/BKL** Bina Keluarga Balita/Remaja/Lansia · **PIK-R** Pusat Informasi & Konseling Remaja · **UPPKA** Usaha Peningkatan Pendapatan Keluarga Akseptor · **UP2K** Usaha Peningkatan Pendapatan Keluarga · **SPAL** Saluran Pembuangan Air Limbah · **3 Buta** buta aksara, angka, bahasa Indonesia · **HATINYA PKK** Halaman Asri, Teratur, Indah dan Nyaman · **IRT** Industri Rumah Tangga · **Toga** Tanaman Obat Keluarga · **PPP** Penghayatan dan Pengamalan Pancasila.
