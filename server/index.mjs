import express from 'express'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, createReadStream } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb, createStore, COLLECTIONS } from './db.mjs'
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROLES = ['admin', 'editor', 'viewer']
const VER = (() => { try { return JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8')).version } catch { return '' } })()

/** cadangan harian: salinan utuh database di DATA_DIR/cadangan-harian, disimpan 14 hari terakhir */
export function cadanganHarian(db, folder, simpan = 14, hari = new Date().toISOString().slice(0, 10)) {
  mkdirSync(folder, { recursive: true })
  const nama = `siwarga-${hari}.db`
  const file = join(folder, nama)
  if (!existsSync(file)) db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`)
  const semua = readdirSync(folder).filter((f) => /^siwarga-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort()
  for (const f of semua.slice(0, Math.max(0, semua.length - simpan))) { try { unlinkSync(join(folder, f)) } catch { /* abaikan */ } }
  return nama
}
export const daftarCadangan = (folder) => (existsSync(folder) ? readdirSync(folder).filter((f) => /^siwarga-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().reverse().map((f) => ({ nama: f, ukuran: statSync(join(folder, f)).size })) : [])

export function createApp({ dbFile, distDir, corsOrigin = '*', backupDir } = {}) {
  const file = dbFile ?? join(process.env.DATA_DIR ?? resolve(here, '../data'), 'siwarga.db')
  const db = openDb(file)
  const folderCadangan = backupDir ?? (file === ':memory:' ? null : join(dirname(file), 'cadangan-harian'))
  const buatCadangan = () => { if (!folderCadangan) return null; try { return cadanganHarian(db, folderCadangan) } catch (e) { console.error('Cadangan harian gagal:', e.message); return null } }
  const store = createStore(db)
  let secret = store.meta('secret')
  if (!secret) { secret = randomBytes(32).toString('hex'); store.setMeta('secret', secret) }

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '50mb' }))

  // Bisa dipasang di sub-alamat (mis. cPanel: domain.id/data-warga): buang awalan sebelum /api atau file aplikasi
  app.use((req, _res, next) => {
    const m = req.url.match(/\/(api(?:[/?].*)?|assets\/.*|icon\.svg.*|manifest\.webmanifest.*|sw\.js.*)$/)
    if (m && req.url !== '/' + m[1]) req.url = '/' + m[1]
    next()
  })

  // --- CORS (mode bearer-token, tanpa cookie) & header keamanan dasar ---
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin)
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-RT')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  // --- jawaban data dipadatkan (gzip): data 17 RT ±5 MB → ±0,5 MB, jauh lebih cepat di sinyal HP ---
  app.use('/api', (req, res, next) => {
    if (!/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) return next()
    const json = res.json.bind(res)
    res.json = (body) => {
      const txt = JSON.stringify(body)
      if (txt.length < 2048 || res.headersSent) return json(body)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Encoding', 'gzip')
      res.setHeader('Vary', 'Accept-Encoding')
      return res.end(gzipSync(txt, { level: 6 }))
    }
    next()
  })

  // --- pembatas percobaan login ---
  const fails = new Map()
  const limited = (key) => { const f = fails.get(key); return f && f.n >= 8 && Date.now() - f.t < 15 * 60 * 1000 }
  const fail = (key) => { const f = fails.get(key); fails.set(key, { n: (f && Date.now() - f.t < 15 * 60 * 1000 ? f.n : 0) + 1, t: Date.now() }) }

  const auth = (roles) => (req, res, next) => {
    const h = req.headers.authorization ?? ''
    const p = verifyToken(h.startsWith('Bearer ') ? h.slice(7) : '', secret)
    const u = p && store.q.userById.get(p.uid)
    if (!u || !u.active) return res.status(401).json({ error: 'Sesi berakhir, silakan masuk lagi' })
    if (roles && !roles.includes(u.role)) return res.status(403).json({ error: 'Akun Anda tidak boleh melakukan ini' })
    req.user = u
    // RT yang sedang dikerjakan: akun RT selalu RT-nya sendiri; Admin Desa memilih lewat header X-RT
    const daftar = store.rts()
    if (u.rt) req.rt = u.rt
    else {
      const pilih = String(req.headers['x-rt'] ?? '')
      if (pilih && !daftar.includes(pilih)) return res.status(400).json({ error: `RT ${pilih} tidak terdaftar` })
      // tanpa pilihan: RT terakhir yang dibuka akun ini (di perangkat mana pun)
      const terakhir = store.meta(`rtTerakhir:${u.id}`)
      req.rt = pilih || (terakhir && daftar.includes(terakhir) ? terakhir : daftar[0]) || '01'
    }
    req.desa = !u.rt && u.role === 'admin'
    if (u.ganti && req.path !== '/api/me' && req.path !== '/api/me/password') return res.status(403).json({ error: 'Ganti kata sandi dulu sebelum memakai aplikasi', harusGanti: true })
    next()
  }
  /** nomor "generasi" data RT: naik bila data dipindah/dipulihkan, agar perangkat lain memuat ulang penuh */
  const genRT = (rt) => store.meta(`gen:${rt}`) ?? '0'
  const naikGen = (rt) => store.setMeta(`gen:${rt}`, String(Number(genRT(rt)) + 1))
  const desaOnly = (req, res, next) => (req.desa ? next() : res.status(403).json({ error: 'Hanya Admin Desa yang boleh melakukan ini' }))
  const settingsOf = (rt) => { const v = store.meta(`settings:${rt}`); return v ? JSON.parse(v) : null }
  const wrap = (fn) => (req, res) => { try { fn(req, res) } catch (e) { console.error(e); res.status(400).json({ error: e.message || 'Permintaan tidak valid' }) } }
  const session = (u) => ({ token: signToken({ uid: u.id }, secret), user: store.publicUser(u) })
  const validPw = (pw) => typeof pw === 'string' && pw.length >= 8

  app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'siwarga-pkk', ver: VER, dir: resolve(here, '..'), needsSetup: store.q.userCount.get().n === 0 }))

  app.post('/api/setup', wrap((req, res) => {
    if (store.q.userCount.get().n > 0) return res.status(403).json({ error: 'Server sudah disiapkan' })
    const { username, password, name } = req.body ?? {}
    if (!username?.trim() || !validPw(password)) return res.status(400).json({ error: 'Isi nama pengguna dan kata sandi (minimal 8 karakter)' })
    // akun pertama di server baru = Admin Desa (rt kosong)
    const u = { id: randomUUID(), username: username.trim(), name: (name ?? '').trim() || username.trim(), pass: hashPassword(password), role: 'admin', rt: null }
    store.q.insUser.run(u.id, u.username, u.name, u.pass, 'admin', new Date().toISOString(), null)
    res.json(session(u))
  }))

  app.post('/api/login', wrap((req, res) => {
    const { username, password } = req.body ?? {}
    const key = `${req.ip}|${String(username ?? '').toLowerCase()}`
    if (limited(key)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' })
    const u = store.q.userByName.get(String(username ?? ''))
    if (!u || !u.active || !verifyPassword(String(password ?? ''), u.pass)) { fail(key); return res.status(401).json({ error: 'Nama pengguna atau kata sandi salah' }) }
    fails.delete(key)
    res.json(session(u))
  }))

  app.get('/api/me', auth(), (req, res) => res.json({ user: store.publicUser(req.user), rts: store.rts(), rt: req.rt }))

  app.post('/api/me/rt', auth(['admin']), desaOnly, wrap((req, res) => {
    const rt = String(req.body?.rt ?? '')
    if (!store.rts().includes(rt)) return res.status(400).json({ error: 'RT tidak dikenal' })
    store.setMeta(`rtTerakhir:${req.user.id}`, rt)
    res.json({ ok: true, rt })
  }))

  app.post('/api/me/password', auth(), wrap((req, res) => {
    const { old, next } = req.body ?? {}
    if (!verifyPassword(String(old ?? ''), req.user.pass)) return res.status(400).json({ error: 'Kata sandi lama salah' })
    if (!validPw(next)) return res.status(400).json({ error: 'Kata sandi baru minimal 8 karakter' })
    if (verifyPassword(String(next), req.user.pass)) return res.status(400).json({ error: 'Kata sandi baru harus berbeda dari yang lama' })
    store.q.updPass.run(hashPassword(next), req.user.id)
    store.q.setGanti.run(0, req.user.id)
    res.json({ ok: true })
  }))

  // --- data ---
  app.get('/api/data', auth(), wrap((req, res) => {
    const since = Number(req.query.since) || 0
    const seq = store.seq()
    const cols = store.snapshot(since, req.rt)
    res.json({ seq, rt: req.rt, gen: genRT(req.rt), full: !since, collections: cols, settings: settingsOf(req.rt) })
  }))

  app.post('/api/ops', auth(['admin', 'editor']), wrap((req, res) => {
    const ops = req.body?.ops
    if (!Array.isArray(ops) || ops.length > 5000) return res.status(400).json({ error: 'Daftar operasi tidak valid' })
    const admin = req.user.role === 'admin'
    const conflicts = []
    store.tx(() => {
      for (const op of ops) {
        if (op.t === 'del' && !admin) throw new Error('Hanya admin yang boleh menghapus permanen')
        if (op.t === 'settings') {
          // kunci tanggal laporan hanya boleh diubah admin
          const next = { ...op.settings }
          if (!admin) {
            const kunci = settingsOf(req.rt)?.kunci
            if (kunci === undefined) delete next.kunci; else next.kunci = kunci
          }
          store.setMeta(`settings:${req.rt}`, JSON.stringify(next))
          continue
        }
        const c = store.applyOp(op, req.user.name || req.user.username, req.rt)
        if (c) conflicts.push(c)
      }
    })
    res.json({ seq: store.seq(), conflicts })
  }))

  // --- pengguna: Admin Desa mengelola semua akun; Admin RT hanya akun RT-nya ---
  const bolehKelola = (req, u) => req.desa || (u.rt && u.rt === req.user.rt)
  /** rt tujuan untuk akun baru/ubah. desa=true → Admin Desa (rt kosong) */
  const rtTujuan = (req, body, lama) => {
    if (!req.desa) return req.user.rt
    if (body.desa) return null
    const rt = body.rt === undefined ? lama : body.rt
    if (!rt || !store.rts().includes(rt)) throw new Error('Pilih RT untuk akun ini')
    return rt
  }
  app.get('/api/users', auth(['admin']), (req, res) => res.json({
    adaDesa: store.q.desaCount.get().n > 0,
    users: store.q.users.all().filter((u) => req.desa || u.rt === req.user.rt).map((u) => ({ ...u, active: !!u.active, rt: u.rt ?? null, desa: u.role === 'admin' && !u.rt })),
  }))

  app.post('/api/users', auth(['admin']), wrap((req, res) => {
    const { username, name, password, role } = req.body ?? {}
    if (!username?.trim() || !validPw(password) || !ROLES.includes(role)) return res.status(400).json({ error: 'Isi nama pengguna, peran, dan kata sandi (minimal 8 karakter)' })
    if (store.q.userByName.get(username.trim())) return res.status(409).json({ error: 'Nama pengguna sudah dipakai' })
    // akun Admin Desa hanya boleh dibuat Admin Desa, atau (sekali) oleh admin bila belum ada Admin Desa sama sekali
    const mintaDesa = !!req.body.desa && role === 'admin'
    if (mintaDesa && !req.desa && store.q.desaCount.get().n > 0) return res.status(403).json({ error: 'Hanya Admin Desa yang boleh membuat akun Admin Desa' })
    const rt = mintaDesa ? null : rtTujuan(req, { ...req.body, desa: false }, undefined)
    const id = randomUUID()
    store.q.insUser.run(id, username.trim(), (name ?? '').trim() || username.trim(), hashPassword(password), role, new Date().toISOString(), rt)
    store.q.setGanti.run(1, id) // akun baru wajib mengganti kata sandi pemberian admin
    res.json({ user: store.publicUser(store.q.userById.get(id)) })
  }))

  const sisaDesa = (u, role, active, rt) => u.role === 'admin' && !u.rt && (role !== 'admin' || !active || rt) && store.q.desaCount.get().n <= 1
  app.put('/api/users/:id', auth(['admin']), wrap((req, res) => {
    const u = store.q.userById.get(req.params.id)
    if (!u || !bolehKelola(req, u)) return res.status(404).json({ error: 'Pengguna tidak ditemukan' })
    const role = req.body.role ?? u.role
    const active = req.body.active === undefined ? !!u.active : !!req.body.active
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Peran tidak valid' })
    const jadiDesa = role === 'admin' && (req.body.desa ?? (!u.rt && req.body.rt === undefined))
    const rt = req.desa ? (jadiDesa ? null : rtTujuan(req, { ...req.body, desa: false }, u.rt)) : u.rt
    if (sisaDesa(u, role, active, rt)) return res.status(400).json({ error: 'Harus ada minimal satu Admin Desa aktif' })
    store.q.updUser.run((req.body.name ?? u.name).trim(), role, active ? 1 : 0, rt, u.id)
    if (req.body.password !== undefined) {
      if (!validPw(req.body.password)) return res.status(400).json({ error: 'Kata sandi minimal 8 karakter' })
      store.q.updPass.run(hashPassword(req.body.password), u.id)
      if (u.id !== req.user.id) store.q.setGanti.run(1, u.id)
    }
    res.json({ user: store.publicUser(store.q.userById.get(u.id)) })
  }))

  app.delete('/api/users/:id', auth(['admin']), wrap((req, res) => {
    const u = store.q.userById.get(req.params.id)
    if (!u || !bolehKelola(req, u)) return res.status(404).json({ error: 'Pengguna tidak ditemukan' })
    if (u.id === req.user.id) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' })
    if (sisaDesa(u, 'x', false, null)) return res.status(400).json({ error: 'Harus ada minimal satu Admin Desa aktif' })
    store.q.delUser.run(u.id)
    res.json({ ok: true })
  }))

  // --- daftar RT (Admin Desa) ---
  app.get('/api/rts', auth(['admin']), desaOnly, (_req, res) => {
    const ring = {}
    for (const r of store.q.ringkasRT.all()) (ring[r.rt] ??= {})[r.coll] = r
    const users = store.q.users.all()
    res.json({
      rts: store.rts().map((rt) => ({
        rt,
        warga: ring[rt]?.warga?.n ?? 0,
        keluarga: ring[rt]?.keluarga?.n ?? 0,
        akhir: [ring[rt]?.warga?.akhir, ring[rt]?.keluarga?.akhir, ring[rt]?.audit?.akhir].filter(Boolean).sort().pop() ?? null,
        akun: users.filter((u) => u.rt === rt).map((u) => ({ username: u.username, name: u.name, role: u.role, active: !!u.active })),
      })),
    })
  })

  // --- cadangan ---
  app.get('/api/backup', auth(['admin']), (req, res) => {
    res.json({ versi: 2, rt: req.rt, dibuat: new Date().toISOString(), settings: settingsOf(req.rt), ...store.snapshot(0, req.rt) })
  })
  app.post('/api/restore', auth(['admin']), wrap((req, res) => {
    const d = req.body
    if (!d || !Array.isArray(d.warga)) return res.status(400).json({ error: 'Format cadangan tidak dikenali' })
    store.restore(d, req.rt)
    naikGen(req.rt)
    res.json({ ok: true, seq: store.seq() })
  }))

  // --- kirim data RT lewat file (.siwarga): pratinjau, impor (perubahan terakhir menang), cadangan otomatis ---
  const berkasRT = (req) => {
    const b = req.body?.berkas
    if (!b || b.format !== 'siwarga-rt' || !store.rts().includes(b.rt)) throw new Error('File ini bukan ekspor data RT dari SIWARGA')
    if (!req.desa && b.rt !== req.user.rt) { const e = new Error(`File ini milik RT ${b.rt}. Akun Anda hanya untuk RT ${req.user.rt}.`); e.status = 403; throw e }
    return b
  }
  const ringkas = (h) => Object.fromEntries(Object.entries(h).map(([c, r]) => [c, { baru: r.baru.length, berubah: r.berubah.length, lebihBaruDiServer: r.lebihBaruDiServer, sama: r.sama, milikRTLain: r.milikRTLain, hanyaDiServer: r.hanyaDiServer.length }]))
  app.post('/api/rt-impor', auth(['admin']), (req, res) => {
    try {
      const b = berkasRT(req)
      const rt = b.rt
      const h = store.bandingkan(b, rt)
      if (req.body.cek) return res.json({ rt, dibuat: b.dibuat, ringkas: ringkas(h) })
      let cad
      store.tx(() => {
        cad = store.simpanCadangan(rt, `Sebelum impor file RT ${rt} (${b.dibuat ?? '-'})`, settingsOf(rt))
        let seq = store.seq()
        for (const [c, r] of Object.entries(h)) {
          for (const rec of [...r.baru, ...r.berubah]) store.q.putRec.run(c, rec.id, JSON.stringify(rec), rec.updatedAt ?? new Date().toISOString(), ++seq, rt)
          if (req.body.hapus) for (const id of r.hanyaDiServer) store.q.purgeRec.run(c, id, new Date().toISOString(), ++seq, rt)
        }
        if (b.settings && !settingsOf(rt)) store.setMeta(`settings:${rt}`, JSON.stringify(b.settings))
        const e = { id: randomUUID(), waktu: new Date().toISOString(), koleksi: 'warga', recordId: '', aksi: 'Ubah', label: `Impor file data RT ${rt}`, oleh: req.user.name || req.user.username }
        store.q.putRec.run('audit', e.id, JSON.stringify(e), e.waktu, ++seq, rt)
      })
      res.json({ ok: true, rt, cadangan: cad.id, ringkas: ringkas(h), seq: store.seq() })
    } catch (e) { res.status(e.status ?? 400).json({ error: e.message }) }
  })
  const rtDari = (req) => (req.desa && req.query.rt && store.rts().includes(String(req.query.rt)) ? String(req.query.rt) : req.rt)
  app.get('/api/rt-cadangan', auth(['admin']), (req, res) => {
    const rt = rtDari(req)
    res.json({ rt, list: store.cadangan(rt).map(({ data: _d, ...x }) => x) })
  })
  app.post('/api/rt-cadangan/pulihkan', auth(['admin']), wrap((req, res) => {
    const rt = req.desa && req.body?.rt ? String(req.body.rt) : req.rt
    if (!store.rts().includes(rt)) return res.status(400).json({ error: 'RT tidak dikenal' })
    const c = store.cadangan(rt).find((x) => x.id === req.body?.id)
    if (!c) return res.status(404).json({ error: 'Cadangan tidak ditemukan' })
    store.simpanCadangan(rt, 'Sebelum mengembalikan cadangan', settingsOf(rt))
    store.restore(c.data, rt)
    naikGen(rt)
    res.json({ ok: true, seq: store.seq() })
  }))

  // --- cek NIK di semua RT (peringatan saat mengisi data) ---
  app.get('/api/cek-nik', auth(['admin', 'editor']), (req, res) => {
    const nik = String(req.query.nik ?? '').replace(/\D/g, '')
    if (nik.length < 10) return res.json({ ada: [] })
    const kecuali = String(req.query.kecuali ?? '')
    const samar = (n) => String(n ?? '').split(/\s+/).filter(Boolean).map((k, i) => (i === 0 ? k : `${k[0]}.`)).join(' ')
    const ada = store.q.nikSemua.all(`%${nik.slice(-6)}%`).map((r) => ({ r, w: JSON.parse(r.data) }))
      .filter(({ r, w }) => r.id !== kecuali && String(w.nik ?? '').replace(/\D/g, '') === nik)
      .map(({ r, w }) => {
        const boleh = req.desa || r.rt === req.rt
        return { rt: r.rt, nama: boleh ? w.nama : samar(w.nama), id: boleh ? r.id : undefined, dihapus: !!w.deletedAt, status: w.statusWarga }
      })
    res.json({ ada })
  })

  // --- pindah warga antar-RT (Admin Desa) ---
  app.post('/api/pindah-rt', auth(['admin']), desaOnly, wrap((req, res) => {
    const { id, keRT, sekeluarga } = req.body ?? {}
    const cur = store.q.getRec.get('warga', String(id ?? ''))
    if (!cur || cur.purged) return res.status(404).json({ error: 'Warga tidak ditemukan' })
    const dari = cur.rt
    if (!store.rts().includes(keRT) || keRT === dari) return res.status(400).json({ error: 'Pilih RT tujuan yang berbeda' })
    const w0 = JSON.parse(cur.data)
    const now = new Date().toISOString()
    const tujuan = store.snapshot(0, keRT)
    const dwTujuan = new Set(tujuan.dasawisma.filter((d) => !d.deletedAt).map((d) => d.nama))
    const pindahkan = []
    let kel = null
    if (sekeluarga && w0.keluargaId) {
      const k = store.q.getRec.get('keluarga', w0.keluargaId)
      if (k && !k.purged && k.rt === dari) kel = JSON.parse(k.data)
      for (const w of store.snapshot(0, dari).warga) if (!w.deletedAt && w.keluargaId === w0.keluargaId) pindahkan.push(w)
    } else pindahkan.push(w0)
    const alamatBaru = (a) => String(a ?? '').replace(new RegExp(`RT\\s*0*${Number(dari)}\\b`, 'i'), `RT ${keRT}`)
    store.tx(() => {
      let seq = store.seq()
      if (kel) {
        const nomor = tujuan.keluarga.reduce((m, k) => Math.max(m, Number(k.nomor) || 0), 0) + 1
        store.q.pindahRec.run(keRT, JSON.stringify({ ...kel, nomor, updatedAt: now }), now, ++seq, 'keluarga', kel.id)
      }
      for (const w of pindahkan) {
        const baru = { ...w, keluargaId: kel ? w.keluargaId : '', dasawisma: dwTujuan.has(w.dasawisma) ? w.dasawisma : '', alamat: alamatBaru(w.alamat), updatedAt: now }
        store.q.pindahRec.run(keRT, JSON.stringify(baru), now, ++seq, 'warga', w.id)
      }
      const oleh = req.user.name || req.user.username
      const nama = pindahkan.map((w) => w.nama).join(', ')
      for (const [rt, label] of [[dari, `Pindah ke RT ${keRT}: ${nama}`], [keRT, `Pindah dari RT ${dari}: ${nama}`]]) {
        const e = { id: randomUUID(), waktu: now, koleksi: 'warga', recordId: w0.id, aksi: 'Ubah', label, oleh }
        store.q.putRec.run('audit', e.id, JSON.stringify(e), now, ++seq, rt)
      }
      naikGen(dari); naikGen(keRT)
    })
    res.json({ ok: true, dari, keRT, jumlah: pindahkan.length, keluarga: !!kel })
  }))

  // --- catatan aktivitas seluruh desa (Admin Desa) ---
  app.get('/api/aktivitas', auth(['admin']), desaOnly, (req, res) => {
    const n = Math.min(1000, Math.max(1, Number(req.query.limit) || 300))
    res.json({ list: store.q.auditSemua.all(n).map((r) => ({ ...JSON.parse(r.data), rt: r.rt })) })
  })

  // --- gabungan desa: seluruh data semua RT (hanya baca, untuk laporan Desa Mantup) ---
  app.get('/api/desa', auth(['admin']), desaOnly, (_req, res) => {
    res.json({
      rts: store.rts().map((rt) => {
        const { audit: _a, ...cols } = store.snapshot(0, rt)
        return { rt, settings: settingsOf(rt), ...cols }
      }),
    })
  })

  // --- cadangan harian seluruh database (Admin Desa) ---
  app.get('/api/cadangan-harian', auth(['admin']), desaOnly, (_req, res) => res.json({ list: folderCadangan ? daftarCadangan(folderCadangan) : [] }))
  app.get('/api/cadangan-harian/:nama', auth(['admin']), desaOnly, (req, res) => {
    const nama = String(req.params.nama)
    if (!folderCadangan || !/^siwarga-\d{4}-\d{2}-\d{2}\.db$/.test(nama) || !existsSync(join(folderCadangan, nama))) return res.status(404).json({ error: 'Cadangan tidak ditemukan' })
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${nama}"`)
    createReadStream(join(folderCadangan, nama)).pipe(res)
  })

  // --- cadangan ke Google Drive: skrip Google Apps Script milik Admin Desa mengambil cadangan terbaru tiap hari ---
  const kunciCadangan = () => { let k = store.meta('kunciCadangan'); if (!k) { k = randomBytes(24).toString('hex'); store.setMeta('kunciCadangan', k) } return k }
  const cocok = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y) }
  app.get('/api/cadangan-kunci', auth(['admin']), desaOnly, (_req, res) => res.json({ kunci: kunciCadangan() }))
  app.post('/api/cadangan-kunci/baru', auth(['admin']), desaOnly, (_req, res) => { const k = randomBytes(24).toString('hex'); store.setMeta('kunciCadangan', k); res.json({ kunci: k }) })
  app.get('/api/cadangan-terbaru', (req, res) => {
    const key = `cad|${req.ip}`
    if (limited(key)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' })
    const k = store.meta('kunciCadangan')
    if (!k || !cocok(req.query.kunci ?? '', k)) { fail(key); return res.status(401).json({ error: 'Kunci cadangan salah' }) }
    if (!folderCadangan) return res.status(404).json({ error: 'Cadangan tidak tersedia' })
    buatCadangan() // pastikan cadangan hari ini sudah ada
    const terbaru = daftarCadangan(folderCadangan)[0]
    if (!terbaru) return res.status(404).json({ error: 'Belum ada cadangan' })
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${terbaru.nama}"`)
    res.setHeader('Content-Length', String(terbaru.ukuran))
    createReadStream(join(folderCadangan, terbaru.nama)).pipe(res)
  })

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Tidak ditemukan' }))

  // --- aplikasi web (hasil build) ---
  const dist = distDir ?? resolve(here, '../dist')
  if (existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h', index: 'index.html', setHeaders: (res, f) => { if (f.endsWith('.html') || f.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache') } }))
    app.get('*', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(join(dist, 'index.html')) })
  }
  // cadangan pertama saat server menyala, lalu dicek tiap jam (satu file per hari)
  buatCadangan()
  const jam = setInterval(buatCadangan, 60 * 60 * 1000)
  jam.unref?.()
  return { app, db, store, buatCadangan }
}

if (process.env.SIWARGA_LISTEN || (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))) {
  const port = Number(process.env.PORT) || 3000
  const { app } = createApp({ corsOrigin: process.env.CORS_ORIGIN ?? '*' })
  app.listen(port, () => console.log(`SIWARGA PKK berjalan di http://localhost:${port}`))
}
