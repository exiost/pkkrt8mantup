#!/usr/bin/env bash
# Menjalankan SIWARGA PKK (server + SQLite) di komputer ini. Perlu Node.js 22 atau lebih baru.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Pasang Node.js dulu: https://nodejs.org"; exit 1; }
URL=http://localhost:3000
bukaBrowser() { (xdg-open "$URL" || open "$URL") >/dev/null 2>&1 || true; }
# Kalau sudah berjalan, cukup buka browser
if curl -fs -m 2 "$URL/api/health" >/dev/null 2>&1; then echo "SIWARGA PKK sudah berjalan. Membuka browser..."; bukaBrowser; exit 0; fi
[ -d node_modules ] || npm install
echo 'Membangun aplikasi versi terbaru...'
npm run build
echo "Server berjalan: http://localhost:3000"
(sleep 3; bukaBrowser) &
exec node --disable-warning=ExperimentalWarning server/index.mjs
