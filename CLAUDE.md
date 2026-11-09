# SIWARGA PKK Mantup — catatan serah terima untuk sesi Claude berikutnya

Baca file ini dulu. Isinya: siapa pemiliknya, cara bekerja dengannya, posisi proyek sekarang, dan apa yang belum.

## 0. Untuk pemilik: cara membuka sesi baru
1. Buka sesi baru dengan akun yang punya akses ke repository **`exiost/pkkrt8mantup`**.
2. Pilih branch **`ccr-288141f3-4axjrb`**.
3. Kalimat pertama: *"Baca CLAUDE.md dulu, lalu lanjutkan proyek ini."*
4. File Excel asli (`Data_Warga_mantup_RT_8_VB.xlsm`) **tidak wajib** — upload hanya bila Claude memintanya (untuk mencocokkan angka laporan dengan Excel).

## 1. Pemilik & cara bekerja (PENTING)
- Pemilik orang **awam**. Jawab dalam **Bahasa Indonesia sederhana**, singkat, langkah bernomor. Hindari istilah teknis.
- **Jangan mengubah yang tidak diminta.** Bila pemilik hanya *bertanya*, jawab saja — jangan menghapus/mengubah fitur. (Pernah marah karena kontrol "Tanggal acuan umur" dihapus padahal ia hanya bertanya.)
- **Jangan mengarang** isi dokumen/fitur. Bila diminta "tiru persis", tiru persis.
- Kerjakan di branch **`ccr-288141f3-4axjrb`** (`git push -u origin ccr-288141f3-4axjrb`). **Jangan membuat PR** kecuali diminta.
- Setiap selesai perubahan: `npm test`, `npm run build`, cek tampilan dengan Playwright (lebar HP 390px tanpa geser ke samping + desktop), commit, push, lalu buat paket cPanel dan kirim zip-nya ke pemilik:
  ```
  npm run paket:cpanel
  rm -f siwarga-cpanel.zip && (cd paket-cpanel/server && zip -qr ../../siwarga-cpanel.zip .)
  ```
  (zip berisi `app.cjs`, `dist/`, `server/`, `package.json` — bukan folder `paket-cpanel` utuh.)
- Akhiri jawaban dengan cara pasang: cadangkan folder `data` → hapus `dist`, `server`, `app.cjs`, `package.json` lama → Upload & Extract zip → **RESTART** di Setup Node.js App → Ctrl+F5.

## 2. Apa ini
Pengganti web (HP & desktop) untuk workbook Excel `Data_Warga_mantup_RT_8_VB.xlsm` Kelompok PKK RT 08 Mantup, sekarang **multi-RT: Desa Mantup RT 01–17**. Setiap sheet Excel = satu laporan dengan hasil cetak **sama persis** dengan Excel. CRUD lengkap, mode server (SQLite + login), bisa offline.

- Produksi: **https://mantup.biz.id/data-warga/** (cPanel, Node 22, di belakang Cloudflare). App root cPanel `pemerintahkota.id/data-warga`, `DATA_DIR=/home/eriarmedia/pemerintahkota.id/data-warga/data`, startup `app.cjs`. Detail: `docs/CPANEL.md`.
- GitHub Pages (https://exiost.github.io/pkkrt8mantup/) terbit otomatis dari branch ini, tetapi **statis = mode lokal** (tanpa login/server): fitur multi-RT, Admin Desa, gabungan desa, impor file RT **tidak tampil** di sana. Ini wajar.
- File Excel asli **tidak ada di repo** (gitignore). Tes kecocokan dengan Excel butuh `XLSM_PATH=/path/file.xlsm npm test`; tanpa itu 5 tes dilewati (normal).

## 3. Arsitektur singkat
- React 18 + Vite + TS + Tailwind + Framer Motion + Zustand, HashRouter, lucide-react. Server: Express + `node:sqlite` (`server/index.mjs`, `server/db.mjs`), dijalankan lewat `app.cjs`. Bisa di sub-alamat `/data-warga` (middleware membuang awalan).
- Mesin lembar Excel: `src/sheet/templates.json` (gaya + sheet, JSON ringkas) dirender `src/sheet/SheetView.tsx`. Tampilan web "Tampilan" di `src/reports/WebView.tsx`.
- Laporan: `src/reports/registry.ts` (daftar laporan, `uses`, `hidden`), pembangun di `lists.ts`, `rekap.ts`, `forms.ts`; konteks di `ctx.ts`; halaman `src/pages/Laporan.tsx`.
- Aturan data (umur, WUS/PUS, status ibu per bulan `riwayatIbu`, dll.): `src/lib/rules.ts`. Keputusan desain bernomor K1–K28: **`docs/KEPUTUSAN.md`**.
- Peran: admin / editor / viewer. Viewer hanya Laporan; Beranda & Impor/Ekspor khusus admin. Admin bisa **mengunci tanggal laporan** untuk viewer (`settings.kunci`).

## 4. Multi-RT — SEMUA TAHAP 1–6 SUDAH SELESAI (lihat K26–K28)
Tahap: 1 akun & data per RT + Admin Desa + Kelola RT · 2 judul laporan ikut RT · 3 laporan gabungan Desa Mantup · 4 kirim data lewat file · 5 offline · 6 panduan & paket.
- Setiap record & akun berlabel RT (kolom `rt` di SQLite). Database lama otomatis dimigrasi: semua data & akun lama = **RT 08**; daftar RT 01–17 di meta `rts`; pengaturan per RT di meta `settings:<rt>`.
- Akun `role=admin` dengan `rt` kosong = **Admin Desa (super admin)**: memilih RT lewat header `X-RT` (UI: kotak kuning "Buka data RT" di sidebar), bisa ubah semua RT, menu **Kelola RT** (`/rt`, `src/pages/KelolaRT.tsx`). Akun RT dibatasi server ke RT-nya.
- Admin Desa pertama dibuat **sekali** oleh admin RT lewat Pengaturan → Akun & Server → "Buat Admin Desa" (hanya muncul bila belum ada Admin Desa). Akun `admin` lama tetap Admin RT 08.
- Judul laporan "RT 08" otomatis mengikuti RT (`pasangRT` di `src/reports/common.ts`), kecuali teks yang diubah lewat "Ubah teks".
- **Gabungan Desa Mantup** (`src/reports/desa.ts`, endpoint `GET /api/desa`): rekap = satu baris per RT + JUMLAH; daftar nama = disambung per RT dengan kolom RT disisipkan. Daftar laporan yang bisa digabung: konstanta `GABUNGAN`.
- **Kirim data lewat file** `.siwarga` (`src/components/KirimRT.tsx`, `src/lib/eksporRT.ts`, endpoint `/api/rt-impor`, `/api/rt-cadangan`): pratinjau, perubahan terakhir menang, "hanya di server" tidak dihapus kecuali dicentang, cadangan otomatis 5 terakhir per RT + Kembalikan.
- **Offline** (`src/lib/session.ts`, `public/sw.js`): salinan data RT di localStorage (`siwarga-cache`), antrean perubahan (`siwarga-queue`, `siwarga-queue-sejak`), service worker untuk membuka aplikasi tanpa internet, cek online tiap 15 detik. Keluar ditolak saat offline bila ada antrean. Peringatan kuning + "Ekspor sekarang" bila antrean > 1 hari. `navigator.storage.persist()` diminta (tidak dijamin dikabulkan browser).

## 5. Dokumen untuk pemilik / juri
- `docs/panduan-admin.html`, `docs/panduan-viewer.html` (RT 08, ada akun demo), `docs/panduan-desa.html` (Admin Desa & Admin RT), `docs/lembar-keterangan.html` (lembar untuk juri; versi pemilik dengan gambar kualitas penuh — jangan dikompres).
- Tangkapan layar panduan diambil dengan Playwright dari server lokal; panduan berisi gambar base64.

## 6. Status terakhir (9 Nov 2026)
Semua sudah di-commit & push. Paket terakhir sudah dikirim ke pemilik.
- **Belum dikonfirmasi** pemilik: apakah versi multi-RT sudah dipasang di mantup.biz.id dan akun Admin Desa sudah dibuat. Tanyakan bila relevan.
- Pemilik belum mencoba sendiri tahap 1–6 (ia minta langsung dirampungkan).
- 9 Nov 2026: uji praktik (tambah/ubah/hapus/pulihkan, editor, viewer, Admin Desa, RT baru, impor Excel) lulus. Bug diperbaiki: impor Excel "Ganti" & pulihkan cadangan di mode server dulu tidak menghapus data lama di server — sekarang data lama dipindah ke Tempat Sampah (`replaceAll` di `src/lib/store.ts`).

## 7. Yang belum / catatan terbuka (jangan dikerjakan tanpa diminta)
- Admin Desa saat login pertama membuka RT 01 (bukan RT terakhir yang dipakai di perangkat lain).
- Gabungan "Pencatatan Ibu Hamil, KB & PUS": bagian B sudah punya kolom RT bawaan Excel, jadi ada dua kolom berjudul "RT".
- Laporan per keluarga/per dasawisma (Data Keluarga, Catatan Keluarga, TP PKK, HT/IRT, Rekap per Dasawisma, Catatan Ibu Hamil per Dasawisma) tidak ada versi gabungan desa — tetap per RT.
- Mode lokal (tanpa server) bisa mengekspor `.siwarga` tetapi tidak bisa mengimpornya.
- Laporan tahunan/rentang Rekap Ibu Hamil & Catatan Ibu Hamil sengaja disembunyikan (`hidden: true`) atas permintaan pemilik — jangan dihapus.
- Isian manual Kampung KB pada gabungan desa = jumlah isian semua RT (tidak bisa diubah dari tampilan gabungan).
