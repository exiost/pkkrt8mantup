# Rencana Pengembangan — SIWARGA PKK RT 08 Mantup

Turunan dari [PRD.md](./PRD.md). Estimasi untuk 1 developer full-time; total **±10 minggu** sampai rilis v1.0.

## Ringkasan Fase

| Fase | Minggu | Hasil utama | Sheet Excel yang tergantikan |
|---|---|---|---|
| 0. Persiapan | 1 | Repo, desain sistem, skema DB, CI | — |
| 1. Fondasi | 2 | Login, peran, layout responsif, pengaturan | — |
| 2. Data Master | 3–4 | Warga, Keluarga, Tag, Impor Excel | DATA WARGA, bayi lahir |
| 3. Mesin Rekap & Cetak | 5 | Fungsi aturan R1–R12, kerangka laporan + pratinjau cetak | — |
| 4. Laporan Daftar | 6 | Penduduk 15–59, WUS, PUS, Ibu Hamil & KB | 2, 3, 4, 5 |
| 5. Laporan Rekap | 7 | Kampung KB, Rekap Catatan RT & Dawis, Rekap Ibu Hamil | 6, 10, 11, 12, 13, 14 |
| 6. Formulir & Kesehatan | 8 | Data Warga TP PKK, Data Keluarga, Catatan Keluarga, HT_IRT, Ibu & Anak per Dawis | 7, 8, 9, 15, 16, 17, 19 |
| 7. Dashboard & Polesan | 9 | Dashboard, animasi, konfeti, tour, mode gelap, PWA | — |
| 8. Uji & Rilis | 10 | Uji angka vs Excel, uji cetak, pelatihan kader, go-live | — |

---

## Fase 0 — Persiapan (Minggu 1)

- [ ] Inisialisasi proyek: `Vite + React + TS`, Tailwind, shadcn/ui, lucide-react, framer-motion, ESLint/Prettier.
- [ ] Struktur folder:
  ```
  src/
    app/            # routing, layout (Sidebar, BottomNav), providers
    components/ui/  # shadcn (button, dialog, drawer, sheet, toast, tooltip, tabs, badge…)
    components/     # StatCard, TagChip, WargaCard, DataTable, EmptyState, PrintLayout…
    features/
      warga/ keluarga/ kesehatan/ pekarangan/ laporan/ dashboard/ pengaturan/ impor/
    lib/
      rules/        # hitungUmur, isWUS, isPUS, isBalita, isLansia, kelompokUmur… (murni, teruji)
      reports/      # satu file per laporan: query → baris → total
      print/        # css cetak, PrintPreview, SignatureBlock
      supabase.ts
    styles/print.css
  supabase/migrations/   # skema SQL + RLS
  tests/                 # vitest + playwright
  ```
- [ ] Desain sistem: token warna (warna modul §5 PRD), tipografi, komponen `TagChip`, `StatCard`, `ModuleCard`. Buat halaman `/design` sebagai katalog komponen.
- [ ] Skema database (PRD §9) sebagai migrasi Supabase + seed `master_pilihan` dari nilai unik di Excel.
- [ ] CI GitHub Actions: lint, typecheck, vitest, build.
- [ ] `.gitignore` untuk file `.xls*` agar data warga asli tidak pernah masuk repo.

## Fase 1 — Fondasi (Minggu 2)

- [ ] Auth Supabase (email + password / magic link), halaman Login berilustrasi.
- [ ] Tabel `pengguna` + peran; kebijakan **RLS**: Ketua Dasawisma hanya `dasawisma_id` miliknya, Pembaca hanya `select`.
- [ ] Layout responsif: Sidebar (desktop) & Bottom Nav + FAB (HP), header dengan judul modul berwarna, transisi halaman.
- [ ] Command palette `Ctrl+K`.
- [ ] Halaman **Pengaturan**: identitas wilayah (kop), dasawisma, penanda tangan, tanggal acuan bawaan, batas umur, daftar pilihan, tag.
- [ ] Toast, dialog konfirmasi, skeleton loading — dipakai global.
- [ ] **Kit CRUD generik** (dipakai semua modul, PRD F0.2): `useCrud(table)` (TanStack Query: list/get/create/update/softDelete/restore + optimistic update), `CrudTable` (cari/filter/sort/pagination/pilih banyak/edit inline), `CrudDialog` & `CrudDrawer`, `DeleteConfirm` + toast **Urungkan**, peringatan perubahan belum disimpan, deteksi bentrok via kolom `updated_at`.
- [ ] Kolom standar di semua tabel: `created_at/by`, `updated_at/by`, `deleted_at` + trigger audit log; kebijakan RLS per peran sesuai matriks PRD F0.3.
- [ ] Halaman **Tempat Sampah** (pulihkan / hapus permanen) & CRUD **Pengguna**, **Dasawisma**, **Daftar Pilihan** (ganti nama & gabung nilai).

## Fase 2 — Data Master (Minggu 3–4)

**Warga**
- [ ] `DataTable` (TanStack): cari, filter (bottom sheet di HP), sort, pilih kolom, virtual scroll, aksi massal.
- [ ] Tampilan kartu di HP + swipe action.
- [ ] Form wizard 9 bagian (React Hook Form + Zod): validasi NIK/KK 16 digit & unik, saran tgl lahir/JK dari NIK, dropdown semua nilai baku.
- [ ] Sub-form tabel item: Pekarangan (kategori, komoditi, jumlah, satuan) & IRT.
- [ ] Detail warga (drawer di desktop, halaman di HP): header berwarna, tag otomatis + kustom, timeline audit.
- [ ] Status warga (Aktif/Pindah/Meninggal) & Tempat Sampah.
- [ ] CRUD lengkap: tambah (wizard & form cepat), ubah per bagian / inline, hapus + urungkan, duplikat sebagai template, aksi massal.

**Keluarga**
- [ ] Daftar KK (kartu), detail KK, form data rumah & sanitasi per KK, pindah anggota / pecah KK.
- [ ] CRUD KK & anggota: tambah KK + kepala keluarga sekaligus, tambah/keluarkan anggota, ubah urutan (drag), gabung KK, hapus KK (dengan pilihan nasib anggotanya).
- [ ] CRUD Kegiatan warga (Y/T + jenis) termasuk ubah massal per dasawisma.

**Tag**
- [ ] CRUD tag kustom (warna + ikon), tag otomatis dari aturan (dihitung, tidak disimpan).

**Impor Excel** (penting untuk migrasi)
- [ ] Unggah `.xlsm/.xlsx` → baca sheet `DATA WARGA` dengan SheetJS **di browser** (file tidak dikirim ke server).
- [ ] Pembersih: trim, normalisasi kapital (`ya`→`Ya`), `Laki - Laki`→`L`, `anak`→`Anak`, tanggal Excel→ISO.
- [ ] Kelompokkan per No KK → `keluarga`; data rumah diambil dari baris Kepala Keluarga.
- [ ] Urai teks `"Cabe, 2 pot; Pandan, 1 pot;"` → item pekarangan; `CS/CT/CU` → item IRT (logika sama seperti makro `TampilkanDataHT_IRT`).
- [ ] Nilai ambigu (mis. dasawisma `"Drupadi"`) → layar "Perlu dipilih" sebelum simpan.
- [ ] Impor sheet `bayi lahir` → `kelahiran`.
- [ ] Ringkasan hasil: X warga, Y KK, daftar peringatan; tombol "Simpan".
- [ ] **Ekspor `.xlsx`** dengan kolom sama seperti DATA WARGA lama.

## Fase 3 — Mesin Rekap & Kerangka Cetak (Minggu 5)

- [ ] `lib/rules/*` — implementasi aturan R1–R12 sebagai fungsi murni + **unit test** dengan kasus batas (tepat 15 th, tepat 49 th, lahir setelah tanggal acuan, istri cerai, Tidak Ikut PKK).
- [ ] `ReportShell` komponen: bar parameter (tanggal acuan / bulan-tahun / dasawisma / toggle), tombol Cetak · Excel · CSV, area konten.
- [ ] **Drill-down**: angka di tabel rekap bisa diklik → dialog berisi daftar nama.
- [ ] **Ubah cepat dari laporan**: klik nama warga/KK di laporan atau formulir → popup edit → laporan dihitung ulang otomatis.
- [ ] `PrintPreview` dialog layar penuh: ukuran kertas (A4/F4/Legal), orientasi, skala, kolom NIK on/off, cetak berwarna on/off, tempat & tanggal TTD.
- [ ] `styles/print.css`: `@page { size; margin }`, `thead { display: table-header-group }`, `tr { break-inside: avoid }`, `.page-break`, sembunyikan navigasi, garis tabel 0.5pt hitam, nomor halaman.
- [ ] `KopLaporan` & `SignatureBlock` dari Pengaturan.
- [ ] Ekspor laporan ke `.xlsx` (SheetJS) dengan judul & kop.

## Fase 4 — Laporan Daftar (Minggu 6)

- [ ] **Penduduk 15–59 th** (R2) — kolom riwayat sakit DM/Hipertensi.
- [ ] **WUS per Bulan** (R3).
- [ ] **PUS per Bulan** (R4) — centang kelompok umur + jenis alkon.
- [ ] **Pencatatan Ibu Hamil & Peserta KB Baru** — nama suami otomatis (R6).
- [ ] Uji: hasil untuk tanggal acuan 15-09-2026 dibandingkan dengan nilai sheet Excel.

## Fase 5 — Laporan Rekap (Minggu 7)

- [ ] **Inventarisasi Kampung KB** — 3 bagian, 11 sub-tabel (R10, R11). Input manual untuk data yang tidak ada di master (PIK-R/BKR, BKL, UPPKA, alasan PUS bukan peserta KB) disimpan per bulan.
- [ ] **Rekap Catatan Data & Kegiatan** — satu komponen, dua mode: **tingkat RT** (baris = dasawisma) & **per Dasawisma** (baris = KRT) → menggantikan 3 sheet. 30 kolom + JUMLAH. Di HP tampil kartu.
- [ ] **Rekap Ibu Hamil/Melahirkan/Nifas tingkat RT** per bulan; simpan **arsip laporan bulanan** (snapshot) → menggantikan `Sheet1`.

## Fase 6 — Formulir & Kesehatan Ibu-Anak (Minggu 8)

- [ ] Modul **Kesehatan Ibu & Anak**: CRUD status ibu bertanggal (hamil/melahirkan/menyusui/nifas), CRUD kelahiran (+ "tambahkan bayi sebagai warga"), CRUD kematian, CRUD peserta KB baru, pengingat HPL.
- [ ] CRUD item **pekarangan & IRT** (edit inline di tabel HT_IRT), CRUD isian manual **Kampung KB** per bulan, CRUD **arsip laporan** (angka terkunci).
- [ ] **Catatan Ibu Hamil, Kelahiran & Kematian per Dasawisma** — filter dasawisma / bulan / status (menggantikan dawis 1, dawis 2, CUSTOM).
- [ ] **Register Kelahiran** (menggantikan `bayi lahir`).
- [ ] Formulir **Data Warga TP PKK** (per orang) — kotak centang ☑/☐ seperti formulir kertas.
- [ ] Formulir **Data Keluarga** & **Catatan Keluarga** (per KK) — pemilih KK + ◀ ▶ + **Cetak Semua per dasawisma**.
- [ ] **HATINYA PKK & IRT** — pemilih warga (hanya yang punya data, seperti makro `UpdateDropdownB2`), 2 tabel, plus rekap total komoditi seluruh RT.

## Fase 7 — Dashboard & Polesan Visual (Minggu 9)

- [ ] Dashboard: StatCard count-up + stagger, grafik (piramida umur, donat, batang per dasawisma, tren kelahiran), kartu "Perlu Perhatian", grid akses cepat 19 laporan + favorit ⭐.
- [ ] Animasi: transisi halaman, hover kartu, efek tekan tombol, grafik tumbuh, skeleton, tag Ibu Hamil berdenyut, konfeti saat tambah warga/kelahiran.
- [ ] `prefers-reduced-motion` dan toggle "Kurangi animasi" di Pengaturan.
- [ ] Empty state berilustrasi, tooltip istilah (glosarium PRD §13), onboarding tour.
- [ ] Mode gelap.
- [ ] PWA: manifest, ikon, service worker, banner "Instal aplikasi".

## Fase 8 — Uji, Pelatihan & Rilis (Minggu 10)

- [ ] **Uji kecocokan angka**: impor file Excel asli ke lingkungan staging, bandingkan setiap laporan dengan Excel; catat & jelaskan selisih akibat bug rentang baris (`$2:$179`).
- [ ] **Uji cetak** Playwright: buat PDF setiap laporan (A4 potret/lanskap), cek tidak ada kolom terpotong; uji manual di Chrome Android & Safari iOS.
- [ ] Uji akses RLS per peran.
- [ ] Lighthouse (Perf ≥ 85, A11y ≥ 90).
- [ ] Panduan singkat bergambar (PDF 1–2 halaman) + sesi pelatihan kader.
- [ ] Go-live: buat akun Admin & Ketua Dasawisma, impor data final, nonaktifkan file Excel lama (simpan arsip offline).

## v1.1+ (setelah rilis)

- Input offline dengan antrean sinkronisasi.
- Pengingat WhatsApp (HPL, jadwal posyandu).
- Modul iuran/jimpitan & arisan.
- Multi-RT (satu aplikasi untuk beberapa RT/padukuhan).
- Tanda tangan digital & QR verifikasi di laporan cetak.

## Definisi Selesai (per fitur)

1. Berfungsi di 360 px & 1440 px.
2. Ada tampilan cetak (untuk laporan) yang lolos uji PDF.
3. Aturan hitung tercakup unit test.
4. Hak akses diuji untuk 4 peran.
5. Create, Read, Update, Delete + Pulihkan berfungsi dan diuji (Playwright) untuk data fitur tersebut, termasuk validasi & pesan error.
6. Tidak ada error konsol; lint & typecheck bersih.

## Temuan dari File Excel yang Perlu Diputuskan Pengguna

1. **Tanggal acuan**: sel `J2` berisi 15-09-2026 tapi judul laporan "15 Oktober 2026". Aplikasi akan memakai satu tanggal acuan yang dipilih per laporan.
2. **20 warga dasawisma "Drupadi"** tanpa angka I/II — perlu ditentukan saat impor.
3. **Rentang rumus terbatas** (`$2:$179`): warga di baris terakhir tidak ikut rekap Dawis/ibu hamil di Excel; aplikasi menghitung semua warga, jadi angkanya bisa sedikit lebih besar.
4. **Batas umur lansia** tidak tertulis eksplisit di Excel — diusulkan ≥ 60 th (bisa diubah).
5. **2 warga tanpa No KK** dan **beberapa KK tanpa baris "Kepala Keluarga"** (61 No KK, 57 kepala keluarga) — perlu dilengkapi saat impor.
6. Kolom `AS` (Pekerjaan kedua) & `Y` (jenis rukun kematian) kosong semua — tetap disediakan atau dihapus?
