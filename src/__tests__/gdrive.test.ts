import { describe, it, expect } from 'vitest'
import { skripGoogleDrive } from '@/lib/gdrive'

/** jalankan skrip Apps Script dengan tiruan UrlFetchApp / DriveApp / ScriptApp */
function jalankan(skrip: string, files: { name: string; created: number; trashed?: boolean }[], kode = 200) {
  const diambil: string[] = []
  const triggers: string[] = []
  const folder = {
    getFilesByName: (n: string) => { const xs = files.filter((f) => f.name === n && !f.trashed); let i = 0; return { hasNext: () => i < xs.length, next: () => { const f = xs[i++]; return { setTrashed: () => { f.trashed = true } } } } },
    createFile: (blob: { name: string }) => { files.push({ name: blob.name, created: Date.now() }) },
    getFiles: () => { const xs = files.filter((f) => !f.trashed); let i = 0; return { hasNext: () => i < xs.length, next: () => { const f = xs[i++]; return { getName: () => f.name, getDateCreated: () => new Date(f.created), setTrashed: () => { f.trashed = true } } } } },
  }
  const g = {
    UrlFetchApp: { fetch: (u: string) => { diambil.push(u); return { getResponseCode: () => kode, getContentText: () => 'galat', getBlob: () => ({ name: '', setName(n: string) { this.name = n; return this } }) } } },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => folder }), createFolder: () => folder },
    Utilities: { formatDate: () => '2026-11-09' },
    ScriptApp: {
      getProjectTriggers: () => triggers.map((h) => ({ getHandlerFunction: () => h })),
      deleteTrigger: (t: { getHandlerFunction: () => string }) => { triggers.splice(triggers.indexOf(t.getHandlerFunction()), 1) },
      newTrigger: (h: string) => { const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, inTimezone: () => b, create: () => { triggers.push(h) } }; return b },
    },
  }
  const fn = new Function(...Object.keys(g), `${skrip}\nreturn { pasangJadwalHarian, cadangkanSiwarga }`)
  return { api: fn(...Object.values(g)) as { pasangJadwalHarian: () => void; cadangkanSiwarga: () => void }, diambil, triggers, files }
}

describe('skrip cadangan Google Drive', () => {
  const skrip = skripGoogleDrive('https://mantup.biz.id/data-warga/api/cadangan-terbaru?kunci=abc')
  it('memasang satu jadwal harian, menyimpan file hari ini, membuang file > 60 hari', () => {
    const lama = Date.now() - 61 * 864e5
    const r = jalankan(skrip, [{ name: 'siwarga-2026-09-01.db', created: lama }, { name: 'siwarga-2026-11-08.db', created: Date.now() - 864e5 }, { name: 'catatan.txt', created: lama }])
    r.api.pasangJadwalHarian()
    r.api.pasangJadwalHarian() // dijalankan dua kali: jadwal tidak dobel
    expect(r.triggers).toEqual(['cadangkanSiwarga'])
    expect(r.diambil[0]).toBe('https://mantup.biz.id/data-warga/api/cadangan-terbaru?kunci=abc')
    const aktif = r.files.filter((f) => !f.trashed).map((f) => f.name).sort()
    expect(aktif).toEqual(['catatan.txt', 'siwarga-2026-11-08.db', 'siwarga-2026-11-09.db'])
  })
  it('gagal mengambil → berhenti dengan pesan jelas, tidak menyimpan apa pun', () => {
    const r = jalankan(skrip, [], 401)
    expect(() => r.api.cadangkanSiwarga()).toThrow(/Gagal mengambil cadangan \(401\)/)
    expect(r.files.length).toBe(0)
  })
})
