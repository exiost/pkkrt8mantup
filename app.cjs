// Titik masuk untuk cPanel → "Setup Node.js App" (Passenger).
// Isi "Application startup file" dengan: app.cjs
process.env.SIWARGA_LISTEN = '1'
import('./server/index.mjs').catch((e) => {
  console.error('Gagal menjalankan SIWARGA:', e)
  process.exit(1)
})
