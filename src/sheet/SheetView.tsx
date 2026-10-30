import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react'
import { STYLES, TEMPLATES, colLetter, type CellObj, type TplCell, type TplStyle, type Val } from './engine'
import type { Warga } from '@/lib/types'

export interface SheetActions {
  drill: (title: string, list: Warga[]) => void
  editWarga: (id: string) => void
}
export const SheetCtx = createContext<SheetActions>({ drill: () => {}, editWarga: () => {} })

export interface PrintArea { c1: number; c2: number; r1: number; r2: number }

export interface SheetViewProps {
  tplId: string
  values?: Record<string, Val>
  /** data baris berulang per region: [{A: .., B: ..}, ...] */
  regions?: Record<string, Record<string, Val>[]>
  /** jumlah baris yang ditampilkan per region (bawaan: terbanyak antara data dan ukuran region di Excel) */
  rowsShown?: Record<string, number>
  overrides?: Record<string, string>
  editText?: boolean
  onEditText?: (key: string, current: string) => void
  area?: PrintArea | null
  repeatHeader?: boolean
}

const LINE_W: Record<number, string> = { 1: '1px', 2: '2px', 3: '3px' }
const bs = (b?: [number, string, string] | null) => (b ? `${LINE_W[b[0]] ?? '1px'} ${b[1]} #${b[2]}` : undefined)

const cssCache = new Map<string, CSSProperties>()
function cellCss(si: number, kind: 'num' | 'str' | 'empty', wrap: boolean, overflow: boolean): CSSProperties {
  const key = `${si}|${kind}|${wrap ? 1 : 0}|${overflow ? 1 : 0}`
  const hit = cssCache.get(key)
  if (hit) return hit
  const st: TplStyle = STYLES[si]
  const h = st.h ?? 'general'
  const align: CSSProperties['textAlign'] =
    h === 'general' ? (kind === 'num' ? 'right' : 'left') : h === 'center' || h === 'centerContinuous' ? 'center' : h === 'right' ? 'right' : 'left'
  const fam = st.f === 'Calibri' ? "Calibri, Carlito, 'Liberation Sans', Arial, sans-serif" : `'${st.f}', 'Liberation Sans', Arimo, Arial, Helvetica, sans-serif`
  const css: CSSProperties = {
    fontFamily: fam,
    fontSize: `${st.z}pt`,
    fontWeight: st.b ? 700 : 400,
    fontStyle: st.i ? 'italic' : 'normal',
    textDecoration: st.u ? 'underline' : 'none',
    color: st.fc ? `#${st.fc}` : '#000',
    background: st.bg ? `#${st.bg}` : undefined,
    textAlign: align,
    verticalAlign: st.v === 'center' ? 'middle' : st.v === 'top' ? 'top' : 'bottom',
    paddingLeft: 2 + (st.in ?? 0) * 9,
    paddingRight: 2,
    paddingTop: 0,
    paddingBottom: 0,
    borderTop: bs(st.bt),
    borderRight: bs(st.br),
    borderBottom: bs(st.bb),
    borderLeft: bs(st.bl),
    whiteSpace: wrap ? 'pre-wrap' : 'nowrap',
    overflow: overflow ? 'visible' : 'hidden',
    lineHeight: wrap ? 1.275 : 1.15,
    wordBreak: wrap ? 'normal' : undefined,
    overflowWrap: wrap ? 'break-word' : undefined,
  }
  cssCache.set(key, css)
  return css
}

const asObj = (v: Val): CellObj | null => (v === null || v === undefined || v === '' ? null : typeof v === 'object' ? v : { v })

interface RRow { key: string; origR: number; h: number; cells: TplCell[]; region?: string; ri?: number; idx: number }

export default function SheetView({ tplId, values, regions, rowsShown, overrides, editText, onEditText, area, repeatHeader }: SheetViewProps) {
  const tpl = TEMPLATES[tplId]
  const act = useContext(SheetCtx)
  const ncols = tpl.cols.length
  const totalW = useMemo(() => tpl.cols.reduce((a, b) => a + b, 0), [tpl])

  const { rrows, hmap, firstRegionIdx } = useMemo(() => {
    const out: RRow[] = []
    const hm = new Map<number, number>()
    tpl.rows.forEach((r) => hm.set(r.r, r.h))
    let firstRegion = -1
    for (const row of tpl.rows) {
      const reg = tpl.regions.find((g) => g.start === row.r)
      if (reg) {
        const data = regions?.[reg.id] ?? []
        const count = rowsShown?.[reg.id] ?? Math.max(data.length, reg.size)
        if (firstRegion < 0) firstRegion = out.length
        for (let i = 0; i < count; i++) out.push({ key: `${reg.id}-${i}`, origR: reg.start + i, h: row.h, cells: row.c, region: reg.id, ri: i, idx: out.length + 1 })
        if (reg.size > 1) for (let i = 1; i < reg.size; i++) hm.set(reg.start + i, row.h)
      } else out.push({ key: `r${row.r}`, origR: row.r, h: row.h, cells: row.c, idx: out.length + 1 })
    }
    return { rrows: out, hmap: hm, firstRegionIdx: firstRegion }
  }, [tpl, regions, rowsShown])

  const cover: number[] = new Array(ncols + 1).fill(0)
  const trs = rrows.map((rr) => {
    const coveredNow = cover.slice()
    const rowHidden = area && (rr.idx < area.r1 || rr.idx > area.r2)
    // nilai tiap sel
    const cells = rr.cells.map((c) => {
      const L = colLetter(c.c)
      let val: Val
      if (rr.region) val = regions?.[rr.region]?.[rr.ri!]?.[L]
      else {
        const addr = `${L}${rr.origR}`
        val = values && addr in values ? values[addr] : undefined
        if (val === undefined && !c.d && c.v !== undefined) {
          const ov = overrides?.[`${tplId}!${addr}`]
          val = ov !== undefined ? ov : c.v
        }
      }
      return { c, L, obj: asObj(val), addr: `${tplId}!${L}${rr.origR}` }
    })
    // sel yang terisi (untuk meluapkan teks ke kanan seperti Excel)
    const occ: boolean[] = new Array(ncols + 1).fill(false)
    for (const x of cells) if (x.obj) for (let k = x.c.c; k < x.c.c + (x.c.cs ?? 1); k++) occ[k] = true
    const tds: ReactNode[] = []
    let cursor = 0
    for (const x of cells) {
      const { c, obj } = x
      const st = STYLES[c.s]
      // celah antar sel tanpa gaya (tidak ada td) → isi kolom kosong agar posisi benar
      while (cursor < c.c) { if (!coveredNow[cursor]) tds.push(<td key={`g${cursor}`} />); cursor++ }
      cursor = c.c + (c.cs ?? 1)
      const kind: 'num' | 'str' | 'empty' = !obj ? 'empty' : typeof obj.v === 'number' || obj.num ? 'num' : 'str'
      const wrap = !!st.w
      const isMerged = (c.rs ?? 1) > 1 || (c.cs ?? 1) > 1
      const left = (st.h ?? 'general') === 'left' || ((st.h ?? 'general') === 'general' && kind !== 'num')
      const canOverflow = !!obj && !wrap && !isMerged && left && c.c + 1 < ncols && !occ[c.c + 1] && !st.rot
      const css = cellCss(c.s, kind, wrap, canOverflow)
      const bordered = !!(st.bt || st.br || st.bb || st.bl)
      const cls = [
        editText && !c.d && typeof c.v === 'string' && c.v.trim() !== '' && !rr.region ? 'xl-static' : '',
        st.b && bordered ? 'xl-b' : '',
        st.b && !bordered && st.z >= 12 ? 'xl-title' : '',
        obj && String(obj.v) === 'V' ? 'xl-v' : '',
        obj && Number(obj.v) === 0 && typeof obj.v === 'number' ? 'xl-z' : '',
      ].filter(Boolean).join(' ')
      const editable = editText && !c.d && typeof c.v === 'string' && c.v.trim() !== '' && !rr.region
      let inner: ReactNode = obj ? String(obj.v) : null
      if (obj?.w) inner = <span className="edit-link" title="Klik untuk ubah data" onClick={() => act.editWarga(obj.w!)}>{inner}</span>
      else if (obj?.drill) inner = <span className="drill" title="Klik untuk lihat daftar nama" onClick={() => act.drill(obj.drill!.title, obj.drill!.list)}>{inner}</span>
      if (obj && (wrap || st.rot)) {
        let hh = 0
        for (let k = 0; k < (c.rs ?? 1); k++) hh += hmap.get(rr.origR + k) ?? rr.h
        const rot: CSSProperties = st.rot === 90 ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' } : st.rot === 255 ? { writingMode: 'vertical-rl', textOrientation: 'upright' } : {}
        inner = <div style={{ maxHeight: Math.max(hh - 1, 8), overflow: 'hidden', ...rot }}>{inner}</div>
      }
      const hiddenCol = area && c.c >= area.c1 && c.c + (c.cs ?? 1) - 1 <= area.c2 ? false : area && (c.c + (c.cs ?? 1) - 1 < area.c1 || c.c > area.c2)
      tds.push(
        <td
          key={c.c}
          rowSpan={c.rs}
          colSpan={c.cs}
          style={{ ...css, display: hiddenCol ? 'none' : undefined }}
          className={cls || undefined}
          onClick={editable ? () => onEditText?.(x.addr, String(c.v)) : undefined}
        >
          {inner}
        </td>,
      )
    }
    for (let k = 0; k < cover.length; k++) if (cover[k] > 0) cover[k]--
    for (const x of cells) if ((x.c.rs ?? 1) > 1) for (let k = x.c.c; k < x.c.c + (x.c.cs ?? 1); k++) cover[k] = (x.c.rs ?? 1) - 1
    return (
      <tr key={rr.key} data-r={rr.origR} className={rr.region ? 'xl-r' : undefined} style={{ height: rr.h, display: rowHidden ? 'none' : undefined }}>
        {tds}
      </tr>
    )
  })

  const headCount = repeatHeader && firstRegionIdx > 0 ? firstRegionIdx : 0
  return (
    <table className="xl" style={{ width: totalW, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
      <colgroup>
        {tpl.cols.map((w, i) => (
          <col key={i} style={{ width: w, visibility: area && (i < area.c1 || i > area.c2) ? 'collapse' : undefined }} />
        ))}
      </colgroup>
      {headCount > 0 ? (
        <>
          <thead>{trs.slice(0, headCount)}</thead>
          <tbody>{trs.slice(headCount)}</tbody>
        </>
      ) : (
        <tbody>{trs}</tbody>
      )}
    </table>
  )
}

export function sheetNaturalSize(tplId: string, rowsCount?: number): { w: number; h: number } {
  const t = TEMPLATES[tplId]
  return { w: t.cols.reduce((a, b) => a + b, 0), h: t.rows.reduce((a, r) => a + r.h, 0) + (rowsCount ?? 0) }
}
