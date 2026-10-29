import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useLive } from '@/lib/store'
import type { CollectionName, Collections } from '@/lib/types'
import { hapusDenganUndo, rayakan } from '@/lib/crud'
import { tglPendek } from '@/lib/format'
import { Button, Card, Empty, Field, IconBtn, Input, Modal, SearchBox, Select, Toggle, useConfirm, Chip } from './ui'

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'date' | 'select' | 'bool' | 'jk' | 'number' | 'color'
  options?: string[]
  required?: boolean
  full?: boolean
  table?: boolean
  render?: (v: unknown, row: Record<string, unknown>) => ReactNode
  suggestions?: string[]
}

type Row = Record<string, unknown> & { id: string }

export default function SimpleCrud<K extends CollectionName>({
  koleksi, fields, title, icon, color = 'violet', labelOf, defaults = {}, celebrate, filter, afterSave,
}: {
  koleksi: K
  fields: FieldDef[]
  title: string
  icon: typeof Plus
  color?: string
  labelOf: (r: Row) => string
  defaults?: Record<string, unknown>
  celebrate?: boolean
  filter?: (r: Row) => boolean
  afterSave?: (r: Row, isNew: boolean, prev?: Row) => void
}) {
  const st = useStore()
  const rows = useLive(koleksi) as unknown as Row[]
  const confirm = useConfirm()
  const [edit, setEdit] = useState<Row | 'new' | null>(null)
  const [q, setQ] = useState('')
  const list = useMemo(
    () => rows.filter((r) => (!filter || filter(r)) && (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))),
    [rows, q, filter],
  )
  const cols = fields.filter((f) => f.table !== false)

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><SearchBox value={q} onChange={setQ} placeholder={`Cari ${title.toLowerCase()}…`} /></div>
        <Button icon={Plus} onClick={() => setEdit('new')}>Tambah {title}</Button>
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <Empty title={`Belum ada data ${title.toLowerCase()}`} icon={icon} action={<Button icon={Plus} onClick={() => setEdit('new')}>Tambah</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="dt">
              <thead><tr><th>No</th>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th className="text-right">Aksi</th></tr></thead>
              <tbody>
                {list.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.02 }}>
                    <td className="tabular text-slate-400">{i + 1}</td>
                    {cols.map((c) => (
                      <td key={c.key}>
                        {c.render ? c.render(r[c.key], r) : c.type === 'bool' ? (r[c.key] ? <Chip color="emerald">Ya</Chip> : <Chip>Tidak</Chip>) : c.type === 'date' ? tglPendek(String(r[c.key] ?? '')) : c.type === 'jk' ? (r[c.key] === 'P' ? <Chip color="pink">P</Chip> : <Chip color="sky">L</Chip>) : c.type === 'color' ? <Chip color={String(r[c.key])}>{String(r[c.key])}</Chip> : String(r[c.key] ?? '')}
                      </td>
                    ))}
                    <td>
                      <div className="flex justify-end">
                        <IconBtn icon={Pencil} label="Ubah" onClick={() => setEdit(r)} />
                        <IconBtn icon={Trash2} label="Hapus" onClick={async () => {
                          if (await confirm({ title: `Hapus ${title.toLowerCase()}?`, message: <><b>{labelOf(r)}</b> dipindah ke Tempat Sampah.</>, danger: true, okText: 'Hapus' }))
                            hapusDenganUndo(koleksi, r.id, labelOf(r))
                        }} />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && (
        <CrudForm
          title={edit === 'new' ? `Tambah ${title}` : `Ubah ${title}`}
          icon={icon}
          color={color}
          fields={fields}
          initial={edit === 'new' ? { ...Object.fromEntries(fields.map((f) => [f.key, f.type === 'bool' ? false : f.type === 'jk' ? 'L' : ''])), ...defaults } : edit}
          onClose={() => setEdit(null)}
          onSave={(data) => {
            if (edit === 'new') {
              const r = st.create(koleksi, data as unknown as Omit<Collections[K][number], 'id' | 'createdAt' | 'updatedAt'>, labelOf(data as Row)) as unknown as Row
              toast.success(`${title} ditambahkan`)
              if (celebrate) rayakan()
              afterSave?.(r, true)
            } else {
              st.update(koleksi, edit.id, data as Partial<Collections[K][number]>, labelOf(data as Row))
              toast.success(`${title} diperbarui`)
              afterSave?.({ ...edit, ...data } as Row, false, edit)
            }
            setEdit(null)
          }}
        />
      )}
    </div>
  )
}

export function CrudForm({ title, icon, color, fields, initial, onClose, onSave }: { title: string; icon: typeof Plus; color?: string; fields: FieldDef[]; initial: Record<string, unknown>; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [d, setD] = useState<Record<string, unknown>>(initial)
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }))
  function submit() {
    const e: Record<string, string> = {}
    fields.forEach((f) => { if (f.required && !d[f.key]) e[f.key] = `${f.label} wajib diisi` })
    setErr(e)
    if (Object.keys(e).length) return
    const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = d
    onSave(rest)
  }
  return (
    <Modal open onClose={onClose} title={title} icon={icon} color={color} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button icon={Save} onClick={submit}>Simpan</Button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const v = d[f.key]
          const cls = f.full ? 'sm:col-span-2' : ''
          if (f.type === 'bool') return <div key={f.key} className={`flex items-end pb-2 ${cls}`}><Toggle checked={!!v} onChange={(b) => set(f.key, b)} label={f.label} /></div>
          return (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')} error={err[f.key]} className={cls}>
              {f.type === 'select' || f.type === 'color' ? (
                <Select options={f.options ?? []} value={String(v ?? '')} onChange={(x) => set(f.key, x)} allowCustom={f.type === 'select'} />
              ) : f.type === 'jk' ? (
                <Select options={['L', 'P']} value={String(v ?? 'L')} onChange={(x) => set(f.key, x || 'L')} />
              ) : (
                <>
                  <Input type={f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined} list={f.suggestions ? `sg-${f.key}` : undefined} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
                  {f.suggestions && <datalist id={`sg-${f.key}`}>{f.suggestions.map((s) => <option key={s} value={s} />)}</datalist>}
                </>
              )}
            </Field>
          )
        })}
      </div>
    </Modal>
  )
}
