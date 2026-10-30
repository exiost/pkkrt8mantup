#!/usr/bin/env bash
# Menjalankan SIWARGA PKK (server + SQLite) di komputer ini. Perlu Node.js 22 atau lebih baru.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Pasang Node.js dulu: https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install
[ -d dist ] || npm run build
echo "Server berjalan: http://localhost:3000"
exec node --disable-warning=ExperimentalWarning server/index.mjs
