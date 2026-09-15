// Kosong berarti sama-origin: permintaan pergi ke /api/... pada
// host yang sama. Di produksi Nginx meneruskannya ke backend,
// saat pengembangan proxy Vite yang meneruskannya.
export const API_URL = "";

// Formulir cuti yang sama dengan yang dikirim bot WhatsApp SisKA
// (FORM_CUTI_URL di chatbot-whatsapp-siska/config/config.js).
// Kalau tautannya diganti di sana, ganti juga di sini.
export const FORM_CUTI_URL = "https://forms.gle/1JJLAFTGCN1McEUJ7";

// Nomor WhatsApp bot SisKA — sama dengan yang dipakai katalog
// persediaan (InventoryTaking.jsx di dashboard SisKA).
//
// Lembur diajukan lewat bot, bukan lewat web: persetujuannya
// terjadi di WhatsApp (atasan membalas "1"), dan hanya bot yang
// bisa mengirim pesan ke atasan. Web cukup menampilkan status
// dan mengantar pegawai ke chat bot.
export const NOMOR_BOT_SISKA = "6285122777026";

// =========================================================
// URL FOTO ABSENSI
// =========================================================

// Foto absensi disimpan sebagai berkas di server dan database
// hanya menyimpan path-nya, mis.
// "/uploads/Budi/08-2026/2026-08-18_masuk.jpg".
// Foto yang baru diambil di perangkat masih berupa data URL
// base64 dan dipakai apa adanya untuk pratinjau, jadi kedua
// bentuk itu harus tetap bisa ditampilkan.

export function urlFoto(value) {
  if (!value) return "";

  if (
    value.startsWith("data:") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}
