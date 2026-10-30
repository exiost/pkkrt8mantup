import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  IdCard, MapPin, Users, HeartPulse, Baby, GraduationCap, Sprout, Factory, Tags, Save, Plus, Trash2, ChevronLeft, ChevronRight, UserPlus, Wand2,
} from 'lucide-react'
import { useStore, useLive } from '@/lib/store'
import { blankWarga } from '@/lib/factories'
import { infoDariNIK, hitungUmur, isKepala, kepalaKeluarga } from '@/lib/rules'
import { todayISO } from '@/lib/format'
import { rayakan } from '@/lib/crud'
import type { Warga } from '@/lib/types'
import { Button, Field, Input, Modal, Select, Textarea, Toggle, YesNo, Chip, col } from './ui'

type Draft = Omit<Warga, 'id' | 'createdAt' | 'updatedAt'>

const STEPS = [
  { key: 'identitas', label: 'Identitas', icon: IdCard, color: 'indigo' },
  { key: 'wilayah', label: 'Keluarga & Wilayah', icon: MapPin, color: 'teal' },
  { key: 'kegiatan', label: 'Kegiatan PKK', icon: Users, color: 'violet' },
  { key: 'kesehatan', label: 'Kesehatan & KB', icon: HeartPulse, color: 'red' },
  { key: 'ibu', label: 'Ibu & Anak', icon: Baby, color: 'fuchsia' },
  { key: 'pendidikan', label: 'Pendidikan & Ekonomi', icon: GraduationCap, color: 'amber' },
  { key: 'pekarangan', label: 'Pekarangan', icon: Sprout, color: 'lime' },
  { key: 'irt', label: 'Industri RT', icon: Factory, color: 'orange' },
  { key: 'tag', label: 'Tag & Catatan', icon: Tags, color: 'pink' },
] as const

export default function WargaForm({ id, preset, onClose }: { id?: string; preset?: Partial<Warga>; onClose: () => void }) {
  const st = useStore()
  const existing = id ? st.warga.find((w) => w.id === id) : undefined
  const [d, setD] = useState<Draft>(() => ({ ...blankWarga(), dasawisma: st.dasawisma.find((x) => !x.deletedAt)?.nama ?? '', ...(existing ?? {}), ...(preset ?? {}) }) as Draft)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const P = st.settings.pilihan
  const dasawisma = useLive('dasawisma')
  const tags = useLive('tags')
  const semuaWarga = useLive('warga')
  const keluarga = useLive('keluarga')
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const umur = hitungUmur(d.tglLahir, todayISO())
  const kkList = useMemo(() => [...new Set(semuaWarga.map((w) => w.noKK).filter(Boolean))], [semuaWarga])
  const famOptions = useMemo(
    () => keluarga.slice().sort((a, b) => a.nomor - b.nomor).map((k) => ({ id: k.id, label: `${k.nomor}. ${kepalaKeluarga(k.id, semuaWarga)?.nama ?? '(belum ada kepala)'}` })),
    [keluarga, semuaWarga],
  )

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!d.nama.trim()) e.nama = 'Nama wajib diisi'
    if (d.nik && !/^\d{16}$/.test(d.nik)) e.nik = 'NIK harus 16 digit angka'
    if (d.nik && semuaWarga.some((w) => w.nik === d.nik && w.id !== id)) e.nik = 'NIK sudah dipakai warga lain'
    if (d.noKK && !/^\d{16}$/.test(d.noKK)) e.noKK = 'No KK harus 16 digit angka'
    if (d.tglLahir && d.tglLahir > todayISO()) e.tglLahir = 'Tanggal lahir tidak boleh melewati hari ini'
    setErrors(e)
    if (Object.keys(e).length) {
      setStep(e.noKK ? 1 : 0)
      toast.error('Periksa kembali isian yang ditandai merah')
      return false
    }
    return true
  }

  function save(again = false) {
    if (!validate()) return
    if (existing) {
      const { keluargaId, ...rest } = d
      st.update('warga', existing.id, rest, d.nama)
      if (keluargaId !== existing.keluargaId) st.pindahWarga(existing.id, keluargaId)
      toast.success(`Data ${d.nama} diperbarui ✨`)
    } else {
      const { urut: _u, noReg, ...baru } = d
      st.tambahWarga({ ...baru, noReg: noReg || undefined, deletedAt: null } as never)
      toast.success(`${d.nama} ditambahkan 🎉`)
      rayakan()
    }
    if (again) {
      setD({ ...blankWarga(), keluargaId: d.keluargaId, noKK: d.noKK, dasawisma: d.dasawisma, alamat: d.alamat, dusun: d.dusun, desa: d.desa, kecamatan: d.kecamatan, kabupaten: d.kabupaten, provinsi: d.provinsi } as Draft)
      setStep(0)
    } else onClose()
  }

  const nikInfo = infoDariNIK(d.nik)
  const S = STEPS[step]
  const Y = (label: string, k: keyof Draft) => <YesNo key={k as string} label={label} value={d[k] as never} onChange={(v) => set(k, v as never)} />

  return (
    <Modal open onClose={onClose} size="xl" title={existing ? `Ubah Data: ${existing.nama}` : 'Tambah Warga Baru'} icon={existing ? IdCard : UserPlus}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          {!existing && <Button variant="outline" icon={Plus} onClick={() => save(true)}>Simpan & tambah lagi</Button>}
          <Button icon={Save} onClick={() => save()}>Simpan</Button>
        </>
      }>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:w-52 md:shrink-0 md:flex-col md:overflow-visible">
          {STEPS.map((s, i) => {
            const c = col(s.color)
            const active = i === step
            return (
              <button key={s.key} onClick={() => setStep(i)} className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                {active && <motion.span layoutId="step-bg" className={`absolute inset-0 rounded-xl ${c.soft} ring-1 ${c.ring}`} />}
                <span className={`relative grid h-7 w-7 place-items-center rounded-lg ${active ? `bg-gradient-to-br text-white ${c.grad}` : 'bg-slate-100 dark:bg-white/10'}`}><s.icon size={14} /></span>
                <span className="relative whitespace-nowrap">{s.label}</span>
              </button>
            )
          })}
          <div className="hidden px-3 pt-3 md:block">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <motion.div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Langkah {step + 1} dari {STEPS.length}</div>
          </div>
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="min-w-0 flex-1">
          <h3 className={`mb-3 flex items-center gap-2 font-display font-bold ${col(S.color).text}`}><S.icon size={18} /> {S.label}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {S.key === 'identitas' && (
              <>
                <Field label="Nama Lengkap *" error={errors.nama} className="sm:col-span-2"><Input value={d.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Nama sesuai KTP" autoFocus /></Field>
                <Field label="NIK" error={errors.nik} hint={nikInfo ? `Dari NIK: lahir ${nikInfo.tglLahir}, ${nikInfo.jk === 'L' ? 'laki-laki' : 'perempuan'}` : '16 digit'}>
                  <div className="flex gap-2">
                    <Input inputMode="numeric" maxLength={16} value={d.nik} onChange={(e) => set('nik', e.target.value.replace(/\D/g, ''))} />
                    {nikInfo && (!d.tglLahir || d.jk !== nikInfo.jk) && (
                      <Button size="sm" variant="soft" icon={Wand2} className="h-10" onClick={() => setD((x) => ({ ...x, tglLahir: x.tglLahir || nikInfo.tglLahir, jk: nikInfo.jk }))}>Isi</Button>
                    )}
                  </div>
                </Field>
                <Field label="Jenis Kelamin">
                  <div className="flex gap-2">
                    {(['L', 'P'] as const).map((j) => (
                      <button key={j} type="button" onClick={() => set('jk', j)} className={`h-10 flex-1 rounded-xl border text-sm font-semibold transition ${d.jk === j ? (j === 'L' ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-pink-400 bg-pink-50 text-pink-700') : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>
                        {j === 'L' ? '♂ Laki-laki' : '♀ Perempuan'}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Tempat Lahir"><Input value={d.tempatLahir} onChange={(e) => set('tempatLahir', e.target.value)} /></Field>
                <Field label="Tanggal Lahir" error={errors.tglLahir} hint={umur !== null ? `Umur ${umur} tahun` : undefined}><Input type="date" value={d.tglLahir} onChange={(e) => set('tglLahir', e.target.value)} /></Field>
                <Field label="Agama"><Select options={P.agama} value={d.agama} onChange={(v) => set('agama', v)} /></Field>
                <Field label="Golongan Darah"><Select options={P.golDarah} value={d.golDarah} onChange={(v) => set('golDarah', v)} /></Field>
                <Field label="Pendidikan"><Select options={P.pendidikan} value={d.pendidikan} onChange={(v) => set('pendidikan', v)} /></Field>
                <Field label="Pekerjaan"><Select options={P.pekerjaan} value={d.pekerjaan} onChange={(v) => set('pekerjaan', v)} allowCustom /></Field>
                <Field label="Status Perkawinan"><Select options={P.statusKawin} value={d.statusKawin} onChange={(v) => set('statusKawin', v)} /></Field>
                <Field label="Tanggal Nikah / Cerai"><Input type="date" value={d.tglNikahCerai} onChange={(e) => set('tglNikahCerai', e.target.value)} /></Field>
                <Field label="Status Warga"><Select options={['Aktif', 'Nonaktif', 'Pindah', 'Meninggal']} value={d.statusWarga} onChange={(v) => set('statusWarga', (v || 'Aktif') as Warga['statusWarga'])} /></Field>
                <Field label="No Registrasi" hint="Kolom NO di DATA WARGA. Kosongkan untuk otomatis."><Input inputMode="numeric" value={d.noReg || ''} onChange={(e) => set('noReg', Number(e.target.value.replace(/\D/g, '')) || 0)} /></Field>
              </>
            )}
            {S.key === 'wilayah' && (
              <>
                <Field label="Keluarga (ID keluarga)" hint="Orang dalam keluarga yang sama dicetak bersama di Data Keluarga & Catatan Keluarga" className="sm:col-span-2">
                  <select value={d.keluargaId} onChange={(e) => set('keluargaId', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-800">
                    <option value="">➕ Buat keluarga baru</option>
                    {famOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="Status dalam Keluarga"><Select options={P.statusKeluarga} value={d.statusKeluarga} onChange={(v) => set('statusKeluarga', v)} /></Field>
                <Field label="No Kartu Keluarga" error={errors.noKK} hint="Boleh beda dengan anggota lain dalam satu keluarga">
                  <Input list="kk-list" inputMode="numeric" maxLength={16} value={d.noKK} onChange={(e) => set('noKK', e.target.value.replace(/\D/g, ''))} />
                  <datalist id="kk-list">{kkList.map((k) => <option key={k} value={k} />)}</datalist>
                </Field>
                <Field label="Dasawisma"><Select options={dasawisma.map((x) => x.nama)} value={d.dasawisma} onChange={(v) => set('dasawisma', v)} /></Field>
                <Field label="Dusun / Padukuhan"><Input value={d.dusun} onChange={(e) => set('dusun', e.target.value)} /></Field>
                <Field label="Alamat" className="sm:col-span-2"><Input value={d.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
                <Field label="Desa / Kelurahan"><Input value={d.desa} onChange={(e) => set('desa', e.target.value)} /></Field>
                <Field label="Kecamatan"><Input value={d.kecamatan} onChange={(e) => set('kecamatan', e.target.value)} /></Field>
                <Field label="Kabupaten / Kota"><Input value={d.kabupaten} onChange={(e) => set('kabupaten', e.target.value)} /></Field>
                <Field label="Provinsi"><Input value={d.provinsi} onChange={(e) => set('provinsi', e.target.value)} /></Field>
                <p className="text-xs text-slate-500 sm:col-span-2">💡 Data rumah & sanitasi (sumber air, SPAL, jamban, kriteria rumah) diisi sekali per keluarga di menu <b>Keluarga</b>.</p>
              </>
            )}
            {S.key === 'kegiatan' && (
              <>
                <div className="sm:col-span-2"><Toggle checked={d.ikutPKK} onChange={(b) => set('ikutPKK', b)} label="Ikut kegiatan PKK (jika tidak, tidak dihitung di laporan PKK)" /></div>
                <Field label="Jabatan"><Select options={P.jabatan} value={d.jabatan} onChange={(v) => set('jabatan', v)} allowCustom /></Field>
                <Field label="Kegiatan yang diikuti" hint="mis. Syawalan, Tirakatan HUT RI, Merti Dusun"><Input value={d.kegiatanDiikuti} onChange={(e) => set('kegiatanDiikuti', e.target.value)} /></Field>
                {Y('Penghayatan & Pengamalan Pancasila', 'ppp')}
                {Y('Jumantik (usaha kesehatan lingkungan)', 'jumantik')}
                {Y('Kerja Bakti', 'kerjaBakti')}
                <Field label="Jenis kerja bakti"><Select options={P.kerjaBaktiJenis} value={d.kerjaBaktiJenis} onChange={(v) => set('kerjaBaktiJenis', v)} allowCustom /></Field>
                {Y('Rukun Kematian', 'rukunKematian')}
                <Field label="Jenis rukun kematian"><Input value={d.rukunKematianJenis} onChange={(e) => set('rukunKematianJenis', e.target.value)} /></Field>
                {Y('Kegiatan Keagamaan', 'keagamaan')}
                <Field label="Jenis keagamaan"><Select options={P.keagamaanJenis} value={d.keagamaanJenis} onChange={(v) => set('keagamaanJenis', v)} allowCustom /></Field>
                {Y('Jimpitan', 'jimpitan')}
                {Y('Arisan', 'arisan')}
                {Y('Pengumpulan Barang Bekas', 'barkas')}
                {Y('Apotek Hidup', 'apotekHidup')}
              </>
            )}
            {S.key === 'kesehatan' && (
              <>
                <Field label="Kontrasepsi / Akseptor KB"><Select options={P.kontrasepsi} value={d.kontrasepsi} onChange={(v) => set('kontrasepsi', v)} placeholder="Tidak ber-KB" /></Field>
                <Field label="Riwayat Sakit"><Select options={P.riwayatSakit} value={d.riwayatSakit} onChange={(v) => set('riwayatSakit', v)} placeholder="Tidak ada" allowCustom /></Field>
                {Y('Aktif dalam Posyandu', 'posyandu')}
                <Field label="Frekuensi posyandu (kali/bulan)"><Input inputMode="numeric" value={d.frekPosyandu} onChange={(e) => set('frekPosyandu', e.target.value)} /></Field>
                {Y('Bina Keluarga Balita (BKB)', 'bkb')}
                {Y('Perencanaan Sehat', 'perencanaanSehat')}
                <Toggle checked={d.tigaButa} onChange={(b) => set('tigaButa', b)} label="3 Buta (aksara, angka, bahasa)" />
                <Field label="Berkebutuhan khusus" hint="Kosongkan jika tidak ada"><Input value={d.berkebutuhanKhusus} onChange={(e) => set('berkebutuhanKhusus', e.target.value)} /></Field>
              </>
            )}
            {S.key === 'ibu' && (
              <>
                {d.jk === 'L' && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 sm:col-span-2">Bagian ini untuk warga perempuan.</p>}
                <Toggle checked={d.hamil} onChange={(b) => set('hamil', b)} label="Sedang hamil" />
                <div />
                {d.hamil && (
                  <>
                    <Field label="Hamil ke-"><Input inputMode="numeric" value={d.hamilKe} onChange={(e) => set('hamilKe', e.target.value)} /></Field>
                    <Field label="HPL (Hari Perkiraan Lahir)"><Input type="date" value={d.hpl} onChange={(e) => set('hpl', e.target.value)} /></Field>
                  </>
                )}
                <Toggle checked={d.melahirkan} onChange={(b) => set('melahirkan', b)} label="Melahirkan" />
                <Toggle checked={d.nifas} onChange={(b) => set('nifas', b)} label="Nifas" />
                <Toggle checked={d.menyusui} onChange={(b) => set('menyusui', b)} label="Menyusui" />
                <p className="text-xs text-slate-500 sm:col-span-2">💡 Data bayi lahir & kematian dicatat di menu <b>Ibu & Anak, KB</b>.</p>
              </>
            )}
            {S.key === 'pendidikan' && (
              <>
                {Y('Memiliki Tabungan', 'tabungan')}
                {Y('Mengikuti PAUD / sejenis', 'paud')}
                {Y('Mengikuti Kelompok Belajar', 'kelompokBelajar')}
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Jenis kelompok belajar</div>
                  <div className="flex flex-wrap gap-2">
                    {P.kelompokBelajar.map((x) => {
                      const on = d.paket.includes(x)
                      return <button key={x} type="button" onClick={() => set('paket', on ? d.paket.filter((y) => y !== x) : [...d.paket, x])} className={`rounded-full px-3 py-1 text-xs font-semibold ${on ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>{x}</button>
                    })}
                  </div>
                </div>
                {Y('Ikut Kegiatan Koperasi', 'koperasi')}
                <Field label="Jenis / nama koperasi"><Input value={d.jenisKoperasi} onChange={(e) => set('jenisKoperasi', e.target.value)} /></Field>
                {Y('Pendidikan & Ketrampilan', 'pendidikanKetrampilan')}
                {Y('Sandang', 'sandang')}
                {Y('Aktivitas UP2K', 'up2k')}
                <Field label="Jenis usaha UP2K"><Input value={d.jenisUp2k} onChange={(e) => set('jenisUp2k', e.target.value)} /></Field>
              </>
            )}
            {S.key === 'pekarangan' && (
              <ItemEditor rows={d.pekarangan} onChange={(r) => set('pekarangan', r)}
                cols={[{ key: 'kategori', label: 'Kategori', options: P.kategoriPekarangan }, { key: 'komoditi', label: 'Komoditi', placeholder: 'mis. Cabe' }, { key: 'jumlah', label: 'Jumlah', placeholder: 'mis. 2 pot' }]}
                empty={{ kategori: 'Warung Hidup', komoditi: '', jumlah: '' }} />
            )}
            {S.key === 'irt' && (
              <ItemEditor rows={d.irt} onChange={(r) => set('irt', r)}
                cols={[{ key: 'kategori', label: 'Kategori', options: P.kategoriIRT }, { key: 'komoditi', label: 'Komoditi', placeholder: 'mis. Pembuatan Kue' }, { key: 'volume', label: 'Volume', placeholder: 'mis. 20 pcs per hari' }]}
                empty={{ kategori: 'Pangan / Catering', komoditi: '', volume: '' }} />
            )}
            {S.key === 'tag' && (
              <>
                <div className="sm:col-span-2">
                  <div className="mb-1 text-xs font-semibold text-slate-600">Tag kustom (klik untuk pasang/lepas)</div>
                  <div className="flex flex-wrap gap-2">
                    {tags.length === 0 && <span className="text-xs text-slate-400">Belum ada tag. Buat di Pengaturan → Tag.</span>}
                    {tags.map((t) => {
                      const on = d.tags.includes(t.id)
                      return (
                        <button key={t.id} type="button" onClick={() => set('tags', on ? d.tags.filter((x) => x !== t.id) : [...d.tags, t.id])} className={`transition ${on ? 'scale-105' : 'opacity-50 grayscale'}`}>
                          <Chip color={t.warna}>#{t.nama}</Chip>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Field label="Catatan" className="sm:col-span-2"><Textarea value={d.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
              </>
            )}
          </div>
          <div className="mt-5 flex justify-between">
            <Button variant="ghost" icon={ChevronLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>Sebelumnya</Button>
            {step < STEPS.length - 1 && <Button variant="soft" onClick={() => setStep(step + 1)}>Berikutnya <ChevronRight size={16} /></Button>}
          </div>
        </motion.div>
      </div>
    </Modal>
  )
}

export function ItemEditor<T extends Record<string, string>>({ rows, onChange, cols, empty }: { rows: T[]; onChange: (r: T[]) => void; cols: { key: keyof T & string; label: string; options?: string[]; placeholder?: string }[]; empty: T }) {
  return (
    <div className="space-y-2 sm:col-span-2">
      {rows.length === 0 && <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">Belum ada item</div>}
      {rows.map((r, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/5 sm:grid-cols-[1fr_1fr_1fr_auto]">
          {cols.map((c) =>
            c.options ? (
              <Select key={c.key} options={c.options} value={r[c.key]} allowCustom onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.key]: v } : x)))} />
            ) : (
              <Input key={c.key} placeholder={c.placeholder ?? c.label} value={r[c.key]} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))} />
            ),
          )}
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="grid h-10 w-full place-items-center rounded-xl text-red-500 hover:bg-red-50 sm:w-10" aria-label="Hapus item"><Trash2 size={16} /></button>
        </motion.div>
      ))}
      <Button variant="soft" icon={Plus} onClick={() => onChange([...rows, { ...empty }])}>Tambah item</Button>
    </div>
  )
}

export { isKepala }
