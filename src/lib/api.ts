const LS_URL = 'siwarga-server'
const LS_TOKEN = 'siwarga-token'
const LS_RT = 'siwarga-rt'

const safe = <T,>(f: () => T, d: T): T => { try { return f() } catch { return d } }

/** Alamat server. Kosong = server yang sama dengan halaman ini (mode server bawaan). */
export const getBase = () => safe(() => (localStorage.getItem(LS_URL) ?? '').replace(/\/+$/, ''), '')
export const setBase = (u: string) => safe(() => { u ? localStorage.setItem(LS_URL, u.replace(/\/+$/, '')) : localStorage.removeItem(LS_URL) }, undefined)
export const getToken = () => safe(() => localStorage.getItem(LS_TOKEN), null)
export const setToken = (t: string | null) => safe(() => { t ? localStorage.setItem(LS_TOKEN, t) : localStorage.removeItem(LS_TOKEN) }, undefined)

/** RT yang dipilih Admin Padukuhan (akun RT diabaikan server, selalu RT-nya sendiri) */
export const getRT = () => safe(() => localStorage.getItem(LS_RT) ?? '', '')
export const setRT = (rt: string) => safe(() => { rt ? localStorage.setItem(LS_RT, rt) : localStorage.removeItem(LS_RT) }, undefined)

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

function url(path: string): string {
  const base = getBase()
  return base ? `${base}/api${path}` : new URL(`api${path}`, document.baseURI).toString()
}

export async function api<T = unknown>(path: string, opt: { method?: string; body?: unknown; auth?: boolean; timeout?: number } = {}): Promise<T> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), opt.timeout ?? 30000)
  try {
    const headers: Record<string, string> = {}
    if (opt.body !== undefined) headers['Content-Type'] = 'application/json'
    const tok = getToken()
    if (opt.auth !== false && tok) headers.Authorization = `Bearer ${tok}`
    const rt = getRT()
    if (rt) headers['X-RT'] = rt
    const r = await fetch(url(path), { method: opt.method ?? 'GET', headers, body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined, signal: ctl.signal })
    const data = await r.json().catch(() => null)
    if (!r.ok) throw new ApiError((data as { error?: string } | null)?.error ?? `Server membalas ${r.status}`, r.status)
    return data as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError('Tidak bisa terhubung ke server', 0)
  } finally {
    clearTimeout(t)
  }
}

/** unduh file dari server (dengan login) */
export async function unduhFile(path: string, nama: string) {
  const headers: Record<string, string> = {}
  const tok = getToken()
  if (tok) headers.Authorization = `Bearer ${tok}`
  const r = await fetch(url(path), { headers })
  if (!r.ok) throw new ApiError(`Gagal mengunduh (${r.status})`, r.status)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(await r.blob())
  a.download = nama
  a.click()
}

/** Cek apakah ada server SIWARGA di alamat ini. null = tidak ada (mode lokal). */
export async function probe(): Promise<{ needsSetup: boolean } | null> {
  try {
    const d = await api<{ ok?: boolean; app?: string; needsSetup?: boolean }>('/health', { auth: false, timeout: 5000 })
    return d?.app === 'siwarga-pkk' ? { needsSetup: !!d.needsSetup } : null
  } catch {
    return null
  }
}
