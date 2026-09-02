import { useState } from "react";

function DailyPerformance({ attendanceData, keBack, onSubmitKinerja }) {
  const [teksKinerja, setTeksKinerja] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Harus sama dengan KINERJA_MIN / KINERJA_MAX di
  // routes/absensiRoutes.js. Backend tetap memeriksanya lagi —
  // yang di sini hanya supaya pegawai tahu batasnya sebelum
  // menekan kirim, bukan setelah ditolak server.
  const minimalKarakter = 10;
  const maksimalKarakter = 100;

  // Hitung jumlah huruf (karakter) bukan kata
  const jumlahKarakter = teksKinerja.trim().length;

  const sudahMemenuhi =
    jumlahKarakter >= minimalKarakter &&
    jumlahKarakter <= maksimalKarakter;

  const handleKirim = async () => {
    // Jangan kirim kalau belum 20 huruf
    if (jumlahKarakter < minimalKarakter) {
      alert(
        `Kinerja harian minimal ${minimalKarakter} huruf. Saat ini baru ${jumlahKarakter} huruf.`
      );
      return;
    }

    if (jumlahKarakter > maksimalKarakter) {
      alert(
        `Kinerja harian maksimal ${maksimalKarakter} huruf. Saat ini ${jumlahKarakter} huruf.`
      );
      return;
    }

    // Pastikan data attendance tersedia
    if (!attendanceData) {
      console.error("attendanceData tidak tersedia dari Attendance.jsx");
      alert("Data absensi tidak ditemukan. Silakan ulangi proses absen keluar.");
      return;
    }

    // Pastikan Clock Out sudah ada
    if (!attendanceData.clockOut) {
      console.error("Clock Out belum tersedia:", attendanceData);
      alert(
        "Data absen keluar belum ditemukan. Silakan lakukan absen keluar terlebih dahulu."
      );
      return;
    }

    // Pastikan fungsi dari App tersedia
    if (typeof onSubmitKinerja !== "function") {
      console.error("onSubmitKinerja belum diberikan dari App.jsx");
      alert("Terjadi kesalahan sistem. Silakan coba lagi.");
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      console.log("=================================");
      console.log("📝 SUBMIT KINERJA HARIAN");
      console.log("=================================");
      console.log("Attendance Data:", attendanceData);
      console.log("Clock Out:", attendanceData.clockOut);
      console.log("Kinerja:", teksKinerja.trim());
      console.log("Jumlah Huruf:", jumlahKarakter);
      console.log("=================================");

      // Kirim data kinerja ke App.jsx
      await onSubmitKinerja(teksKinerja.trim());
    } catch (error) {
      console.error("❌ Gagal submit kinerja:", error);
      alert(error.message || "Gagal menyimpan kinerja harian.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tanggalSekarang = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="h-[100dvh] w-full max-w-[430px] mx-auto bg-paper font-sans flex flex-col shadow-lg overflow-hidden">
      {/* HEADER */}
      <div className="bg-brand px-6 pt-8 pb-5 text-white rounded-b-[30px] shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={keBack}
            disabled={isSubmitting}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all disabled:opacity-50"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <h1 className="text-xl font-bold">Kinerja Harian</h1>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 px-6 py-4 flex flex-col overflow-hidden">
        {/* TANGGAL */}
        <div className="mb-3">
          <p className="text-xs text-navy/60">Tanggal</p>
          <p className="font-bold text-navy mt-1">{tanggalSekarang}</p>
        </div>

        {/* INFO CLOCK OUT */}
        {attendanceData && (
          <div className="mb-3 bg-white border border-mist rounded-2xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-navy/60">Jam Masuk</p>
                <p className="font-bold text-navy mt-1">
                  {attendanceData.clockIn || "Belum"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-navy/60">Jam Keluar</p>
                <p className="font-bold text-navy mt-1">
                  {attendanceData.clockOut || "Belum"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LABEL */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-navy">
            Kinerja Hari Ini
          </label>

          <span
            className={`text-xs font-bold ${
              sudahMemenuhi ? "text-green-500" : "text-navy/60"
            }`}
          >
            {jumlahKarakter} / {maksimalKarakter}
          </span>
        </div>

        {/* TEXTAREA */}
        <textarea
          value={teksKinerja}
          onChange={(e) => setTeksKinerja(e.target.value)}
          disabled={isSubmitting}
          maxLength={maksimalKarakter}
          placeholder="Contoh: Menyusun laporan SPJ bulan Agustus"
          className="w-full flex-1 min-h-0 bg-white border border-mist rounded-2xl p-4 text-sm text-navy outline-none focus:ring-2 focus:ring-brand resize-none shadow-sm transition-all disabled:bg-mist"
        />

        {/* WORD COUNTER */}
        <div className="mt-2 flex items-center justify-between shrink-0">
          {!sudahMemenuhi && (
            <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-md">
              {jumlahKarakter > maksimalKarakter
                ? `Maksimal ${maksimalKarakter} huruf`
                : `Minimal ${minimalKarakter} huruf`}
            </span>
          )}

          {sudahMemenuhi && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
              ✓ Sudah memenuhi
            </span>
          )}
        </div>

        {/* BUTTON */}
        <button
          type="button"
          onClick={handleKirim}
          disabled={!sudahMemenuhi || isSubmitting}
          className="w-full mt-3 shrink-0 bg-brand text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-mist transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Menyimpan..."
            : sudahMemenuhi
            ? "Kirim Absen"
            : `Minimal ${minimalKarakter} huruf`}
        </button>
      </div>
    </div>
  );
}

export default DailyPerformance;