import { useCallback, useEffect, useState } from 'react'
import { PAPER_MM, TEMPLATES } from '@/sheet/engine'

export interface PrintSettings {
  paper: number
  orient: 'portrait' | 'landscape'
  mode: 'excel' | 'lebar' | 'halaman' | 'manual'
  pct: number
  ml: number
  mr: number
  mt: number
  mb: number
  areaOn: boolean
  c1: string
  c2: string
  r1: number
  r2: number
  repeat: boolean
  hc: boolean
  mono: boolean
  guides: boolean
}

const inch = (x: number) => Math.round(x * 25.4 * 10) / 10

export function defaultPrint(tplId: string): PrintSettings {
  const p = TEMPLATES[tplId]?.page
  return {
    paper: p && PAPER_MM[p.paper] ? p.paper : 9,
    orient: p?.orient ?? 'portrait',
    mode: 'lebar',
    pct: p?.scale ?? 100,
    ml: inch(p?.ml ?? 0.7), mr: inch(p?.mr ?? 0.7), mt: inch(p?.mt ?? 0.75), mb: inch(p?.mb ?? 0.75),
    areaOn: false, c1: 'A', c2: 'Z', r1: 1, r2: 100,
    repeat: (p?.orient ?? 'portrait') === 'portrait' && (TEMPLATES[tplId]?.regions.some((r) => r.size >= 40) ?? false), hc: !!p?.hc, mono: false, guides: true,
  }
}

const key = (slug: string) => `siwarga-print2-${slug}`

export function usePrintSettings(slug: string, tplId: string): [PrintSettings, (p: Partial<PrintSettings>) => void, () => void] {
  const [ps, setPs] = useState<PrintSettings>(() => {
    const d = defaultPrint(tplId)
    try { const raw = localStorage.getItem(key(slug)); if (raw) return { ...d, ...JSON.parse(raw) } } catch { /* abaikan */ }
    return d
  })
  useEffect(() => {
    const d = defaultPrint(tplId)
    try { const raw = localStorage.getItem(key(slug)); setPs(raw ? { ...d, ...JSON.parse(raw) } : d) } catch { setPs(d) }
  }, [slug, tplId])
  const set = useCallback((p: Partial<PrintSettings>) => setPs((x) => {
    const n = { ...x, ...p }
    try { localStorage.setItem(key(slug), JSON.stringify(n)) } catch { /* abaikan */ }
    return n
  }), [slug])
  const reset = useCallback(() => {
    const d = defaultPrint(tplId)
    setPs(d)
    try { localStorage.removeItem(key(slug)) } catch { /* abaikan */ }
  }, [slug, tplId])
  return [ps, set, reset]
}

export function pageGeometry(ps: PrintSettings) {
  const [w, h] = PAPER_MM[ps.paper] ?? PAPER_MM[9]
  const pw = ps.orient === 'landscape' ? h : w
  const ph = ps.orient === 'landscape' ? w : h
  const mm = 96 / 25.4
  return { pageW: pw, pageH: ph, printW: (pw - ps.ml - ps.mr) * mm, printH: (ph - ps.mt - ps.mb) * mm }
}

export function effectiveScale(ps: PrintSettings, nat: { w: number; h: number }): number {
  const g = pageGeometry(ps)
  const W = g.printW * 0.995 // sisa tipis agar pembulatan browser tidak memecah halaman
  const H = g.printH * 0.99
  if (ps.mode === 'lebar') return nat.w ? Math.min(1, W / nat.w) : 1
  if (ps.mode === 'halaman') return nat.w && nat.h ? Math.min(1, W / nat.w, H / nat.h) : 1
  const base = Math.max(0.1, ps.pct / 100)
  // Browser tidak bisa memecah kolom ke halaman berikutnya seperti Excel: jika terlalu lebar, kecilkan otomatis
  if (ps.mode === 'excel' && nat.w) {
    let e = Math.min(base, W / nat.w)
    // kelebihan tinggi tipis (<6%) → kecilkan sedikit agar muat satu halaman, seperti di Excel
    if (nat.h && nat.h * e > H && nat.h * e < g.printH * 1.06) e = H / nat.h
    return e
  }
  return base
}

export function excelShrunk(ps: PrintSettings, nat: { w: number }): boolean {
  return ps.mode === 'excel' && nat.w > 0 && (ps.pct / 100) * nat.w > pageGeometry(ps).printW + 0.5
}
