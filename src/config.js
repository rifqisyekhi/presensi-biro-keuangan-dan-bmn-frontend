// Kosong berarti sama-origin: permintaan pergi ke /api/... pada
// host yang sama. Di produksi Nginx meneruskannya ke backend,
// saat pengembangan proxy Vite yang meneruskannya.
export const API_URL = "";

// =========================================================
// URL FOTO ABSENSI
// =========================================================

// Foto absensi disimpan sebagai berkas di server dan database
// hanya menyimpan path-nya, mis. "/uploads/08-2026/18/Budi/clock-in.jpg".
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
