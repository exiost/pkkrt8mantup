import { Armchair, Baby, Crown, Flower2, HeartHandshake, HeartPulse, UserRound as Mars, Milk, ShieldCheck, CircleSlash, PersonStanding as Venus, Accessibility } from 'lucide-react'
import type { Settings, Tag, Warga } from './types'
import { hariMenujuHPL, isBalita, isKepala, isLansia, isPUS, isWUS } from './rules'
import { Chip } from '@/components/ui'

export interface AutoTag {
  label: string
  color: string
  icon: typeof Baby
  pulse?: boolean
}

export function autoTags(w: Warga, acuan: string, s: Settings): AutoTag[] {
  const t: AutoTag[] = []
  t.push(w.jk === 'L' ? { label: 'L', color: 'sky', icon: Mars } : { label: 'P', color: 'pink', icon: Venus })
  if (isKepala(w)) t.push({ label: 'Kepala Keluarga', color: 'indigo', icon: Crown })
  if (isBalita(w, acuan, s)) t.push({ label: 'Balita', color: 'amber', icon: Baby })
  if (isLansia(w, acuan, s)) t.push({ label: 'Lansia', color: 'orange', icon: Armchair })
  if (isWUS(w, acuan)) t.push({ label: 'WUS', color: 'pink', icon: Flower2 })
  if (isPUS(w, acuan)) t.push({ label: 'PUS', color: 'rose', icon: HeartHandshake })
  if (w.hamil) {
    const d = hariMenujuHPL(w.hpl, acuan)
    t.push({ label: d !== null && d >= 0 && d <= 30 ? `Hamil · HPL ${d} hr` : 'Ibu Hamil', color: 'fuchsia', icon: Baby, pulse: d !== null && d <= 30 })
  }
  if (w.menyusui) t.push({ label: 'Menyusui', color: 'violet', icon: Milk })
  if (w.nifas) t.push({ label: 'Nifas', color: 'violet', icon: Milk })
  if (w.riwayatSakit) t.push({ label: w.riwayatSakit, color: 'red', icon: HeartPulse })
  if (w.kontrasepsi) t.push({ label: `KB ${w.kontrasepsi}`, color: 'emerald', icon: ShieldCheck })
  if (w.berkebutuhanKhusus) t.push({ label: 'Berkebutuhan Khusus', color: 'cyan', icon: Accessibility })
  if (!w.ikutPKK) t.push({ label: 'Tidak Ikut PKK', color: 'slate', icon: CircleSlash })
  return t
}

export function TagList({ w, acuan, s, tags, max }: { w: Warga; acuan: string; s: Settings; tags: Tag[]; max?: number }) {
  const at = autoTags(w, acuan, s)
  const custom = tags.filter((t) => w.tags.includes(t.id) && !t.deletedAt)
  const all = [
    ...at.map((a) => <Chip key={a.label} color={a.color} icon={a.icon} pulse={a.pulse}>{a.label}</Chip>),
    ...custom.map((t) => <Chip key={t.id} color={t.warna}>#{t.nama}</Chip>),
  ]
  const shown = max ? all.slice(0, max) : all
  return (
    <div className="flex flex-wrap gap-1">
      {shown}
      {max && all.length > max && <Chip>+{all.length - max}</Chip>}
    </div>
  )
}
