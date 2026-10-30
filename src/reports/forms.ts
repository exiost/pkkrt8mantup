import { TEMPLATES, dt, dtText, n, V, type Val } from '@/sheet/engine'
import { anggotaKeluarga, hitungUmur, isBalita, isKepala, isLansia, isPUS, isWUS, jumlahKK, kepalaKeluarga } from '@/lib/rules'
import { type Builder, type Ctx, type PageSpec, has, link, tidak, yes } from './common'
import type { Keluarga, Warga } from '@/lib/types'

const AGAMA = ['Islam', 'Kristen', 'Katholik', 'Hindu']

/* ===================== DATA WARGA TP PKK (per orang) ===================== */
export function tppkkOf(w: Warga, c: Ctx): PageSpec {
  const k = kepalaKeluarga(w.keluargaId, c.warga)
  const pend = w.pendidikan
  const pk = w.pekerjaan
  const lain = !!pk && !/petani|dagang|swasta|wira|pns|tni|polri/i.test(pk)
  const v: Record<string, Val> = {
    E3: w.dasawisma, E4: k?.nama ?? '', E5: w.noReg, E6: w.nik, E7: link(w), E8: w.jabatan,
    E9: V(w.jk === 'L'), G9: V(w.jk === 'P'), E10: w.tempatLahir, E11: dt(w.tglLahir), J11: hitungUmur(w.tglLahir, c.p.acuan) ?? '',
    E13: V(w.statusKawin === 'Kawin Tercatat'), G13: V(w.statusKawin === 'Belum Kawin'),
    I13: V(w.jk === 'P' && has(w.statusKawin, 'cerai')), K13: V(w.jk === 'L' && has(w.statusKawin, 'cerai')),
    E15: V(isKepala(w)), I15: V(!isKepala(w)),
    E17: V(w.agama === 'Islam'), G17: V(w.agama === 'Kristen'), I17: V(w.agama === 'Katholik'), K17: V(w.agama === 'Hindu'),
    E19: V(w.agama === 'Budha'), G19: V(w.agama === 'Khonghucu'), I19: V(!!w.agama && ![...AGAMA, 'Budha', 'Khonghucu'].includes(w.agama)),
    E20: w.alamat, E21: w.desa, E22: w.kecamatan, E23: w.kabupaten, E24: w.provinsi,
    E25: V(pend === 'Belum Tamat SD / Sederajat' || pend === 'Tidak / Belum Sekolah'), I25: V(pend === 'SD / Sederajat' || pend === 'Tamat SD / Sederajat'), K25: V(pend === 'SLTP / Sederajat'),
    E27: V(pend === 'SLTA / Sederajat'), I27: V(pend === 'Diploma I / II' || pend === 'Diploma III / Sarjana Muda'), K27: V(pend === 'Diploma IV / Strata I' || pend === 'Strata I'),
    M27: V(pend === 'Strata II'), O27: V(pend === 'Strata III'),
    E29: V(has(pk, 'petani')), G29: V(has(pk, 'dagang')), I29: V(has(pk, 'swasta') && !has(pk, 'wira')), K29: V(has(pk, 'wira')),
    E31: V(has(pk, 'pns')), G31: V(has(pk, 'tni') || has(pk, 'polri')), I31: V(lain), K31: lain ? pk : '',
    E33: V(!!w.kontrasepsi), G33: V(!w.kontrasepsi), M33: w.kontrasepsi,
    E35: V(yes(w.posyandu)), G35: V(tidak(w.posyandu)), M35: w.frekPosyandu,
    E37: V(yes(w.bkb)), G37: V(tidak(w.bkb)),
    E39: V(yes(w.tabungan)), G39: V(tidak(w.tabungan)),
    E41: V(yes(w.kelompokBelajar)), G41: V(tidak(w.kelompokBelajar)),
    E43: V(w.paket.includes('Paket A')), G43: V(w.paket.includes('Paket B')), I43: V(w.paket.includes('Paket C')), K43: V(w.paket.includes('KF')),
    E45: V(yes(w.paud)), G45: V(tidak(w.paud)),
    E47: V(yes(w.koperasi)), G47: V(tidak(w.koperasi)), L47: w.jenisKoperasi,
    G53: w.ppp, I53: w.kegiatanDiikuti,
    G54: w.kerjaBakti, I54: w.kerjaBaktiJenis,
    G55: w.rukunKematian, I55: w.rukunKematianJenis,
    G56: w.keagamaan, I56: w.keagamaanJenis,
    G57: w.jimpitan, G58: w.arisan, G59: w.barkas, G60: w.apotekHidup,
  }
  return { key: `tp-${w.id}`, tplId: 'tppkk', values: v, label: w.nama }
}

export const bTPPKK: Builder = (c) => {
  const list = c.aktif.filter((w) => !c.p.dawis || w.dasawisma === c.p.dawis)
  const pick = c.p.semua ? list : list.filter((w) => w.id === c.p.pick).slice(0, 1)
  return (pick.length ? pick : list.slice(0, 1)).map((w) => tppkkOf(w, c))
}

/* ===================== DATA KELUARGA & CATATAN KELUARGA (per keluarga) ===================== */
export function familiesOf(c: Ctx) {
  return c.keluarga
    .map((k) => {
      const ang = anggotaKeluarga(k.id, c.warga).filter((w) => w.statusWarga === 'Aktif')
      return { k, ang, kepala: ang.find(isKepala) ?? ang[0] }
    })
    .filter((x) => x.ang.length && (!c.p.dawis || x.kepala?.dasawisma === c.p.dawis))
    .sort((a, b) => a.k.nomor - b.k.nomor)
}
const pickFam = (c: Ctx) => {
  const all = familiesOf(c)
  const sel = c.p.semua ? all : all.filter((x) => x.k.id === c.p.pick).slice(0, 1)
  return sel.length ? sel : all.slice(0, 1)
}

function dataKeluargaOf(k: Keluarga, ang: Warga[], kepala: Warga | undefined, c: Ctx): PageSpec {
  const s = c.settings
  const cnt = (f: (w: Warga) => boolean) => ang.filter(f).length
  const wc = Number(k.kamarMandi) || 0
  const rows: Record<string, Val>[] = ang.map((w, i) => ({
    A: i + 1, B: w.noReg, E: link(w), H: w.statusKeluarga, J: w.statusKawin, L: V(w.jk === 'L'), M: V(w.jk === 'P'),
    N: dtText(w.tglLahir), O: hitungUmur(w.tglLahir, c.p.acuan) ?? '', P: w.pendidikan, R: w.pekerjaan,
  }))
  const v: Record<string, Val> = {
    D3: kepala?.dasawisma ?? '', D4: kepala?.alamat ?? '', H4: kepala?.dusun ?? '', D5: kepala?.desa ?? '', H5: kepala?.kecamatan ?? '', D6: kepala?.kabupaten ?? '', H6: kepala?.provinsi ?? '',
    E8: kepala ? link(kepala) : '', E9: ang.length,
    G10: cnt((w) => w.jk === 'L'), G12: cnt((w) => w.jk === 'P'), E13: jumlahKK(ang),
    G14: cnt((w) => isBalita(w, c.p.acuan, s)), J14: cnt((w) => isPUS(w, c.p.acuan)), M14: cnt((w) => isWUS(w, c.p.acuan)),
    O16: cnt((w) => isLansia(w, c.p.acuan, s)),
    I32: V(k.makananPokok === 'Beras'), K32: V(!!k.makananPokok && k.makananPokok !== 'Beras'),
    I34: V(wc > 0), K34: V(wc === 0), O34: k.jumlahWC,
    I36: V(k.sumberAir === 'PDAM'), K36: V(k.sumberAir === 'Sumur'),
    I38: V(k.tps === 'Ada'), K38: '',
    I40: V(yes(k.spal)), K40: V(tidak(k.spal)),
    I42: V(k.kriteriaRumah === 'Layak Huni' || k.rumahSehat === 'Sehat'), K42: V(k.kriteriaRumah === 'Tidak Layak Huni'),
    I44: V(yes(kepala?.up2k ?? '')), K44: V(tidak(kepala?.up2k ?? '')), O44: kepala?.jenisUp2k ?? '',
    I46: V(yes(kepala?.jumantik ?? '')), K46: V(tidak(kepala?.jumantik ?? '')),
  }
  if (c.o.isiKosong) {
    v.P14 = cnt((w) => w.tigaButa)
    v.G16 = cnt((w) => w.hamil)
    v.L16 = cnt((w) => w.menyusui)
  }
  return { key: `dk-${k.id}`, tplId: 'datakeluarga', values: v, regions: { m: rows }, rowsShown: { m: Math.max(rows.length, TEMPLATES.datakeluarga.regions[0].size) }, label: kepala?.nama }
}

export const bDataKeluarga: Builder = (c) => pickFam(c).map((x) => dataKeluargaOf(x.k, x.ang, x.kepala, c))

const YTV = (x: string): Val => (yes(x) ? 'V' : tidak(x) ? n(0) : '')
export const bCatatanKeluarga: Builder = (c) =>
  pickFam(c).map(({ k, ang, kepala }) => {
    const rows: Record<string, Val>[] = ang.map((w, i) => ({
      A: i + 1, B: link(w), C: w.statusKawin, D: w.jk, E: w.tempatLahir,
      F: `${dtText(w.tglLahir)} (${hitungUmur(w.tglLahir, c.p.acuan) ?? ''} th)`, G: w.agama, H: w.pendidikan, I: w.pekerjaan,
      J: w.berkebutuhanKhusus || '-', K: YTV(w.ppp), L: YTV(w.kerjaBakti), M: YTV(w.pendidikanKetrampilan), N: YTV(w.koperasi), O: YTV(w.apotekHidup),
      P: YTV(w.sandang), Q: w.kontrasepsi || yes(w.jumantik) ? 'V' : '', R: YTV(w.perencanaanSehat), S: w.catatan,
    }))
    const v: Record<string, Val> = {
      E3: kepala ? link(kepala) : '', E4: kepala?.dasawisma ?? '', E5: c.p.tahun,
      O3: k.kriteriaRumah, O4: (Number(k.kamarMandi) || 0) > 0 ? 'Ya' : 'Tidak', R4: k.jumlahWC, O5: k.sumberAir, O6: k.tps,
    }
    return { key: `ck-${k.id}`, tplId: 'catatankeluarga', values: v, regions: { main: rows }, label: kepala?.nama }
  })

/* ===================== HATINYA PKK & IRT ===================== */
export const bHTIRT: Builder = (c) => {
  const list = c.aktif.filter((w) => (w.pekarangan.length || w.irt.length) && (!c.p.dawis || w.dasawisma === c.p.dawis))
  const sel = c.p.semua ? list : list.filter((w) => w.id === c.p.pick).slice(0, 1)
  return (sel.length ? sel : list.slice(0, 1)).map((w) => ({
    key: `ht-${w.id}`, tplId: 'htirt', label: w.nama,
    values: { B2: link(w) },
    regions: {
      pk: w.pekarangan.map((x, i) => ({ A: i + 1, B: x.kategori, C: x.komoditi, D: x.jumlah })),
      irt: w.irt.map((x, i) => ({ A: i + 1, B: x.kategori, C: x.komoditi, D: x.volume })),
    },
  }))
}
