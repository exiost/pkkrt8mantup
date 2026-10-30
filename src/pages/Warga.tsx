import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Users, Plus, LayoutGrid, Rows3, Pencil, Trash2, Filter, CheckSquare, X, Copy, Download, SlidersHorizontal, ArrowDownAZ, UserRound, IdCard, Cake, Crown, MapPin, Tags, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import { useEditor } from '@/components/EditorHost'
import { Avatar, Button, Card, Empty, IconBtn, Modal, PageHeader, SearchBox, Segmented, Select, Field, useConfirm, Chip } from '@/components/ui'
import { TagList } from '@/lib/tags'
import { hitungUmur, isBalita, isLansia, isPUS, isWUS } from '@/lib/rules'
import { bahanCari, cocok } from '@/lib/search'
import { maskNIK, todayISO, tglPendek } from '@/lib/format'
import { hapusDenganUndo } from '@/lib/crud'
import { eksporWarga } from '@/lib/excel'
import type { Warga } from '@/lib/types'

const SORTS = [
  ['nama', 'Nama A–Z'], ['nama-desc', 'Nama Z–A'], ['umur-desc', 'Umur tertua dulu'], ['umur-asc', 'Umur termuda dulu'],
  ['noreg', 'No Registrasi'], ['urut', 'Urutan seperti Excel'], ['dasawisma', 'Dasawisma lalu nama'], ['baru', 'Terbaru ditambahkan'],
] as const
type SortKey = (typeof SORTS)[number][0]
// filter lanjutan: [kunci, label]
const ADV: [keyof Warga, string][] = [['pendidikan', 'Pendidikan'], ['pekerjaan', 'Pekerjaan'], ['agama', 'Agama'], ['statusKawin', 'Status kawin'], ['statusKeluarga', 'Status keluarga'], ['golDarah', 'Gol. darah'], ['riwayatSakit', 'Riwayat sakit'], ['kontrasepsi', 'Kontrasepsi'], ['dusun', 'Dusun'], ['desa', 'Desa'], ['kabupaten', 'Kabupaten']]

const KATEGORI = ['Semua', 'Kepala Keluarga', 'Balita', 'WUS', 'PUS', 'Lansia', 'Ibu Hamil', 'Tidak Ikut PKK', 'Nonaktif/Pindah/Meninggal'] as const

export default function WargaPage() {
  const all = useLive('warga')
  const keluarga = useLive('keluarga')
  const dasawisma = useLive('dasawisma')
  const tags = useLive('tags')
  const settings = useStore((s) => s.settings)
  const st = useStore()
  const nav = useNavigate()
  const confirm = useConfirm()
  const { openWarga } = useEditor()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [view, setView] = useState<'tabel' | 'kartu'>(() => (window.innerWidth < 768 ? 'kartu' : 'tabel'))
  const [dw, setDw] = useState(params.get('dasawisma') ?? '')
  const [kat, setKat] = useState<(typeof KATEGORI)[number]>((params.get('kategori') as (typeof KATEGORI)[number]) ?? 'Semua')
  const [jk, setJk] = useState('')
  const [tag, setTag] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState(false)
  const [limit, setLimit] = useState(60)
  const [sort, setSort] = useState<SortKey>('nama')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState<Record<string, string>>({})
  const [uMin, setUMin] = useState('')
  const [uMax, setUMax] = useState('')
  const acuan = todayISO()
  const bahan = useMemo(() => new Map(all.map((w) => [w.id, bahanCari(w, acuan, tags)])), [all, acuan, tags])
  const opsi = useMemo(() => Object.fromEntries(ADV.map(([k]) => [k, [...new Set(all.map((w) => String(w[k] ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'))])), [all])
  const nAdv = Object.values(adv).filter(Boolean).length + (uMin ? 1 : 0) + (uMax ? 1 : 0)

  const list = useMemo(() => {
    const umur = (w: Warga) => hitungUmur(w.tglLahir, acuan)
    const cmp: Record<SortKey, (a: Warga, b: Warga) => number> = {
      nama: (a, b) => a.nama.localeCompare(b.nama, 'id'),
      'nama-desc': (a, b) => b.nama.localeCompare(a.nama, 'id'),
      'umur-desc': (a, b) => (umur(b) ?? -1) - (umur(a) ?? -1) || a.nama.localeCompare(b.nama, 'id'),
      'umur-asc': (a, b) => (umur(a) ?? 999) - (umur(b) ?? 999) || a.nama.localeCompare(b.nama, 'id'),
      noreg: (a, b) => a.noReg - b.noReg,
      urut: (a, b) => a.urut - b.urut,
      dasawisma: (a, b) => a.dasawisma.localeCompare(b.dasawisma, 'id') || a.nama.localeCompare(b.nama, 'id'),
      baru: (a, b) => b.createdAt.localeCompare(a.createdAt),
    }
    const mn = uMin === '' ? null : Number(uMin), mx = uMax === '' ? null : Number(uMax)
    return all
      .filter((w) => (kat === 'Nonaktif/Pindah/Meninggal' ? w.statusWarga !== 'Aktif' : kat === 'Semua' ? true : w.statusWarga === 'Aktif'))
      .filter((w) => !q.trim() || cocok(bahan.get(w.id) ?? '', q))
      .filter((w) => !dw || w.dasawisma === dw)
      .filter((w) => !jk || w.jk === jk)
      .filter((w) => !tag || w.tags.includes(tag))
      .filter((w) => ADV.every(([k]) => !adv[k] || String(w[k] ?? '').trim() === adv[k]))
      .filter((w) => { if (mn === null && mx === null) return true; const u = umur(w); return u !== null && (mn === null || u >= mn) && (mx === null || u <= mx) })
      .filter((w) => {
        switch (kat) {
          case 'Kepala Keluarga': return /kepala/i.test(w.statusKeluarga)
          case 'Balita': return isBalita(w, acuan, settings)
          case 'WUS': return isWUS(w, acuan)
          case 'PUS': return isPUS(w, acuan)
          case 'Lansia': return isLansia(w, acuan, settings)
          case 'Ibu Hamil': return w.hamil
          case 'Tidak Ikut PKK': return !w.ikutPKK
          default: return true
        }
      })
      .sort(cmp[sort])
  }, [all, q, bahan, dw, jk, tag, kat, acuan, settings, sort, adv, uMin, uMax])

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSel = list.length > 0 && list.every((w) => sel.has(w.id))

  async function del(w: Warga) {
    if (await confirm({ title: 'Hapus warga?', message: <>Data <b>{w.nama}</b> akan dipindah ke Tempat Sampah dan bisa dipulihkan.</>, okText: 'Hapus', danger: true }))
      hapusDenganUndo('warga', w.id, w.nama)
  }
  async function delBulk() {
    if (!(await confirm({ title: `Hapus ${sel.size} warga?`, message: 'Semua data terpilih dipindah ke Tempat Sampah.', okText: 'Hapus semua', danger: true }))) return
    sel.forEach((id) => st.remove('warga', id, 'massal'))
    toast.success(`${sel.size} warga dipindah ke Tempat Sampah`, { action: { label: 'Urungkan', onClick: () => sel.forEach((id) => useStore.getState().restore('warga', id)) } })
    setSel(new Set())
  }
  function duplikat(w: Warga) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = w
    openWarga(undefined, { ...rest, nama: '', nik: '', tglLahir: '', statusKeluarga: 'Anak' })
  }

  return (
    <div>
      <PageHeader title="Data Warga" subtitle={`${all.filter((w) => w.statusWarga === 'Aktif').length} warga aktif · ${keluarga.length} KK`} icon={Users} color="indigo"
        actions={<>
          <Button variant="outline" icon={Download} onClick={() => eksporWarga(list, keluarga)}>Ekspor</Button>
          <Button icon={Plus} onClick={() => openWarga()}>Tambah</Button>
        </>} />

      <Card className="no-print mb-4 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder="Cari apa saja: nama, tempat lahir, alamat, pekerjaan, umur, tanggal…" /></div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Select options={dasawisma.map((d) => d.nama)} value={dw} onChange={setDw} placeholder="Semua Dawis" />
            <Select options={['L', 'P']} value={jk} onChange={setJk} placeholder="L/P" />
            <select value={tag} onChange={(e) => setTag(e.target.value)} className="col-span-2 h-10 rounded-xl md:col-span-1 border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800">
              <option value="">Semua tag</option>
              {tags.map((t) => <option key={t.id} value={t.id}>#{t.nama}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-1 text-xs font-semibold text-slate-500"><ArrowDownAZ size={16} className="shrink-0" />
            <select aria-label="Urutkan" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200">
              {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <Button variant={advOpen || nAdv ? 'soft' : 'outline'} icon={SlidersHorizontal} onClick={() => setAdvOpen(!advOpen)}>Filter{nAdv ? ` (${nAdv})` : ''}</Button>
          <Segmented value={view} onChange={setView} options={[{ value: 'tabel', label: 'Tabel', icon: Rows3 }, { value: 'kartu', label: 'Kartu', icon: LayoutGrid }]} />
        </div>
        {advOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-white/5 md:grid-cols-4">
            {ADV.map(([k, l]) => (
              <label key={k} className="text-[11px] font-semibold text-slate-500">{l}
                <select value={adv[k] ?? ''} onChange={(e) => setAdv({ ...adv, [k]: e.target.value })} className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200">
                  <option value="">Semua</option>{opsi[k]?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
            <label className="text-[11px] font-semibold text-slate-500">Umur dari<input inputMode="numeric" value={uMin} onChange={(e) => setUMin(e.target.value.replace(/\D/g, ''))} className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal dark:border-white/10 dark:bg-slate-800" /></label>
            <label className="text-[11px] font-semibold text-slate-500">sampai (tahun)<input inputMode="numeric" value={uMax} onChange={(e) => setUMax(e.target.value.replace(/\D/g, ''))} className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal dark:border-white/10 dark:bg-slate-800" /></label>
            <div className="col-span-2 flex items-end"><Button size="sm" variant="ghost" onClick={() => { setAdv({}); setUMin(''); setUMax('') }}>Atur ulang filter</Button></div>
          </div>
        )}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <Filter size={16} className="mt-1.5 shrink-0 text-slate-400" />
          {KATEGORI.map((k) => (
            <button key={k} onClick={() => setKat(k)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${kat === k ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'}`}>{k}</button>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {sel.size > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="no-print fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-slate-900 p-2 pl-4 text-white shadow-2xl lg:bottom-8">
            <CheckSquare size={18} className="text-fuchsia-400" />
            <span className="flex-1 text-sm font-semibold">{sel.size} dipilih</span>
            <Button size="sm" variant="soft" icon={Pencil} onClick={() => setBulk(true)}>Ubah massal</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={delBulk}>Hapus</Button>
            <IconBtn icon={X} label="Batal pilih" className="text-white hover:bg-white/10" onClick={() => setSel(new Set())} />
          </motion.div>
        )}
      </AnimatePresence>

      {list.length === 0 ? (
        <Card><Empty title={all.length ? 'Tidak ada warga yang cocok' : 'Belum ada data warga'} desc={all.length ? 'Coba ubah kata kunci atau filter.' : 'Tambahkan warga satu per satu atau impor dari file Excel lama.'}
          action={<div className="flex gap-2"><Button icon={Plus} onClick={() => openWarga()}>Tambah warga</Button>{!all.length && <Button variant="outline" onClick={() => nav('/data')}>Impor Excel</Button>}</div>} /></Card>
      ) : view === 'tabel' ? (
        <Card className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="dt">
              <thead>
                <tr>
                  <th className="w-8"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(list.map((w) => w.id)))} /></th>
                  <th><span className="inline-flex items-center gap-1"><UserRound size={12} />Nama</span></th><th><span className="inline-flex items-center gap-1"><IdCard size={12} />NIK</span></th><th><span className="inline-flex items-center gap-1"><Cake size={12} />Umur</span></th><th><span className="inline-flex items-center gap-1"><Crown size={12} />Status Keluarga</span></th><th><span className="inline-flex items-center gap-1"><MapPin size={12} />Dasawisma</span></th><th><span className="inline-flex items-center gap-1"><Tags size={12} />Tag</span></th><th><span className="inline-flex items-center gap-1"><ToggleRight size={12} />Hitung</span></th><th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, limit).map((w) => (
                  <tr key={w.id} className={sel.has(w.id) ? 'bg-violet-50 dark:bg-violet-500/10' : ''}>
                    <td><input type="checkbox" checked={sel.has(w.id)} onChange={() => toggle(w.id)} /></td>
                    <td>
                      <button onClick={() => nav(`/warga/${w.id}`)} className="flex items-center gap-3 text-left">
                        <Avatar nama={w.nama} jk={w.jk} />
                        <div><div className="font-semibold text-slate-800 hover:text-violet-600 dark:text-white">{w.nama}</div><div className="text-xs text-slate-400">{w.tempatLahir}{w.tglLahir && `, ${tglPendek(w.tglLahir)}`}</div></div>
                      </button>
                    </td>
                    <td className="tabular text-xs text-slate-500">{maskNIK(w.nik)}</td>
                    <td className="tabular">{hitungUmur(w.tglLahir, acuan) ?? '-'}</td>
                    <td>{w.statusKeluarga}</td>
                    <td><Chip color={dasawisma.find((d) => d.nama === w.dasawisma)?.warna ?? 'slate'}>{w.dasawisma || '—'}</Chip></td>
                    <td className="max-w-[260px]"><TagList w={w} acuan={acuan} s={settings} tags={tags} max={3} /></td>
                    <td><QuickSwitch w={w} compact /></td>
                    <td>
                      <div className="flex justify-end gap-0.5">
                        <IconBtn icon={Pencil} label="Ubah" onClick={() => openWarga(w.id)} />
                        <IconBtn icon={Copy} label="Duplikat sebagai anggota KK" onClick={() => duplikat(w)} />
                        <IconBtn icon={Trash2} label="Hapus" className="hover:!bg-red-50 hover:!text-red-600" onClick={() => del(w)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Footer shown={Math.min(limit, list.length)} total={list.length} more={() => setLimit(limit + 100)} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, limit).map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} whileHover={{ y: -3 }}>
                <Card tone={w.jk === 'P' ? 'pink' : 'sky'} className={`group p-4 ${sel.has(w.id) ? '!ring-2 !ring-violet-500' : ''}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => nav(`/warga/${w.id}`)}><Avatar nama={w.nama} jk={w.jk} /></button>
                    <button onClick={() => nav(`/warga/${w.id}`)} className="min-w-0 flex-1 text-left">
                      <div className="truncate font-semibold text-slate-900 dark:text-white">{w.nama}</div>
                      <div className="text-xs text-slate-500">{hitungUmur(w.tglLahir, acuan) ?? '-'} th · {w.statusKeluarga} · {w.dasawisma}</div>
                    </button>
                    <input type="checkbox" checked={sel.has(w.id)} onChange={() => toggle(w.id)} className="mt-1" />
                  </div>
                  <div className="mt-3"><TagList w={w} acuan={acuan} s={settings} tags={tags} max={5} /></div>
                  <div className="mt-2"><QuickSwitch w={w} /></div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-white/10">
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openWarga(w.id)}>Ubah</Button>
                    <Button size="sm" variant="ghost" icon={Trash2} className="text-red-500" onClick={() => del(w)}>Hapus</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <Footer shown={Math.min(limit, list.length)} total={list.length} more={() => setLimit(limit + 60)} />
        </>
      )}
      <BulkEdit open={bulk} ids={[...sel]} onClose={() => { setBulk(false); setSel(new Set()) }} />
    </div>
  )
}

/** Saklar cepat: Ikut PKK (kalau mati tidak dihitung di laporan) dan Aktif (kalau mati tidak dihitung sama sekali) */
function QuickSwitch({ w, compact }: { w: Warga; compact?: boolean }) {
  const st = useStore()
  const aktifNow = w.statusWarga === 'Aktif'
  const Sw = ({ on, label, onClick, color }: { on: boolean; label: string; onClick: () => void; color: string }) => (
    <button type="button" onClick={onClick} title={`${label}: ${on ? 'ya' : 'tidak'} (klik untuk mengubah)`} aria-pressed={on}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition ${on ? color : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      {!compact && label}
    </button>
  )
  return (
    <div className="flex items-center gap-3">
      <Sw on={w.ikutPKK} label="Ikut PKK" color="bg-violet-500" onClick={() => st.update('warga', w.id, { ikutPKK: !w.ikutPKK }, w.nama)} />
      <Sw on={aktifNow} label="Aktif" color="bg-emerald-500" onClick={() => st.update('warga', w.id, { statusWarga: aktifNow ? 'Nonaktif' : 'Aktif' }, w.nama)} />
    </div>
  )
}

function Footer({ shown, total, more }: { shown: number; total: number; more: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
      <span>Menampilkan {shown} dari {total}</span>
      {shown < total && <Button size="sm" variant="soft" onClick={more}>Tampilkan lebih banyak</Button>}
    </div>
  )
}

function BulkEdit({ open, ids, onClose }: { open: boolean; ids: string[]; onClose: () => void }) {
  const st = useStore()
  const dasawisma = useLive('dasawisma')
  const tags = useLive('tags')
  const [field, setField] = useState('dasawisma')
  const [val, setVal] = useState('')
  const FIELDS: Record<string, { label: string; options: string[] }> = {
    dasawisma: { label: 'Dasawisma', options: dasawisma.map((d) => d.nama) },
    ikutPKK: { label: 'Ikut PKK', options: ['Ya', 'Tidak'] },
    statusWarga: { label: 'Status Warga', options: ['Aktif', 'Nonaktif', 'Pindah', 'Meninggal'] },
    dusun: { label: 'Dusun', options: ['Mantup'] },
    addTag: { label: 'Tambah tag', options: tags.map((t) => t.nama) },
    removeTag: { label: 'Lepas tag', options: tags.map((t) => t.nama) },
    ...Object.fromEntries(['kerjaBakti', 'jimpitan', 'arisan', 'barkas', 'apotekHidup', 'ppp', 'keagamaan', 'jumantik'].map((k) => [k, { label: k, options: ['Ya', 'Tidak'] }])),
  }
  function apply() {
    if (!val) return toast.error('Pilih nilai terlebih dahulu')
    if (field === 'addTag' || field === 'removeTag') {
      const t = tags.find((x) => x.nama === val)!
      ids.forEach((id) => {
        const w = st.warga.find((x) => x.id === id)!
        const nt = field === 'addTag' ? [...new Set([...w.tags, t.id])] : w.tags.filter((x) => x !== t.id)
        st.update('warga', id, { tags: nt }, w.nama)
      })
    } else {
      const v = field === 'ikutPKK' ? val === 'Ya' : val
      st.bulkUpdate('warga', ids, { [field]: v } as Partial<Warga>)
    }
    toast.success(`${ids.length} warga diperbarui`)
    setVal('')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={`Ubah massal ${ids.length} warga`} icon={Pencil} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={apply}>Terapkan</Button></>}>
      <div className="space-y-3">
        <Field label="Field yang diubah"><Select options={Object.keys(FIELDS)} value={field} onChange={(v) => { setField(v || 'dasawisma'); setVal('') }} /></Field>
        <Field label={`Nilai baru untuk ${FIELDS[field]?.label}`}><Select options={FIELDS[field]?.options ?? []} value={val} onChange={setVal} allowCustom={field === 'dusun'} /></Field>
      </div>
    </Modal>
  )
}
