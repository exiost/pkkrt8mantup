#!/usr/bin/env bash
# Menjalankan SIWARGA PKK (server + SQLite) di komputer ini. Perlu Node.js 22 atau lebih baru.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Pasang Node.js dulu: https://nodejs.org"; exit 1; }
URL=http://localhost:3000
bukaBrowser() { (xdg-open "$URL" || open "$URL") >/dev/null 2>&1 || true; }
# Kalau sudah berjalan, cukup buka browser
if H=$(curl -fs -m 2 "$URL/api/health" 2>/dev/null); then
  VER=$(grep -m1 '"version"' package.json | sed 's/.*: *"\(.*\)".*/\1/')
  if echo "$H" | grep -q "\"ver\":\"$VER\"" && echo "$H" | grep -q "\"dir\":\"$(pwd)\""; then echo "SIWARGA PKK sudah berjalan. Membuka browser..."; bukaBrowser; exit 0; fi
  echo "Ada SIWARGA versi/folder lama yang masih berjalan. Menghentikannya..."
  (command -v fuser >/dev/null && fuser -k 3000/tcp) || (command -v lsof >/dev/null && kill $(lsof -ti tcp:3000)) || true
  sleep 2
fi
[ -d node_modules ] || npm install
echo 'Membangun aplikasi versi terbaru...'
npm run build
echo "Server berjalan: http://localhost:3000"
(sleep 3; bukaBrowser) &
exec node --disable-warning=ExperimentalWarning server/index.mjs
