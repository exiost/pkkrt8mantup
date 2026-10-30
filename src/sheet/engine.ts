import raw from './templates.json'
import type { Warga } from '@/lib/types'

export interface TplCell { c: number; s: number; v?: string | number; rs?: number; cs?: number; d?: 1 }
export interface TplRow { r: number; h: number; c: TplCell[] }
export interface TplRegion { id: string; start: number; end: number; size: number }
export interface TplPage { orient: 'portrait' | 'landscape'; paper: number; scale: number; ml: number; mr: number; mt: number; mb: number; hc: number }
export interface Tpl { sheet: string; cols: number[]; rows: TplRow[]; regions: TplRegion[]; page: TplPage }
export interface TplStyle {
  f: string; z: number; b?: 1; i?: 1; u?: 1; fc?: string; h?: string; v?: string; w?: 1; in?: number; rot?: number; bg?: string; fmt?: string
  bt?: [number, string, string] | null; br?: [number, string, string] | null; bb?: [number, string, string] | null; bl?: [number, string, string] | null
}

export const STYLES = (raw as unknown as { styles: TplStyle[] }).styles
export const TEMPLATES = (raw as unknown as { sheets: Record<string, Tpl> }).sheets

/** Nilai yang bisa diisikan ke sel. Objek dipakai untuk rata kanan angka/tanggal, klik nama & klik angka. */
export interface CellObj {
  v: string | number
  num?: boolean
  w?: string // id warga → klik untuk ubah data
  drill?: { title: string; list: Warga[] } // klik angka → daftar nama
}
export type Val = string | number | null | undefined | CellObj

export function colLetter(i: number): string {
  let s = ''
  i++
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) }
  return s
}
export function colIndex(L: string): number {
  let n = 0
  for (const ch of L.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** dd/mm/yyyy, rata kanan seperti tanggal di Excel */
export function dt(iso?: string): Val {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return { v: `${d}/${m}/${y}`, num: true }
}
/** teks tanggal dd/mm/yyyy (rata kiri, seperti hasil TEXT() di Excel) */
export function dtText(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
export const n = (v: number, drill?: CellObj['drill']): CellObj => ({ v, num: true, drill: drill && drill.list.length ? drill : undefined })
export const V = (b: boolean) => (b ? 'V' : '')

export const PAPER_MM: Record<number, [number, number, string]> = {
  1: [215.9, 279.4, 'Letter'],
  5: [215.9, 355.6, 'Legal'],
  8: [297, 420, 'A3'],
  9: [210, 297, 'A4'],
  100: [215, 330, 'F4 / Folio'],
}
