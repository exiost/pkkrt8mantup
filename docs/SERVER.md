# Memasang Server (login + data tersimpan di SQLite)

Aplikasi punya **dua cara pakai**:

| | Mode lokal | Mode server |
|---|---|---|
| Login | tidak ada | **ada** (admin / pengurus / pembaca) |
| Data disimpan di | browser tiap perangkat | **database SQLite di server** |
| HP dan laptop melihat data yang sama | tidak (harus cadangan/pulihkan) | **ya, otomatis** |
| Perlu hosting | tidak (cukup GitHub Pages) | ya |

Aplikasi memilih sendiri: bila di alamat yang sama ada server SIWARGA, layar **login** muncul. Bila tidak ada, aplikasi berjalan di mode lokal.

> **Kenapa perlu server?** GitHub Pages hanya menyimpan halaman web, bukan data. Tanpa server, siapa pun yang membuka alamatnya melihat aplikasi kosong, dan data hanya ada di browser Anda sendiri. Dengan server, data warga ada di database yang **hanya bisa dibuka setelah login**.

---

## Pilihan 1 (paling mudah, berbayar): Render.com

Perkiraan biaya: paket *Starter* (sekitar US$7/bulan) + disk 1 GB (sekitar US$0,25/bulan). Disk permanen diperlukan agar data SQLite tidak hilang saat server dihidupkan ulang.

1. Daftar di **https://render.com** (bisa langsung dengan akun GitHub).
2. Klik **New +** → **Blueprint**.
3. Hubungkan akun GitHub, pilih repositori **exiost/pkkrt8mantup**, pilih branch yang berisi file `render.yaml`, lalu **Apply**.
4. Tunggu 5–10 menit sampai statusnya **Live**. Render memberi alamat seperti `https://siwarga-pkk-xxxx.onrender.com` (sudah HTTPS).
5. Buka alamat itu. Muncul **“Buat akun admin pertama”**. Isi nama, nama pengguna, dan kata sandi (minimal 8 karakter). Selesai.

## Pilihan 2: Komputer sendiri (gratis, untuk dipakai di rumah/kantor)

Cocok bila server cukup dipakai di jaringan Wi-Fi yang sama.

1. Pasang **Node.js** versi LTS (22 atau lebih baru) dari https://nodejs.org
2. Di halaman GitHub repositori klik **Code → Download ZIP**, lalu ekstrak.
3. **Windows:** klik dua kali **`jalankan-server.bat`**. (Mac/Linux: jalankan `./jalankan-server.sh`.) Pertama kali butuh internet beberapa menit.
4. Buka **http://localhost:3000** dan buat akun admin.
5. HP/laptop lain di Wi-Fi yang sama membuka `http://ALAMAT-IP-KOMPUTER:3000` (lihat alamat IP di pengaturan jaringan komputer).

Data ada di folder `data/siwarga.db`. Komputer harus menyala dan jendela server tidak ditutup. Untuk membuka dari luar rumah diperlukan layanan terowongan (mis. Cloudflare Tunnel); itu di luar panduan ini.

## Pilihan 3: Docker di VPS

```bash
docker build -t siwarga .
docker run -d --name siwarga --restart=always -p 3000:3000 -v siwarga-data:/data siwarga
```

Pasang HTTPS di depannya (Caddy/Nginx) sebelum dipakai lewat internet.

---

## Setelah server hidup

- **Tambah pengguna:** *Pengaturan → Akun & Server → Pengguna → Tambah*.
  - **Admin**: semua hak (kelola pengguna, impor, hapus permanen, cadangan).
  - **Pengurus**: tambah/ubah/hapus data (hapus ke Tempat Sampah).
  - **Pembaca**: hanya melihat dan mencetak.
- **Impor file Excel lama:** login sebagai admin → *Impor / Ekspor* → pilih file `.xlsm`. Hasilnya langsung tersimpan di server.
- **Pindahkan data dari mode lokal:** buka aplikasi lama di browser tempat data itu tersimpan → *Pengaturan → Akun & Server → Kirim data dari browser ini*. (Atau unduh cadangan di mode lokal lalu impor.)
- **Cadangan:** *Pengaturan → Akun & Server → Unduh cadangan*. Lakukan rutin (mis. seminggu sekali) dan simpan di tempat lain.
- **Lupa kata sandi:** admin mengaturnya ulang di *Pengguna → Ubah*.

## Memakai tampilan GitHub Pages dengan server terpisah

Alamat `https://exiost.github.io/pkkrt8mantup/` bisa dihubungkan ke server Anda: buka *Pengaturan → Akun & Server → Hubungkan ke server*, isi alamat server (harus `https://`). Setelah itu halaman meminta login ke server tersebut.

## Keamanan singkat

- Kata sandi disimpan terenkripsi (scrypt), sesi berlaku 30 hari, percobaan login salah dibatasi.
- Gunakan **HTTPS** bila dibuka lewat internet (Render sudah otomatis).
- Data warga tidak pernah masuk ke GitHub. Jangan mengunggah file Excel berisi NIK ke repositori.
- Dalam mode server data **tidak** disimpan di browser (hanya token login), jadi aman dipakai di perangkat bersama selama Anda menekan **Keluar**.

## Untuk pengembang

```bash
npm install
npm run build        # membuat folder dist
npm start            # server di http://localhost:3000 (PORT, DATA_DIR bisa diatur)
npm test             # uji aturan hitung, kecocokan dengan Excel, dan API server
```

Variabel lingkungan: `PORT` (3000), `DATA_DIR` (folder database, bawaan `./data`), `CORS_ORIGIN` (bawaan `*`).
API: `/api/health`, `/api/setup`, `/api/login`, `/api/me`, `/api/data?since=`, `/api/ops`, `/api/users`, `/api/backup`, `/api/restore`.
