import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { imporExcel } from '@/lib/excel'
import { isWUS, isPUS, isPenduduk1559 } from '@/lib/rules'
import { makeCtx } from '@/reports/ctx'
import { bRekapCatatan, bRekapDawis } from '@/reports/rekap'
import { bKampungKB, bPenduduk, bWUS, bPUS } from '@/reports/lists'
import { DEFAULT_SETTINGS } from '@/lib/store'
import type { CellObj, Val } from '@/sheet/engine'
import type { Dasawisma, Warga } from '@/lib/types'

// File Excel asli tidak disimpan di repo (berisi data pribadi). Jalankan dengan XLSM_PATH=/path/file.xlsm
const path = process.env.XLSM_PATH ?? ''
const ada = !!path && existsSync(path)
const num = (v: Val): number => (typeof v === 'object' && v ? Number((v as CellObj).v) : Number(v))

describe.skipIf(!ada)('kecocokan dengan file Excel asli', () => {
  const buf = ada ? readFileSync(path) : Buffer.alloc(0)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  const h = ada ? imporExcel(ab) : (null as never)
  const wb = ada ? XLSX.read(ab, { type: 'array' }) : (null as never)
  const cached = (sheet: string, addr: string) => Number(wb.Sheets[sheet][addr]?.v ?? 0)
  const now = new Date().toISOString()
  const dws: Dasawisma[] = ['Drupadi I', 'Drupadi II'].map((nama, i) => ({ id: 'd' + i, nama, ketua: '', warna: 'teal', createdAt: now, updatedAt: now }))
  const mk = (extra = {}) => makeCtx(
    { warga: h.warga as unknown as Warga[], keluarga: h.keluarga, kelahiran: h.kelahiran, kematian: h.kematian, pesertaKB: [], pusBaru: [], dasawisma: dws, kampungKB: [], settings: DEFAULT_SETTINGS },
    { acuan: '2026-09-15', bulan: 8, tahun: 2026, dawis: '', pick: '', semua: false, semuaPeriode: false, ...extra },
    { barisKosong: false, isiKosong: false },
  )

  it('membaca seluruh warga, keluarga (ID), bayi', () => {
    expect(h.warga.length).toBe(181)
    expect(h.keluarga.length).toBe(57) // 57 kepala keluarga = 57 ID keluarga (kolom DE)
    expect(h.kelahiran.length).toBe(2)
    // satu keluarga boleh punya beberapa No KK
    const kkPerKel = new Map<string, Set<string>>()
    h.warga.forEach((w) => { (kkPerKel.get(w.keluargaId) ?? kkPerKel.set(w.keluargaId, new Set()).get(w.keluargaId)!).add(w.noKK) })
    expect([...kkPerKel.values()].filter((s) => s.size > 1).length).toBe(5)
    expect(h.warga.every((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.tglLahir) || w.tglLahir === '')).toBe(true)
  })

  it('jumlah penduduk 15–59, WUS, PUS sama dengan Excel', () => {
    const ws = h.warga as unknown as Warga[]
    expect(ws.filter((w) => isPenduduk1559(w, '2026-09-15')).length).toBe(111)
    expect(ws.filter((w) => isWUS(w, '2026-09-15')).length).toBe(43)
    expect(ws.filter((w) => isPUS(w, '2026-09-15')).length).toBe(24)
    expect(bPenduduk(mk())[0].regions!.main.length).toBe(111)
    expect(bWUS(mk())[0].regions!.main.length).toBe(43)
    expect(bPUS(mk())[0].regions!.main.length).toBe(24)
  })

  it('Rekap Catatan Data & Kegiatan (RT): baris Drupadi I = nilai tersimpan di Excel', () => {
    const row = bRekapCatatan(mk())[0].regions!.main[0]
    const S = 'rekap catatan data dan kegiatan'
    // C (KRT) di Excel baris 15 dan 16 sama-sama memakai "Drupadi I" (kesalahan rumus), jadi hanya baris 15 dibandingkan
    for (const L of ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC'])
      expect(num(row[L]), `kolom ${L}`).toBe(cached(S, `${L}15`))
  })

  it('Rekap per Dasawisma (Drupadi I): baris JUMLAH = nilai Excel', () => {
    const v = bRekapDawis(mk({ dawis: 'Drupadi I' }))[0].values!
    const S = 'REKAP CAT DATA KEG DAWIS 1'
    for (const L of ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB'])
      expect(num(v[`${L}42`]), `kolom ${L}42`).toBe(cached(S, `${L}42`))
  })

  // C26 (perguruan tinggi) sengaja tidak dibandingkan: rumus Excel menghitung "Diploma IV / Strata I" dua kali (13),
  // aplikasi menghitung 8 sehingga jumlah KK per pendidikan = 50 = jumlah KK. Kelompok umur C30–C37 juga tidak
  // dibandingkan karena rumus Excel melewatkan sebagian warga (mis. umur 6 th).
  it('Inventarisasi Kampung KB: sel yang rumusnya sama persis dengan Excel', () => {
    const v = bKampungKB(mk())[0].values!
    const S = 'INVENTARISASI KAMPUNG KB'
    expect(num(v.C21) + num(v.C22) + num(v.C23) + num(v.C24) + num(v.C25) + num(v.C26)).toBe(num(v.C9) + num(v.C10))
    for (const a of ['C9', 'C10', 'C11', 'C15', 'C16', 'C17', 'H9', 'H10', 'H11', 'H12', 'H13', 'H17', 'H18', 'H19', 'H20', 'H21', 'H22', 'H23', 'H24', 'C21', 'C22', 'C23', 'C24', 'C25', 'C42', 'C44', 'C46'])
      expect(num(v[a]), a).toBe(cached(S, a))
  })
})
