# SIWARGA PKK RT 08 Mantup

Aplikasi web (desktop + HP) pengganti file Excel `Data_Warga_mantup_RT_8_VB.xlsm`: data warga, keluarga, ibu & anak, pekarangan/IRT, dan **19 tab laporan** yang bisa dicetak atau disimpan sebagai PDF.

Dokumen perencanaan: [docs/PRD.md](docs/PRD.md) · [docs/PLAN.md](docs/PLAN.md) · [docs/KEPUTUSAN.md](docs/KEPUTUSAN.md)

## Fitur

- **CRUD lengkap** untuk Warga, Keluarga (KK), Status Ibu, Kelahiran, Kematian, Peserta KB, Pekarangan & IRT, Dasawisma, Tag, Daftar Pilihan, Isian Kampung KB, dan Arsip. Hapus selalu masuk **Tempat Sampah** (bisa **Urungkan** / Pulihkan).
- **Form wizard 9 langkah** untuk warga (identitas, wilayah, kegiatan PKK, kesehatan, ibu & anak, pendidikan/ekonomi, pekarangan, IRT, tag) + isi otomatis tgl lahir/JK dari NIK.
- **Laporan** (setiap tab Excel): Penduduk 15–59, Kampung KB, WUS, PUS, Pencatatan Ibu Hamil & KB, Rekap Catatan Data & Kegiatan (RT / per Dasawisma), Rekap Ibu Hamil, Catatan Ibu Hamil per Dasawisma, Register Kelahiran, Data Warga TP PKK, Data Keluarga, Catatan Keluarga, HATINYA PKK & IRT, Arsip.
  - Klik **angka** → daftar nama di baliknya; klik **nama** → ubah data langsung dari laporan.
  - **Cetak / PDF**: pilih A4/F4/Legal, potret/lanskap, hemat tinta, sembunyikan NIK → dialog cetak browser (pilih printer atau *Simpan sebagai PDF*).
  - Ekspor tabel laporan ke **Excel**; formulir per KK/orang bisa **Cetak semua**.
- **Impor** file `.xlsm` lama (di perangkat, tidak dikirim ke server) & **ekspor** `.xlsx`; **cadangan/pulihkan** `.json`.
- Dashboard berwarna (kartu statistik animasi, piramida penduduk, grafik), tag otomatis (Balita, WUS, PUS, Ibu Hamil, Lansia, …), tag kustom, pencarian cepat `Ctrl+K`, mode gelap, PWA (bisa dipasang di layar utama HP).

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test aturan hitung
npm run build      # hasil statis di dist/ — bisa di-hosting di Netlify/Vercel/GitHub Pages/hosting biasa
```

Uji impor dengan file Excel asli (file **tidak** disimpan di repo karena berisi data pribadi):

```bash
XLSM_PATH=/path/Data_Warga_mantup_RT_8_VB.xlsm npm test
```

## Teknologi

React 18 + Vite + TypeScript, Tailwind CSS, Framer Motion, lucide-react, Recharts, SheetJS (xlsx), Zustand (penyimpanan di browser), sonner, canvas-confetti.
