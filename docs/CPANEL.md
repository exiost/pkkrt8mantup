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

## Bila error
- Halaman "We're sorry, but something went wrong" / 503: buka file `stderr.log` di folder `siwarga`. Pesan `No such built-in module: node:sqlite` = versi Node terlalu lama → ganti ke 22.13+.
- Data kosong padahal sudah unggah database: cek `DATA_DIR` sama persis dengan lokasi folder, nama file harus `siwarga.db`, lalu Restart.

## Alternatif: mode statis (tanpa Node.js)
Unggah isi folder `paket-cpanel\statis` ke `public_html`. Tanpa login & viewer; data tersimpan di browser masing-masing perangkat (data dari server lokal tidak ikut).
