/** Skrip Google Apps Script siap tempel: tiap hari mengambil cadangan terbaru dari server dan menyimpannya di Google Drive */
export function skripGoogleDrive(alamat: string, simpanHari = 60): string {
  return `// SIWARGA PKK — cadangan harian ke Google Drive
// 1) Tempel seluruh isi ini di script.google.com (Proyek baru), lalu Simpan.
// 2) Pilih fungsi "pasangJadwalHarian" di atas, klik Jalankan, lalu izinkan aksesnya (sekali saja).
const ALAMAT = '${alamat}';
const NAMA_FOLDER = 'Cadangan SIWARGA';
const SIMPAN_HARI = ${simpanHari}; // file yang lebih lama dari ini dipindah ke Sampah Drive

function cadangkanSiwarga() {
  const r = UrlFetchApp.fetch(ALAMAT, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) throw new Error('Gagal mengambil cadangan (' + r.getResponseCode() + '): ' + r.getContentText().slice(0, 200));
  const cari = DriveApp.getFoldersByName(NAMA_FOLDER);
  const folder = cari.hasNext() ? cari.next() : DriveApp.createFolder(NAMA_FOLDER);
  const nama = 'siwarga-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd') + '.db';
  const sama = folder.getFilesByName(nama);
  while (sama.hasNext()) sama.next().setTrashed(true);
  folder.createFile(r.getBlob().setName(nama));
  const batas = Date.now() - SIMPAN_HARI * 24 * 60 * 60 * 1000;
  const semua = folder.getFiles();
  while (semua.hasNext()) {
    const f = semua.next();
    if (/^siwarga-\\d{4}-\\d{2}-\\d{2}\\.db$/.test(f.getName()) && f.getDateCreated().getTime() < batas) f.setTrashed(true);
  }
}

// Jalankan SEKALI: memasang jadwal tiap hari jam 01.00–02.00 WIB dan langsung membuat cadangan pertama
function pasangJadwalHarian() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'cadangkanSiwarga') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cadangkanSiwarga').timeBased().everyDays(1).atHour(1).inTimezone('Asia/Jakarta').create();
  cadangkanSiwarga();
}
`
}
