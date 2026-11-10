import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, FolderOpen, House, Loader2, MapPin, Search, Users } from 'lucide-react'
import { useSession } from '@/lib/session'
import { useDataDesa } from '@/reports/desa'
import { bahanCari, cocok } from '@/lib/search'
import { hitungUmur } from '@/lib/rules'
import { todayISO } from '@/lib/format'
import { Button, Card, Chip } from '@/components/ui'
import type { Keluarga, Warga } from '@/lib/types'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')
/** jarak ketik (Levenshtein) dengan batas, untuk menoleransi salah ketik nama */
function jarak(a: string, b: string, maks: number): number {
  if (Math.abs(a.length - b.length) > maks) return maks + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let min = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < min) min = cur[j]
    }
    if (min > maks) return maks + 1
    prev = cur
  }
  return prev[b.length]
}
/** setiap kata yang diketik mirip dengan salah satu kata nama (salah 1 huruf untuk kata ≥4, 2 huruf untuk ≥7) */
function mirip(nama: string, q: string): boolean {
  const kata = norm(nama).split(/\s+/).filter(Boolean)
  return norm(q).split(/\s+/).filter(Boolean).every((t) => {
    const maks = t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0
    return kata.some((k) => k.startsWith(t) || (maks > 0 && jarak(t, k.slice(0, Math.max(t.length, Math.min(k.length, t.length + maks))), maks) <= maks))
  })
}

interface Hasil { w: Warga; rt: string; kel?: Keluarga; anggota: Warga[]; nikGanda: string[] }

/** Admin Padukuhan: cari warga di semua RT sekaligus (nama, NIK, No KK, alamat, pekerjaan, umur, dll.) */
export default function CariDesa() {
  const nav = useNavigate()
  const { rt: rtAktif, pilihRT } = useSession()
  const dd = useDataDesa()
  const [q, setQ] = useState('')
  const [buka, setBuka] = useState<string | null>(null)
  useEffect(() => { void dd.load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const acuan = todayISO()
  const indeks = useMemo(() => {
    if (!dd.list) return null
    const nikRT = new Map<string, Set<string>>()
    const semua: { w: Warga; rt: string; bahan: string }[] = []
    const kelMap = new Map<string, Keluarga>()
    const anggotaMap = new Map<string, Warga[]>()
    for (const d of dd.list) {
      for (const k of d.keluarga) if (!k.deletedAt) kelMap.set(k.id, k)
      for (const w of d.warga) {
        if (w.deletedAt) continue
        semua.push({ w, rt: d.rt, bahan: bahanCari(w, acuan, []) + ' | rt ' + d.rt })
        if (w.keluargaId) (anggotaMap.get(w.keluargaId) ?? anggotaMap.set(w.keluargaId, []).get(w.keluargaId)!).push(w)
        const nik = (w.nik ?? '').replace(/\D/g, '')
        if (nik.length >= 10) (nikRT.get(nik) ?? nikRT.set(nik, new Set()).get(nik)!).add(d.rt)
      }
    }
    return { semua, kelMap, anggotaMap, nikRT }
  }, [dd.list, acuan])

  const { hasil, kira } = useMemo(() => {
    const t = q.trim()
    if (!indeks || t.length < 2) return { hasil: [] as Hasil[], kira: false }
    const angka = t.replace(/\D/g, '')
    let pilih = indeks.semua.filter((x) => (angka.length >= 4 && angka === t.replace(/\s/g, '') ? `${x.w.nik} ${x.w.noKK}`.replace(/\D/g, ' ').includes(angka) : cocok(x.bahan, t)))
    let kira = false
    if (!pilih.length && !angka) { pilih = indeks.semua.filter((x) => mirip(x.w.nama, t)); kira = pilih.length > 0 }
    const urut = norm(t)
    pilih.sort((a, b) => Number(!norm(a.w.nama).startsWith(urut)) - Number(!norm(b.w.nama).startsWith(urut)) || a.rt.localeCompare(b.rt) || a.w.nama.localeCompare(b.w.nama))
    return {
      kira,
      hasil: pilih.slice(0, 50).map(({ w, rt }) => {
        const nik = (w.nik ?? '').replace(/\D/g, '')
        const rts = nik.length >= 10 ? [...(indeks.nikRT.get(nik) ?? [])].filter((x) => x !== rt) : []
        return { w, rt, kel: indeks.kelMap.get(w.keluargaId), anggota: (indeks.anggotaMap.get(w.keluargaId) ?? []).slice().sort((a, b) => (a.urut ?? 0) - (b.urut ?? 0)), nikGanda: rts }
      }),
    }
  }, [q, indeks])
  const total = indeks?.semua.length ?? 0
  const jumlahCocok = q.trim().length >= 2 && indeks ? hasil.length : 0

  async function bukaData(h: Hasil) {
    if (h.rt !== rtAktif && !(await pilihRT(h.rt))) return
    nav(`/warga/${h.w.id}`)
  }

  return (
    <Card className="mb-5 p-4">
      <div className="mb-2 flex items-center gap-2 font-display font-extrabold"><Search size={18} className="text-violet-600" /> Cari warga se-padukuhan (RT 01–17)</div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama, NIK, No KK, alamat, pekerjaan, umur…" aria-label="Cari warga se-padukuhan"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:border-white/10 dark:bg-slate-800" />
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {dd.loading && !indeks ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Memuat data semua RT…</span>
          : dd.error ? <span className="text-red-600">{dd.error}</span>
          : q.trim().length < 2 ? `${total} warga dari ${dd.list?.length ?? 0} RT siap dicari. Contoh: "siti 1990", "rt 05 buruh", atau 16 angka NIK.`
          : `${jumlahCocok}${jumlahCocok === 50 ? '+' : ''} hasil${kira ? ' (perkiraan — mungkin salah ketik)' : ''}`}
      </div>

      {hasil.length > 0 && (
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
          {hasil.map((h) => {
            const u = hitungUmur(h.w.tglLahir, acuan)
            const kepala = h.anggota.find((a) => /kepala/i.test(a.statusKeluarga))
            const terbuka = buka === h.w.id
            return (
              <div key={h.w.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${h.w.jk === 'P' ? 'from-pink-400 to-fuchsia-500' : 'from-sky-400 to-indigo-500'}`}>{h.w.nama.split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()}</div>
                  <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
                    <div className="font-semibold">{h.w.nama}</div>
                    <div className="text-xs text-slate-500">{u !== null ? `${u} th · ` : ''}{h.w.jk === 'P' ? 'Perempuan' : 'Laki-laki'} · {h.w.statusKeluarga}{h.w.dasawisma ? ` · ${h.w.dasawisma}` : ''}{h.w.nik ? ` · NIK ${h.w.nik}` : ''}</div>
                  </div>
                  <span className="sm:hidden w-9" /><Chip color="amber" icon={MapPin}>RT {h.rt}</Chip>
                  {h.w.statusWarga !== 'Aktif' && <Chip color="slate">{h.w.statusWarga}</Chip>}
                  {h.nikGanda.length > 0 && <span title={`NIK yang sama juga tercatat di RT ${h.nikGanda.join(', ')}`} className="max-w-full"><Chip color="red" icon={AlertTriangle} className="whitespace-normal">{h.nikGanda.length > 3 ? `NIK sama di ${h.nikGanda.length} RT lain` : `NIK sama di RT ${h.nikGanda.join(', ')}`}</Chip></span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" icon={FolderOpen} onClick={() => void bukaData(h)}>Buka data</Button>
                  <Button size="sm" variant="outline" icon={ChevronDown} onClick={() => setBuka(terbuka ? null : h.w.id)}>{terbuka ? 'Tutup keluarga' : `Keluarga (${h.anggota.length})`}</Button>
                </div>
                {terbuka && (
                  <div className="mt-2 rounded-xl bg-amber-50/60 p-2 text-sm dark:bg-amber-500/10">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-100">
                      <House size={14} /> Keluarga no. {h.kel?.nomor ?? '-'} · RT {h.rt}{kepala ? ` · Kepala: ${kepala.nama}` : ''}{h.w.noKK ? ` · No KK ${h.w.noKK}` : ''}
                    </div>
                    {h.anggota.length ? (
                      <ul className="space-y-0.5">
                        {h.anggota.map((a) => {
                          const ua = hitungUmur(a.tglLahir, acuan)
                          return <li key={a.id} className={`flex items-center gap-2 ${a.id === h.w.id ? 'font-bold' : ''}`}><Users size={12} className="shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate">{a.nama}</span><span className="shrink-0 text-xs text-slate-500">{a.statusKeluarga}{ua !== null ? ` · ${ua} th` : ''}</span></li>
                        })}
                      </ul>
                    ) : <div className="text-xs italic text-slate-500">Belum masuk keluarga.</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {q.trim().length >= 2 && indeks && hasil.length === 0 && <p className="mt-3 text-sm italic text-slate-400">Tidak ditemukan di RT mana pun.</p>}
    </Card>
  )
}
