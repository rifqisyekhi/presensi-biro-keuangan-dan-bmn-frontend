import { useEffect, useState } from "react";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import { useAlert } from "../context/AlertContext";
import { API_URL } from "../config";
import logoKemnaker from "../assets/logo-kemnaker.png";
import PortalTuMenu from "../components/PortalTuMenu";

// =========================================================
// JAM LEMBUR OTOMATIS
// =========================================================
//
// Sebagian jabatan — petugas kebersihan — lemburnya diakui tanpa
// pengajuan dan tanpa persetujuan atasan, karena mereka memang
// pulang paling akhir hampir setiap hari. Yang tetap dicatat
// adalah APA yang dikerjakan selama jam itu.
//
// Aturannya disalin dari backend (utils/jamKerja.js): lembur
// dihitung dari Jam Harus Checkout, dibulatkan ke bawah per jam
// penuh. Backend tetap memeriksanya lagi saat absen pulang
// disimpan — yang di sini hanya supaya pegawai tahu sebelum
// menekan kirim, bukan setelah ditolak server.

function menitDariJam(nilai) {
  const cocok = /^(\d{1,2})[.:](\d{2})$/.exec(String(nilai || "").trim());

  return cocok ? Number(cocok[1]) * 60 + Number(cocok[2]) : null;
}

function hitungJamLembur(jamPulang, jamHarusCheckout) {
  const pulang = menitDariJam(jamPulang);
  const harus = menitDariJam(jamHarusCheckout);

  if (pulang === null || harus === null) return 0;

  return Math.max(0, Math.floor((pulang - harus) / 60));
}

function DailyPerformance({
  attendanceData,
  keBack,
  keHome,
  keRiwayat,
  keProfile,
  keRekap,
  keLogout,
  onSubmitKinerja,
}) {
  const { showAlert } = useAlert();
  const [teksKinerja, setTeksKinerja] = useState("");
  const [teksKinerjaLembur, setTeksKinerjaLembur] = useState("");
  const [jamLembur, setJamLembur] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [petugas, setPetugas] = useState(false);

  useEffect(() => {
    const cekPetugas = async () => {
      try {
        const noWa = localStorage.getItem("userPhone");
        if (!noWa) return;
        const response = await fetch(
          `${API_URL}/api/rekap/izin?pemohon=${encodeURIComponent(noWa)}`
        );
        if (!response.ok) return;
        const hasil = await response.json();
        setPetugas(Boolean(hasil.petugas));
      } catch {
        // Abaikan jika gagal
      }
    };
    cekPetugas();
  }, []);

  // Jam Harus Checkout dan penanda lembur otomatis dibaca dari
  // backend, bukan dihitung ulang di sini: angkanya harus sama
  // persis dengan yang tercetak di berkas rekap.
  useEffect(() => {
    const noWa = (() => {
      try {
        return localStorage.getItem("userPhone") || "";
      } catch {
        return "";
      }
    })();

    if (!noWa || !attendanceData?.clockOut) return;

    let dibatalkan = false;

    (async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/absensi/today/${encodeURIComponent(noWa)}`,
        );

        const hasil = await response.json();

        if (dibatalkan || !response.ok || !hasil.exists) return;

        if (hasil.data?.lemburOtomatis !== true) return;

        setJamLembur(
          hitungJamLembur(
            attendanceData.clockOut,
            hasil.jamKerja?.jamHarusCheckout,
          ),
        );
      } catch (error) {
        // Gagal membaca status lembur tidak boleh menghalangi absen
        // pulang. Kolom kinerja lembur hanya tidak muncul, dan
        // backend akan menolak kalau ternyata memang wajib —
        // dengan pesan yang menjelaskan alasannya.
        console.error("Gagal membaca status lembur:", error);
      }
    })();

    return () => {
      dibatalkan = true;
    };
  }, [attendanceData?.clockOut]);

  const perluKinerjaLembur = jamLembur >= 1;

  // Harus sama dengan KINERJA_MIN / KINERJA_MAX di
  // routes/absensiRoutes.js. Backend tetap memeriksanya lagi —
  // yang di sini hanya supaya pegawai tahu batasnya sebelum
  // menekan kirim, bukan setelah ditolak server.
  const minimalKarakter = 10;
  const maksimalKarakter = 100;

  // Hitung jumlah huruf (karakter) bukan kata
  const jumlahKarakter = teksKinerja.trim().length;

  const jumlahKarakterLembur = teksKinerjaLembur.trim().length;

  const lemburMemenuhi =
    !perluKinerjaLembur ||
    (jumlahKarakterLembur >= minimalKarakter &&
      jumlahKarakterLembur <= maksimalKarakter);

  const sudahMemenuhi =
    jumlahKarakter >= minimalKarakter &&
    jumlahKarakter <= maksimalKarakter &&
    lemburMemenuhi;

  const handleKirim = async () => {
    // Jangan kirim kalau belum 20 huruf
    if (jumlahKarakter < minimalKarakter) {
      showAlert({
        title: "Kinerja Terlalu Singkat",
        message: `Kinerja harian minimal ${minimalKarakter} huruf. Saat ini baru ${jumlahKarakter} huruf.`,
        type: "warning",
      });
      return;
    }

    if (jumlahKarakter > maksimalKarakter) {
      showAlert({
        title: "Kinerja Terlalu Panjang",
        message: `Kinerja harian maksimal ${maksimalKarakter} huruf. Saat ini ${jumlahKarakter} huruf.`,
        type: "warning",
      });
      return;
    }

    if (perluKinerjaLembur && jumlahKarakterLembur < minimalKarakter) {
      showAlert({
        title: "Kinerja Lembur Wajib Diisi",
        message: `Anda lembur ${jamLembur} jam hari ini. Kinerja lembur wajib diisi minimal ${minimalKarakter} huruf.`,
        type: "warning",
      });
      return;
    }

    // Pastikan data attendance tersedia
    if (!attendanceData) {
      console.error("attendanceData tidak tersedia dari Attendance.jsx");
      showAlert({
        title: "Data Tidak Ditemukan",
        message: "Data absensi tidak ditemukan. Silakan ulangi proses absen keluar.",
        type: "error",
      });
      return;
    }

    // Pastikan Clock Out sudah ada
    if (!attendanceData.clockOut) {
      console.error("Clock Out belum tersedia:", attendanceData);
      showAlert({
        title: "Belum Absen Keluar",
        message: "Data absen keluar belum ditemukan. Silakan lakukan absen keluar terlebih dahulu.",
        type: "warning",
      });
      return;
    }

    // Pastikan fungsi dari App tersedia
    if (typeof onSubmitKinerja !== "function") {
      console.error("onSubmitKinerja belum diberikan dari App.jsx");
      showAlert({
        title: "Kesalahan Sistem",
        message: "Terjadi kesalahan sistem. Silakan coba lagi.",
        type: "error",
      });
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
      await onSubmitKinerja(
        teksKinerja.trim(),
        perluKinerjaLembur ? teksKinerjaLembur.trim() : "",
      );
    } catch (error) {
      console.error("❌ Gagal submit kinerja:", error);
      showAlert({
        title: "Gagal Menyimpan",
        message: error.message || "Gagal menyimpan kinerja harian.",
        type: "error",
      });
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
    <div className="min-h-screen w-full bg-paper font-sans text-navy flex flex-col">
      {/* =====================================================
          1. DESKTOP NAVBAR (hidden md:block)
      ===================================================== */}
      <header className="hidden md:block bg-white border-b border-mist/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-paper p-1.5 border border-mist flex items-center justify-center shadow-xs shrink-0">
              <img
                src={logoKemnaker}
                alt="Logo Kemnaker"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-navy leading-tight">Presensi Non-ASN</h1>
              <p className="text-[11px] text-slate-500">Biro Keuangan dan BMN</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 text-xs font-semibold">
            {keHome && (
              <button
                onClick={keHome}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
              >
                Beranda
              </button>
            )}
            {keRiwayat && (
              <button
                onClick={keRiwayat}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
              >
                Riwayat
              </button>
            )}
            {keProfile && (
              <button
                onClick={keProfile}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
              >
                Profil Saya
              </button>
            )}
            {petugas && keRekap && (
              <>
                <button
                  onClick={keRekap}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Rekap Absensi</span>
                  <span className="bg-brand/10 text-brand text-[10px] font-bold px-1.5 py-0.2 rounded-sm uppercase">Petugas</span>
                </button>
                <PortalTuMenu />
              </>
            )}
            <div className="w-px h-5 bg-mist mx-1" />
            {keLogout && (
              <button
                onClick={keLogout}
                className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all cursor-pointer font-bold"
              >
                Keluar
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* =====================================================
          2. MOBILE HEADER (block md:hidden)
      ===================================================== */}
      <header className="block md:hidden bg-brand px-6 pt-8 pb-5 text-white rounded-b-[30px] shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={keBack}
            disabled={isSubmitting}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FiArrowLeft className="h-6 w-6" />
          </button>

          <h1 className="text-xl font-bold">Kinerja Harian</h1>
        </div>
      </header>

      {/* =====================================================
          3. DESKTOP BREADCRUMB (hidden md:block)
      ===================================================== */}
      <div className="hidden md:block bg-white border-b border-mist/80 py-4 shadow-2xs">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={keBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-mist hover:bg-slate-50 text-xs font-semibold text-navy transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <FiArrowLeft className="w-4 h-4 text-brand" />
              <span>Kembali</span>
            </button>
            <div className="h-5 w-px bg-mist" />
            <div>
              <h2 className="text-lg font-bold text-navy leading-tight">Pengisian Kinerja Harian</h2>
              <p className="text-xs text-slate-500">Langkah akhir untuk menyelesaikan absensi keluar hari ini</p>
            </div>
          </div>

          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-mist">
            {tanggalSekarang}
          </span>
        </div>
      </div>

      {/* =====================================================
          4. MAIN CONTENT
      ===================================================== */}
      <main className="w-full max-w-[430px] md:max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-8 flex-1 flex flex-col justify-between md:justify-start">
        <div className="bg-white rounded-[22px] md:rounded-3xl p-5 md:p-7 border border-mist shadow-xs flex flex-col gap-4">
          
          {/* TANGGAL & INFO CLOCK OUT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-mist/70">
            <div>
              <p className="text-xs text-navy/60 font-medium">Tanggal Presensi</p>
              <p className="font-bold text-navy text-sm sm:text-base mt-0.5">{tanggalSekarang}</p>
            </div>

            {attendanceData && (
              <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-2xl border border-mist/70 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Masuk</span>
                  <strong className="text-navy font-bold">{attendanceData.clockIn || "--:--"} WIB</strong>
                </div>
                <div className="w-px h-6 bg-mist" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Keluar</span>
                  <strong className="text-navy font-bold">{attendanceData.clockOut || "--:--"} WIB</strong>
                </div>
              </div>
            )}
          </div>

          {/* LABEL KINERJA HARIAN */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-navy">
                Uraian Kinerja Harian <span className="text-red-500">*</span>
              </label>

              <span
                className={`text-xs font-bold ${
                  sudahMemenuhi ? "text-emerald-600" : "text-navy/60"
                }`}
              >
                {jumlahKarakter} / {maksimalKarakter} karakter
              </span>
            </div>

            <textarea
              value={teksKinerja}
              onChange={(e) => setTeksKinerja(e.target.value)}
              disabled={isSubmitting}
              maxLength={maksimalKarakter}
              rows={4}
              placeholder="Tuliskan aktivitas atau pekerjaan yang Anda selesaikan hari ini (minimal 10 huruf)..."
              className="w-full bg-slate-50/60 border border-mist rounded-2xl p-4 text-xs sm:text-sm text-navy outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand focus:bg-white resize-none shadow-2xs transition-all disabled:bg-mist leading-relaxed"
            />

            {/* COUNTER STATUS */}
            <div className="mt-2 flex items-center justify-between">
              {!sudahMemenuhi && (
                <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
                  {jumlahKarakter > maksimalKarakter
                    ? `Maksimal ${maksimalKarakter} huruf`
                    : `Minimal ${minimalKarakter} huruf`}
                </span>
              )}

              {sudahMemenuhi && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  ✓ Kinerja harian sudah memenuhi syarat
                </span>
              )}
            </div>
          </div>

          {/* KINERJA LEMBUR JIKA ADA */}
          {perluKinerjaLembur && (
            <div className="pt-3 border-t border-mist/70">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-bold text-navy flex items-center gap-1.5">
                  <span>Uraian Kinerja Lembur</span>
                  <span className="bg-brand/10 text-brand text-[11px] px-2 py-0.5 rounded-full font-bold">
                    {jamLembur} Jam
                  </span>
                </label>

                <span
                  className={`text-xs font-bold ${
                    lemburMemenuhi ? "text-emerald-600" : "text-navy/60"
                  }`}
                >
                  {jumlahKarakterLembur} / {maksimalKarakter} karakter
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-2">
                Lembur Anda terhitung otomatis ({jamLembur} jam penuh). Silakan isi uraian pekerjaan lembur.
              </p>

              <textarea
                value={teksKinerjaLembur}
                onChange={(e) => setTeksKinerjaLembur(e.target.value)}
                disabled={isSubmitting}
                maxLength={maksimalKarakter}
                rows={3}
                placeholder="Contoh: Membersihkan ruang rapat lantai 3 dan 4 sesudah jam dinas..."
                className="w-full bg-slate-50/60 border border-mist rounded-2xl p-4 text-xs sm:text-sm text-navy outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand focus:bg-white resize-none shadow-2xs transition-all disabled:bg-mist leading-relaxed"
              />

              {!lemburMemenuhi && (
                <div className="mt-2">
                  <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
                    {jumlahKarakterLembur > maksimalKarakter
                      ? `Maksimal ${maksimalKarakter} huruf`
                      : `Minimal ${minimalKarakter} huruf`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleKirim}
              disabled={!sudahMemenuhi || isSubmitting}
              className="w-full bg-brand hover:bg-brand/90 text-white py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan Absensi...</span>
                </>
              ) : sudahMemenuhi ? (
                <>
                  <span>Simpan & Selesaikan Presensi</span>
                  <FiCheck className="w-5 h-5" />
                </>
              ) : (
                <span>Minimal {minimalKarakter} huruf</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DailyPerformance;