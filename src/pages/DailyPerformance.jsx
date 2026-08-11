import { useState } from "react";

function DailyPerformance({
  attendanceData,
  keBack,
  onSubmitKinerja,
}) {
  const [teksKinerja, setTeksKinerja] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minimalKata = 50;

  const jumlahKata =
    teksKinerja.trim().length === 0
      ? 0
      : teksKinerja
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;

  const sudahMemenuhi = jumlahKata >= minimalKata;

  const handleKirim = async () => {
    // Jangan kirim kalau belum 50 kata
    if (!sudahMemenuhi) {
      alert(
        `Kinerja harian minimal ${minimalKata} kata. Saat ini baru ${jumlahKata} kata.`
      );
      return;
    }

    // Pastikan data attendance tersedia
    if (!attendanceData) {
      console.error(
        "attendanceData tidak tersedia dari Attendance.jsx"
      );

      alert(
        "Data absensi tidak ditemukan. Silakan ulangi proses Clock Out."
      );

      return;
    }

    // Pastikan Clock Out sudah ada
    if (!attendanceData.clockOut) {
      console.error(
        "Clock Out belum tersedia:",
        attendanceData
      );

      alert(
        "Data Clock Out belum ditemukan. Silakan lakukan Clock Out terlebih dahulu."
      );

      return;
    }

    // Pastikan fungsi dari App tersedia
    if (typeof onSubmitKinerja !== "function") {
      console.error(
        "onSubmitKinerja belum diberikan dari App.jsx"
      );

      alert(
        "Terjadi kesalahan sistem. Silakan coba lagi."
      );

      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      console.log("=================================");
      console.log("📝 SUBMIT KINERJA HARIAN");
      console.log("=================================");
      console.log(
        "Attendance Data:",
        attendanceData
      );
      console.log(
        "Clock Out:",
        attendanceData.clockOut
      );
      console.log(
        "Kinerja:",
        teksKinerja.trim()
      );
      console.log(
        "Jumlah Kata:",
        jumlahKata
      );
      console.log("=================================");

      // Kirim data kinerja ke App.jsx
      await onSubmitKinerja(
        teksKinerja.trim()
      );
    } catch (error) {
      console.error(
        "❌ Gagal submit kinerja:",
        error
      );

      alert(
        error.message ||
          "Gagal menyimpan kinerja harian."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const tanggalSekarang =
    new Date().toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F7F9FC] font-sans flex flex-col shadow-lg">

      {/* HEADER */}
      <div className="bg-[#5B84F5] px-6 pt-10 pb-6 text-white rounded-b-[30px] shadow-md">

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

          <h1 className="text-xl font-bold">
            Kinerja Harian
          </h1>

        </div>

      </div>

      {/* CONTENT */}
      <div className="flex-1 px-6 py-6 flex flex-col overflow-y-auto">

        {/* TANGGAL */}
        <div className="mb-5">

          <p className="text-xs text-gray-400">
            Tanggal
          </p>

          <p className="font-bold text-gray-700 mt-1">
            {tanggalSekarang}
          </p>

        </div>

        {/* INFO CLOCK OUT */}
        {attendanceData && (
          <div className="mb-5 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-gray-400">
                  Clock In
                </p>

                <p className="font-bold text-gray-700 mt-1">
                  {attendanceData.clockIn ||
                    "Belum"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-400">
                  Clock Out
                </p>

                <p className="font-bold text-gray-700 mt-1">
                  {attendanceData.clockOut ||
                    "Belum"}
                </p>
              </div>

            </div>

          </div>
        )}

        {/* LABEL */}
        <div className="flex items-center justify-between mb-2">

          <label className="text-sm font-bold text-gray-800">
            Kinerja Hari Ini
          </label>

          <span
            className={`text-xs font-bold ${
              sudahMemenuhi
                ? "text-green-500"
                : "text-gray-400"
            }`}
          >
            {jumlahKata} / {minimalKata}
          </span>

        </div>

        {/* TEXTAREA */}
        <textarea
          value={teksKinerja}
          onChange={(e) =>
            setTeksKinerja(e.target.value)
          }
          disabled={isSubmitting}
          placeholder="Jelaskan pekerjaan yang telah dilakukan hari ini..."
          className="w-full min-h-[260px] bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#5B84F5] resize-none shadow-sm transition-all disabled:bg-gray-100"
        />

        {/* WORD COUNTER */}
        <div className="mt-3 flex items-center justify-between">

          <span
            className={`text-sm font-bold ${
              sudahMemenuhi
                ? "text-green-500"
                : "text-gray-500"
            }`}
          >
            {jumlahKata} / {minimalKata} kata
          </span>

          {!sudahMemenuhi && (
            <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-md">
              Minimal 50 kata
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
          disabled={
            !sudahMemenuhi ||
            isSubmitting
          }
          className="w-full mt-6 bg-[#5B84F5] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Menyimpan..."
            : sudahMemenuhi
            ? "Kirim Absen"
            : `Minimal ${minimalKata} kata`}
        </button>

      </div>

    </div>
  );
}

export default DailyPerformance;