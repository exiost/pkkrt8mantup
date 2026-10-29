import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { imporExcel } from '@/lib/excel'
import { isWUS, isPUS, isPenduduk1559 } from '@/lib/rules'
import type { Warga } from '@/lib/types'

// File Excel asli tidak disimpan di repo (berisi data pribadi). Jalankan dengan XLSM_PATH=/path/file.xlsm
const path = process.env.XLSM_PATH ?? ''
describe.skipIf(!path || !existsSync(path))('impor file Excel asli', () => {
  it('membaca seluruh warga & KK', () => {
    const buf = readFileSync(path)
    const h = imporExcel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
    expect(h.warga.length).toBe(181)
    expect(h.keluarga.length).toBe(61)
    expect(h.kelahiran.length).toBe(2)
    const ws = h.warga as unknown as Warga[]
    const acuan = '2026-09-15'
    console.log({
      wus: ws.filter((w) => isWUS(w, acuan)).length,
      pus: ws.filter((w) => isPUS(w, acuan)).length,
      p1559: ws.filter((w) => isPenduduk1559(w, acuan)).length,
      pekarangan: ws.filter((w) => w.pekarangan.length).length,
      irt: ws.filter((w) => w.irt.length).length,
      peringatan: h.peringatan.length,
      contoh: h.peringatan.slice(0, 5),
    })
    expect(ws.every((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.tglLahir) || w.tglLahir === '')).toBe(true)
  })
})
