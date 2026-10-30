// Menyiapkan folder "paket-cpanel" yang siap diunggah ke cPanel.
//   statis/  → isi folder ini ke public_html (mode lokal: data di browser, tanpa login)
//   server/  → unggah ke folder aplikasi Node.js (mode server: SQLite + login + peran)
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const out = join(root, 'paket-cpanel')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('Folder dist belum ada. Jalankan dulu: npm run build')
  process.exit(1)
}
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

// 1) statis
cpSync(dist, join(out, 'statis'), { recursive: true })

// 2) server
const srv = join(out, 'server')
cpSync(dist, join(srv, 'dist'), { recursive: true })
cpSync(join(root, 'server'), join(srv, 'server'), { recursive: true, filter: (p) => !p.includes('__tests__') })
cpSync(join(root, 'app.cjs'), join(srv, 'app.cjs'))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
writeFileSync(join(srv, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, private: true, type: 'module', main: 'app.cjs', dependencies: pkg.dependencies, engines: pkg.engines }, null, 2))

writeFileSync(join(out, 'BACA-DULU.txt'), `PAKET CPANEL — SIWARGA PKK RT 08

PILIHAN A — Statis (paling mudah, tanpa login)
  Unggah ISI folder "statis" ke public_html (atau subfolder). Selesai.
  Data tersimpan di browser tiap perangkat (bukan di server).

PILIHAN B — Server (login admin/editor/viewer, data di SQLite, semua perangkat sama)
  1. Unggah isi folder "server" ke folder di luar public_html, misal /home/USER/siwarga
  2. cPanel → Setup Node.js App → Create Application
       Node.js version : 22.13 atau lebih baru
       Application root: siwarga
       Application URL : domain/subdomain Anda
       Startup file    : app.cjs
  3. Klik "Run NPM Install"
  4. Tambah Environment variable: DATA_DIR = /home/USER/siwarga-data  (folder dibuat sendiri, di luar public_html)
  5. Klik Restart, buka alamat aplikasi, buat akun admin pertama.
  Cadangkan folder DATA_DIR secara berkala (itu isi database).
`)
console.log('Siap: folder paket-cpanel (statis/ dan server/). Baca paket-cpanel/BACA-DULU.txt')
