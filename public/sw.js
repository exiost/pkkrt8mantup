/* SIWARGA PKK — agar aplikasi tetap bisa dibuka tanpa internet.
 * Halaman: ambil dari internet dulu, bila gagal pakai salinan. File aplikasi (assets/ bernama unik): simpan sekali.
 * Data (/api) TIDAK disimpan di sini — data offline diurus aplikasi sendiri. */
const CACHE = 'siwarga-v1'
const scope = self.registration.scope

async function simpanHalaman() {
  const c = await caches.open(CACHE)
  const r = await fetch(scope, { cache: 'no-store' })
  if (!r.ok) return
  await c.put(scope, r.clone())
  const html = await r.text()
  const files = [...html.matchAll(/(?:src|href)="\.?\/?((?:assets\/)[^"]+)"/g)].map((m) => new URL(m[1], scope).href)
  files.push(new URL('icon.svg', scope).href, new URL('manifest.webmanifest', scope).href)
  await Promise.all(files.map((f) => c.add(f).catch(() => {})))
}

self.addEventListener('install', (e) => { e.waitUntil(simpanHalaman().catch(() => {})); self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin || url.pathname.includes('/api/') || url.pathname.endsWith('/api')) return
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req)
        if (r.ok) { const c = await caches.open(CACHE); await c.put(scope, r.clone()); simpanHalaman().catch(() => {}) }
        return r
      } catch {
        return (await caches.match(scope)) || (await caches.match(req)) || Response.error()
      }
    })())
    return
  }
  if (url.pathname.includes('/assets/') || url.pathname.endsWith('/icon.svg') || url.pathname.endsWith('.webmanifest')) {
    e.respondWith((async () => {
      const hit = await caches.match(req)
      if (hit) return hit
      const r = await fetch(req)
      if (r.ok) (await caches.open(CACHE)).put(req, r.clone())
      return r
    })())
  }
})
