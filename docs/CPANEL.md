# Panduan unggah ke cPanel (mode server: login + viewer + data bersama)

## 0. Cek dulu di cPanel
Buka cPanel → cari menu **Setup Node.js App**.
- Ada, dan pilihan versinya **22.13 atau lebih baru** (22.x terbaru / 24.x) → lanjut.
- Tidak ada / versi tertinggi di bawah 22.13 → mode server tidak bisa di hosting ini (minta hosting menambah Node 22, atau pakai mode statis di bagian akhir).

## 1. Buat paket di komputer
Di folder SIWARGA (yang biasa dipakai `jalankan-server.bat`), buka Command Prompt di folder itu lalu:
```
npm install
npm run paket:cpanel
```
Muncul folder `paket-cpanel\server`. Klik kanan folder `server` → Kirim ke → Folder terkompresi (zip) → jadi `server.zip`.

## 2. Siapkan data lama (agar tidak impor ulang)
Tutup jendela server SIWARGA di komputer (supaya database tersimpan rapi), lalu ambil file di folder `data`:
`siwarga.db` (beserta `siwarga.db-wal` dan `siwarga.db-shm` bila ada).

## 3. Unggah
cPanel → **File Manager**, di folder home (BUKAN di `public_html`):
1. Buat folder `siwarga` → unggah `server.zip` ke dalamnya → klik kanan **Extract**. Pastikan isinya langsung `app.cjs`, `package.json`, `dist`, `server` (bukan di dalam subfolder `server/server`; kalau iya, pindahkan isinya naik satu tingkat).
2. Buat folder `siwarga-data` → unggah file database dari langkah 2 ke sini.

## 4. Buat aplikasi Node.js
cPanel → **Setup Node.js App** → **Create Application**:
| Isian | Nilai |
|---|---|
| Node.js version | 22.13+ (pilih yang tertinggi) |
| Application mode | Production |
| Application root | `siwarga` |
| Application URL | domain / subdomain Anda (mis. `siwarga.domainanda.com`) |
| Application startup file | `app.cjs` |

Di bagian **Environment variables** → Add Variable:
- `DATA_DIR` = `/home/NAMAUSER/siwarga-data` (NAMAUSER = nama akun cPanel Anda, terlihat di File Manager)

Klik **Create**, lalu **Run NPM Install**, lalu **Restart**.

## 5. Buka
Buka alamat aplikasi. Bila database lama ikut diunggah, langsung login dengan akun admin yang sama. Bila tidak, akan diminta membuat akun admin pertama.

Aktifkan HTTPS: cPanel → **SSL/TLS Status** → Run AutoSSL untuk domain itu.

## Memperbarui versi nanti
1. Di komputer: `npm run paket:cpanel` lagi, zip `paket-cpanel\server`.
2. File Manager → folder `siwarga`: hapus `dist` dan `server` lama, unggah & extract zip baru (timpa `app.cjs` dan `package.json`).
3. **Jangan** sentuh folder `siwarga-data` (itu database).
4. Setup Node.js App → Restart. Di browser tekan Ctrl+F5, cek tulisan "Versi …" di sidebar.

## Cadangan
Unduh isi folder `siwarga-data` secara berkala (File Manager → Compress → Download).

## Contoh: dipasang di sub-alamat (domain.id/data-warga)
| Isian | Nilai |
|---|---|
| Application root | `pemerintahkota.id/data-warga` (folder tempat `app.cjs`) |
| Application URL | `pemerintahkota.id` / `data-warga` |
| Startup file | `app.cjs` |
| DATA_DIR | `/home/NAMAUSER/siwarga-data` (disarankan di luar folder situs) |

Buka dengan `https://pemerintahkota.id/data-warga/`. Versi ≥ 1.2.0 sudah mendukung sub-alamat.

**Jangan mengubah "Application root" aplikasi yang sudah dibuat.** cPanel akan mencoba memindahkan lingkungan Node dan bisa gagal dengan pesan
`shutil.Error: Destination path '.../nodevenv/...' already exists`. Bila perlu folder lain: klik CANCEL, cadangkan database, **Destroy** aplikasinya, lalu **Create** ulang dengan folder baru.

## Bila error
- Halaman "We're sorry, but something went wrong" / 503: buka file `stderr.log` di folder `siwarga`. Pesan `No such built-in module: node:sqlite` = versi Node terlalu lama → ganti ke 22.13+.
- Data kosong padahal sudah unggah database: cek `DATA_DIR` sama persis dengan lokasi folder, nama file harus `siwarga.db`, lalu Restart.

## Alternatif: mode statis (tanpa Node.js)
Unggah isi folder `paket-cpanel\statis` ke `public_html`. Tanpa login & viewer; data tersimpan di browser masing-masing perangkat (data dari server lokal tidak ikut).

## Memperbarui ke versi multi-RT (Padukuhan Mantup, RT 01–17)
1. **Cadangkan folder `DATA_DIR`** (berisi `siwarga.db`).
2. Hapus `dist`, `server`, `app.cjs`, `package.json` lama, upload & Extract zip baru, lalu **RESTART**.
3. Saat server menyala, database lama otomatis diubah: semua data & akun lama menjadi **RT 08** (tidak ada yang hilang). Daftar RT 01–17 dibuat otomatis.
4. Masuk sebagai `admin` → Pengaturan → Akun & Server → **Buat Admin Padukuhan** (sekali saja). Langkah lengkap: `docs/panduan-desa.html`.

Database yang sudah diubah ke multi-RT tidak bisa dipakai lagi oleh versi lama. Bila ingin kembali ke versi lama, pakai cadangan dari langkah 1.

## Cadangan harian otomatis
Server menyalin seluruh database sekali sehari ke folder **`cadangan-harian`** di sebelah `siwarga.db` (di dalam `DATA_DIR`), dan menyimpan 14 hari terakhir (`siwarga-YYYY-MM-DD.db`). Admin Padukuhan bisa mengunduhnya di **Beranda Padukuhan → tab Cadangan → Cadangan harian otomatis**.

Mengembalikan data dari cadangan harian:
1. Setup Node.js App → **STOP APP**.
2. File Manager → folder `DATA_DIR`: ganti nama `siwarga.db` menjadi `siwarga-lama.db`, hapus `siwarga.db-wal` dan `siwarga.db-shm` (bila ada).
3. Salin file cadangan (mis. `cadangan-harian/siwarga-2026-11-08.db`) ke folder `DATA_DIR` dan beri nama `siwarga.db`.
4. **START APP** / RESTART.

Catatan: bila mencadangkan manual, salin **seluruh folder `data`** (termasuk `siwarga.db-wal`), bukan hanya `siwarga.db` — perubahan terbaru bisa masih berada di file `-wal`.

## Cadangan ke Google Drive (Google Apps Script)
Beranda Padukuhan → tab **Cadangan** → **Cadangan otomatis ke Google Drive**: tekan **Salin skrip**, tempel di script.google.com (Proyek baru), Simpan, pilih fungsi `pasangJadwalHarian` → Jalankan → izinkan. Skrip mengambil `api/cadangan-terbaru?kunci=…` tiap hari jam 01.00–02.00 WIB dan menyimpan `siwarga-YYYY-MM-DD.db` di folder Drive **Cadangan SIWARGA** (60 hari). Bila skrip gagal dengan kode 403/503 dari Cloudflare, buat aturan di Cloudflare (Security → WAF) yang melewatkan jalur `/data-warga/api/cadangan-terbaru`. Kunci bocor → **Buat kunci baru** lalu ganti skrip.

## Lupa kata sandi / nama pengguna (pemulihan darurat)
Hanya bisa dilakukan pemegang akses cPanel.
1. File Manager → buka folder data (`DATA_DIR`, tempat `siwarga.db`) → **+ File** → nama **`reset-admin-desa.txt`**.
2. Edit file itu, isi **satu baris**:
   - `KataSandiBaru123` → semua akun **Admin Padukuhan** diberi kata sandi itu (bila belum ada Admin Padukuhan, dibuat akun `desa`), atau
   - `admin: KataSandiBaru123` → hanya akun bernama `admin` (bisa akun apa saja, mis. Admin RT).
   Kata sandi minimal 8 karakter. Simpan.
3. Setup Node.js App → **RESTART**.
4. Buka lagi file `reset-admin-desa.txt`: isinya berganti menjadi **BERHASIL** + daftar nama pengguna yang direset (atau **GAGAL** + alasannya + daftar nama pengguna yang ada).
5. Masuk dengan nama pengguna itu + kata sandi yang Anda tulis → aplikasi meminta membuat kata sandi baru.
6. **Hapus file `reset-admin-desa.txt`.**
