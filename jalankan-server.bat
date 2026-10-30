@echo off
chcp 65001 >nul
echo === SIWARGA PKK: menjalankan server di komputer ini ===
rem Kalau SIWARGA PKK sudah berjalan, cukup buka browser lalu selesai
rem Hanya dianggap "sudah berjalan" bila folder DAN versinya sama. Server lama dari folder/versi lain dihentikan dulu.
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content package.json -Raw | ConvertFrom-Json).version"`) do set VERBARU=%%v
powershell -NoProfile -Command "try { $h = Invoke-RestMethod -TimeoutSec 2 http://localhost:3000/api/health } catch { exit 1 }; if ($h.dir -eq (Get-Location).Path -and $h.ver -eq '%VERBARU%') { exit 0 } else { exit 2 }" >nul 2>nul
if "%errorlevel%"=="0" (
  echo SIWARGA PKK sudah berjalan. Membuka browser...
  start "" http://localhost:3000
  exit /b 0
)
if "%errorlevel%"=="2" (
  echo Ada SIWARGA versi/folder lama yang masih berjalan. Menghentikannya...
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>nul
  timeout /t 2 /nobreak >nul
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
echo Membangun aplikasi versi terbaru ^(sekitar 10-30 detik^)...
call npm run build
if errorlevel 1 (
  echo Gagal membangun aplikasi.
  pause
  exit /b 1
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
