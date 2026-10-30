@echo off
chcp 65001 >nul
echo === SIWARGA PKK: menjalankan server di komputer ini ===
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Pasang dulu dari https://nodejs.org ^(pilih versi LTS 22 atau lebih baru^), lalu jalankan file ini lagi.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Memasang paket ^(hanya sekali, perlu internet^)...
  call npm install
)
if not exist dist (
  echo Membangun aplikasi ^(hanya sekali^)...
  call npm run build
)
echo.
echo Server berjalan. Buka di browser: http://localhost:3000
echo HP/laptop lain di Wi-Fi yang sama: http://ALAMAT-IP-KOMPUTER-INI:3000
echo Tutup jendela ini untuk menghentikan server.
echo.
node --disable-warning=ExperimentalWarning server\index.mjs
pause
