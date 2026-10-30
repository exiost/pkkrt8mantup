@echo off
chcp 65001 >nul
echo === SIWARGA PKK: menjalankan server di komputer ini ===
rem Kalau SIWARGA PKK sudah berjalan, cukup buka browser lalu selesai
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:3000/api/health).StatusCode | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  echo SIWARGA PKK sudah berjalan. Membuka browser...
  start "" http://localhost:3000
  exit /b 0
)
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
rem Buka browser otomatis beberapa detik lagi (setelah server siap)
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start "" http://localhost:3000"
node --disable-warning=ExperimentalWarning server\index.mjs
pause
