import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileDown, FileUp, History, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useStore } from '@/lib/store'
import { useDataDesa } from '@/reports/desa'
import { Button, Modal, Section, Toggle, useConfirm } from '@/components/ui'
import { eksporRT, kodeRT } from '@/lib/eksporRT'

const NAMA: Record<string, string> = { warga: 'Warga', keluarga: 'Keluarga (KK)', kelahiran: 'Kelahiran', kematian: 'Kematian', pesertaKB: 'Peserta KB baru', pusBaru: 'PUS baru', dasawisma: 'Dasawisma', tags: 'Penanda', kampungKB: 'Isian Kampung KB', arsip: 'Arsip laporan' }
interface Ringkas { baru: number; berubah: number; lebihBaruDiServer: number; sama: number; milikRTLain: number; hanyaDiServer: number }
interface Berkas { format: 'siwarga-rt'; versi: number; rt: string; dibuat: string; [k: string]: unknown }


/**
 * Kirim data RT lewat file: RT mengekspor satu file .siwarga (bisa offline), Admin Padukuhan / Admin RT
 * mengimpornya. Sebelum diterapkan tampil pratinjau; server membuat cadangan otomatis dulu.
 */
export default function KirimRT() {
  const s = useSession()
  const confirm = useConfirm()
  const ref = useRef<HTMLInputElement>(null)
  const [cek, setCek] = useState<{ berkas: Berkas; ringkas: Record<string, Ringkas> } | null>(null)
  const [hapus, setHapus] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cad, setCad] = useState<{ id: string; waktu: string; ket: string; warga: number }[]>([])
  const bisaImpor = s.server && s.user?.role === 'admin'

  const loadCad = useCallback(async () => {
    if (!bisaImpor) return
    try { setCad((await api<{ list: typeof cad }>(`/rt-cadangan?rt=${s.rt}`)).list) } catch { /* abaikan */ }
  }, [bisaImpor, s.rt]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadCad() }, [loadCad])

  async function baca(f: File) {
    setBusy(true)
    try {
      const berkas = JSON.parse(await f.text()) as Berkas
      const r = await api<{ ringkas: Record<string, Ringkas> }>('/rt-impor', { method: 'POST', body: { berkas, cek: true } })
      setHapus(false)
      setCek({ berkas, ringkas: r.ringkas })
    } catch (e) { toast.error(e instanceof SyntaxError ? 'File tidak bisa dibaca (bukan file .siwarga)' : (e as Error).message) } finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }
  async function terapkan() {
    if (!cek) return
    setBusy(true)
    try {
      await api('/rt-impor', { method: 'POST', body: { berkas: cek.berkas, hapus } })
      toast.success(`Data RT ${cek.berkas.rt} diperbarui dari file. Cadangan sebelumnya tersimpan otomatis.`)
      if (cek.berkas.rt === s.rt) await s.muatUlang()
      void useDataDesa.getState().load(true)
      setCek(null)
      void loadCad()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  async function kembalikan(id: string, waktu: string) {
    if (!(await confirm({ title: 'Kembalikan cadangan?', message: `Data RT ${s.rt} dikembalikan seperti pada ${new Date(waktu).toLocaleString('id-ID')}. Keadaan sekarang juga dicadangkan dulu.`, danger: true, okText: 'Kembalikan' }))) return
    try { await api('/rt-cadangan/pulihkan', { method: 'POST', body: { rt: s.rt, id } }); await s.muatUlang(); void loadCad(); toast.success('Cadangan dikembalikan') } catch (e) { toast.error((e as Error).message) }
  }

  const total = (k: keyof Ringkas) => (cek ? Object.values(cek.ringkas).reduce((a, r) => a + r[k], 0) : 0)
  return (
    <Section title="Kirim data RT lewat file (.siwarga)" icon={Send} color="amber">
      <p className="mb-3 text-sm text-slate-500">Untuk RT yang bekerja offline: <b>ekspor</b> satu file berisi semua data RT ini, kirim lewat WhatsApp / flashdisk, lalu Admin Padukuhan <b>mengimpornya</b>. Sebelum diterapkan tampil ringkasan perubahan, dan server menyimpan cadangan otomatis sehingga bisa dibatalkan.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" icon={FileDown} onClick={eksporRT}>Ekspor data RT {kodeRT(s.rt, useStore.getState().settings.rt)}</Button>
        {bisaImpor && <>
          <input ref={ref} type="file" accept=".siwarga,.json" hidden onChange={(e) => e.target.files?.[0] && void baca(e.target.files[0])} />
          <Button icon={FileUp} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Membaca…' : 'Impor file data RT'}</Button>
        </>}
      </div>
      {bisaImpor && cad.length > 0 && (
        <details className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold"><History size={16} /> Cadangan otomatis RT {s.rt} ({cad.length})</summary>
          <div className="mt-2 divide-y divide-slate-200 dark:divide-white/10">
            {cad.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <div className="min-w-0 flex-1"><div className="font-semibold">{new Date(c.waktu).toLocaleString('id-ID')}</div><div className="text-xs text-slate-500">{c.ket} · {c.warga} warga</div></div>
                <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => void kembalikan(c.id, c.waktu)}>Kembalikan</Button>
              </div>
            ))}
          </div>
        </details>
      )}

      <Modal open={!!cek} onClose={() => setCek(null)} title={`Pratinjau impor — RT ${cek?.berkas.rt ?? ''}`} icon={FileUp} color="amber" size="lg"
        footer={<><Button variant="ghost" onClick={() => setCek(null)}>Batal</Button><Button icon={ShieldCheck} disabled={busy} onClick={() => void terapkan()}>Terapkan ke RT {cek?.berkas.rt}</Button></>}>
        {cek && (
          <div className="space-y-3 text-sm">
            <p>File dibuat <b>{new Date(cek.berkas.dibuat).toLocaleString('id-ID')}</b>. Hanya data <b>RT {cek.berkas.rt}</b> yang diperbarui; RT lain tidak tersentuh.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"><tr><th className="p-2">Data</th><th className="p-2 text-right">Baru</th><th className="p-2 text-right">Berubah</th><th className="p-2 text-right">Sama</th><th className="p-2 text-right" title="Di server lebih baru, tidak ditimpa">Server lebih baru</th><th className="p-2 text-right">Hanya di server</th></tr></thead>
                <tbody>
                  {Object.entries(cek.ringkas).filter(([, r]) => r.baru + r.berubah + r.sama + r.lebihBaruDiServer + r.hanyaDiServer > 0).map(([c, r]) => (
                    <tr key={c} className="border-t border-slate-100 dark:border-white/5">
                      <td className="p-2 font-semibold">{NAMA[c] ?? c}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">{r.baru || '–'}</td>
                      <td className="p-2 text-right font-bold text-sky-600">{r.berubah || '–'}</td>
                      <td className="p-2 text-right text-slate-400">{r.sama || '–'}</td>
                      <td className="p-2 text-right text-amber-600">{r.lebihBaruDiServer || '–'}</td>
                      <td className="p-2 text-right text-rose-600">{r.hanyaDiServer || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
              <li><b>Baru</b> & <b>Berubah</b> akan disimpan ({total('baru') + total('berubah')} data).</li>
              <li><b>Server lebih baru</b>: data di server diubah setelah file dibuat — <b>tidak ditimpa</b> (perubahan terakhir yang dipakai).</li>
              {total('milikRTLain') > 0 && <li className="text-red-600">{total('milikRTLain')} data di file ternyata milik RT lain dan dilewati.</li>}
            </ul>
            {total('hanyaDiServer') > 0 && <Toggle checked={hapus} onChange={setHapus} label={`Hapus juga ${total('hanyaDiServer')} data yang ada di server tetapi tidak ada di file`} />}
          </div>
        )}
      </Modal>
    </Section>
  )
}
