# SIWARGA PKK RT 08 Mantup

Aplikasi web (desktop + HP) pengganti file Excel `Data_Warga_mantup_RT_8_VB.xlsm`: data warga, keluarga, ibu & anak, pekarangan/IRT, dan **19 tab laporan** yang bisa dicetak atau disimpan sebagai PDF.

Dokumen perencanaan: [docs/PRD.md](docs/PRD.md) · [docs/PLAN.md](docs/PLAN.md) · [docs/KEPUTUSAN.md](docs/KEPUTUSAN.md)

## Fitur

- **Laporan sama persis dengan Excel:** desain tiap sheet (lebar kolom, tinggi baris, sel gabungan, garis, huruf, judul) dibaca langsung dari file Excel asli, dan angka dihitung dengan aturan rumus Excel. Tidak ada tambahan tanda tangan. Sudah diuji: rekap RT, rekap dasawisma, Kampung KB, WUS, PUS, dan Penduduk 15–59 cocok dengan nilai di Excel.
- **Cetak / simpan PDF** dengan pengaturan seperti Excel: ukuran kertas, arah, skala (ikut Excel / pas lebar / pas 1 halaman / persen sendiri), margin, **area cetak**, ulangi judul tabel, tengahkan, hemat tinta, dan garis batas halaman supaya tabel tidak terpotong.
- **Keluarga mengikuti ID keluarga** (kolom DE di Excel): satu ID = satu keluarga walau No KK berbeda.
- **CRUD lengkap** untuk Warga, Keluarga, Ibu & Anak (status ibu, kelahiran, kematian, KB baru, PUS baru), Pekarangan & IRT, Dasawisma, Tag, Daftar Pilihan, Isian Kampung KB, Arsip. Hapus selalu ke **Tempat Sampah** (bisa **Urungkan**).
- **Dua cara pakai:** *mode lokal* (data di browser) dan *mode server* (login + database SQLite, banyak perangkat) — lihat [docs/SERVER.md](docs/SERVER.md).
- Klik **angka** di laporan → daftar nama; klik **nama** → ubah data; **Ubah teks** untuk mengganti teks tetap lembar.
- **Peran akun (mode server):** *admin* (semua, termasuk Beranda & pengaturan), *editor* (ubah data, tanpa Beranda/Impor), *viewer* (**hanya Laporan**, tidak bisa mengubah apa pun). Admin bisa **mengunci tanggal laporan** (tombol “Kunci tanggal ini” di halaman laporan): akun viewer memakai tanggal itu di semua laporan dan tidak melihat kontrol tanggalnya.
- **Catatan ibu per bulan** (Ibu & Anak → Status Ibu → *Catatan bulanan*): tiap bulan punya entri sendiri; persalinan **SC** bisa tetap dilaporkan *Hamil* di laporan tahunan. Ibu dengan status terbanyak otomatis di urutan atas.
- Impor file `.xlsm` lama dan ekspor `.xlsx`; dashboard berwarna, tag, animasi, mode gelap, PWA, nyaman di HP (cubit untuk zoom lembar).

## Menjalankan

```bash
npm install
npm run dev        # tampilan saja (mode lokal), http://localhost:5173
npm run build && npm start   # server + login + SQLite, http://localhost:3000
npm test           # semua uji
```

Uji kecocokan dengan file Excel asli (file **tidak** disimpan di repo karena berisi data pribadi):

```bash
XLSM_PATH=/path/Data_Warga_mantup_RT_8_VB.xlsm npm test
```

Membuat ulang desain lembar dari Excel: `python3 tools/extract_templates.py file.xlsm src/sheet/templates.json`.

## Unggah ke cPanel

```bash
npm install
npm run paket:cpanel      # membuat folder paket-cpanel/ (statis + server) dan BACA-DULU.txt
```

- **Statis** (paling mudah): unggah isi `paket-cpanel/statis` ke `public_html`. Data tersimpan di browser tiap perangkat, tanpa login.
- **Server** (login, peran viewer, banyak perangkat): unggah `paket-cpanel/server`, lalu di cPanel → *Setup Node.js App* pilih Node **22.13+**, startup file `app.cjs`, *Run NPM Install*, tambah variabel `DATA_DIR` (folder di luar `public_html`). Bila hosting hanya punya Node lama, pakai paket statis atau jalankan server di tempat lain (mis. Render, lihat `render.yaml`).

## Teknologi

React 18 + Vite + TypeScript, Tailwind CSS, Framer Motion, Recharts, SheetJS; server Node.js (Express) dengan SQLite bawaan Node (`node:sqlite`).
