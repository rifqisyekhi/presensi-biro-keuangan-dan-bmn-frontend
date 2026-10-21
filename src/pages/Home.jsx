import { useEffect, useState } from "react";
import { FiBell, FiArrowRight, FiExternalLink } from "react-icons/fi";
import { useAlert } from "../context/AlertContext";
import BottomNav from "../components/BottomNav";
import PortalTuMenu from "../components/PortalTuMenu";
import logoKemnaker from "../assets/logo-kemnaker.png";

import { API_URL, FORM_CUTI_URL, NOMOR_BOT_SISKA } from "../config";

// =========================================================
// HELPER
// =========================================================

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizePhoneNumber(value) {
  if (!value) return "";

  const digits = String(value).trim().replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (!digits.startsWith("62")) {
    return `62${digits}`;
  }

  return digits;
}

const LABEL_JENIS = {
  WFO: "WFO",
  WFH: "WFH",
  DINAS: "Dinas Luar",
};

// "03.13" -> "3 jam 13 menit", "03.00" -> "3 jam".
function lamaJam(nilai) {
  const cocok = /^(\d{1,2})[.:](\d{2})$/.exec(String(nilai || ""));

  if (!cocok) return "";

  const jam = Number(cocok[1]);
  const menit = Number(cocok[2]);

  return [jam ? `${jam} jam` : "", menit ? `${menit} menit` : ""]
    .filter(Boolean)
    .join(" ") || "0 jam";
}

// =========================================================
// KARTU LEMBUR
// =========================================================
//
// Lembur non-ASN tidak diisi di web. Mulainya jam harus pulang,
// selesainya jam absen pulang, dan persetujuannya terjadi di
// WhatsApp — atasan membalas pesan dari bot SisKA. Kartu ini
// menampilkan keadaannya hari ini dan mengantar pegawai ke chat
// bot untuk mengajukan.

const LINK_BOT = `https://wa.me/${NOMOR_BOT_SISKA}?text=menu`;

function KartuLembur({ lembur }) {
  let isi;
  let tombol = { teks: "Ajukan via WhatsApp", link: LINK_BOT };

  if (!lembur) {
    isi = "Pengajuan lembur diajukan lewat WhatsApp SisKA dan disetujui atasan.";
  } else if (!lembur.sudahMasuk) {
    isi = "Absen masuk terlebih dahulu untuk memulai perhitungan jam lembur.";
    tombol = null;
  } else if (lembur.dinasLuar) {
    isi = "Lembur tidak berlaku untuk kehadiran Dinas Luar.";
    tombol = null;
  } else if (!lembur.jamMulai) {
    isi = "Lembur tidak berlaku untuk jabatan Anda — jam kerja mengikuti jadwal tugas.";
    tombol = null;
  } else if (lembur.disetujui && lembur.sudahPulang) {
    isi = (
      <>
        ✅ Tercatat {lembur.jamMulai}–{lembur.jamSelesai}
        <br />
        Dihitung <b>{lamaJam(lembur.pembulatan)}</b>
        {lembur.durasi && lembur.durasi !== lembur.pembulatan
          ? ` (dari ${lamaJam(lembur.durasi)})`
          : ""}
      </>
    );
    tombol = null;
  } else if (lembur.disetujui) {
    isi = (
      <>
        ✅ Lembur disetujui (mulai {lembur.jamMulai}).
        <br />
        Silakan absen pulang lewat WA agar foto bukti terkirim.
      </>
    );
    tombol = { teks: "Pulang Lewat WhatsApp", link: LINK_BOT };
  } else if (lembur.sudahPulang) {
    isi = `Sudah absen pulang ${lembur.jamSelesai}, tanpa persetujuan lembur.`;
  } else {
    isi = (
      <>
        Pengajuan lembur dimulai pukul <b>{lembur.jamMulai || "jam pulang"}</b>. Menunggu persetujuan atasan.
      </>
    );
  }

  const kelas =
    "h-full w-full relative overflow-hidden text-left rounded-[22px] md:rounded-3xl bg-white text-navy p-5 min-h-[185px] flex flex-col justify-between border border-mist shadow-xs";

  const isiKartu = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-navy">Lembur</h3>
        <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
          WhatsApp
        </span>
      </div>

      <p className="text-xs leading-relaxed my-2.5 text-slate-600">
        {isi}
      </p>

      {tombol && (
        <span className="mt-auto bg-brand hover:bg-brand/90 text-white rounded-xl py-2 px-3 text-center text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5">
          {tombol.teks}
        </span>
      )}
    </>
  );

  return tombol ? (
    <a
      href={tombol.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${kelas} active:scale-[0.98] transition-all hover:border-brand/40`}
    >
      {isiKartu}
    </a>
  ) : (
    <div className={kelas}>{isiKartu}</div>
  );
}

function Home({ keAttendance, keRiwayat, keProfile, keRekap, keLogout }) {
  const [user, setUser] = useState(null);
  const { showAlert } = useAlert();

  const [attendance, setAttendance] = useState({
    status: "Belum Absen",
    clockIn: null,
    clockOut: null,
  });

  // Keadaan lembur hari ini, dibaca dari absensi yang sama.
  // null = absensi hari ini belum terbaca dari server.
  const [lembur, setLembur] = useState(null);
  const [petugas, setPetugas] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Jam pada kartu "Hari ini" harus ikut berjalan, bukan
  // berhenti di waktu halaman dibuka.
  const [sekarang, setSekarang] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setSekarang(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const identifier =
          localStorage.getItem("userNip") || localStorage.getItem("userPhone");

        console.log("=================================");
        console.log("🏠 HOME");
        console.log("Identifier:", identifier);
        console.log("userNip:", localStorage.getItem("userNip"));
        console.log("userPhone:", localStorage.getItem("userPhone"));
        console.log("=================================");

        if (!identifier) {
          throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
        }

        const url = `${API_URL}/api/pegawai/${encodeURIComponent(identifier)}`;

        console.log("📡 GET PEGAWAI:", url);

        const profileResponse = await fetch(url);

        console.log(
          "📥 Response pegawai:",
          profileResponse.status,
          profileResponse.statusText,
        );

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json().catch(() => null);

          console.error("❌ Gagal mengambil pegawai:", errorData);

          throw new Error(
            errorData?.message || "Gagal mengambil data pegawai dari database.",
          );
        }

        const profileData = await profileResponse.json();

        console.log("✅ DATA PEGAWAI:", profileData);

        setUser(profileData);

        localStorage.setItem("userData", JSON.stringify(profileData));

        localStorage.setItem("userPhone", profileData.no_wa || identifier);

        console.log("💾 Data pegawai disimpan ke localStorage");

        // =====================================================
        // AMBIL ABSENSI HARI INI DARI DATABASE
        // =====================================================

        // Endpoint ini dicari berdasarkan nomor WhatsApp,
        // bukan NIP.
        const no_wa = normalizePhoneNumber(profileData.no_wa || identifier);

        if (no_wa) {
          try {
            const todayResponse = await fetch(
              `${API_URL}/api/absensi/today/${encodeURIComponent(no_wa)}` +
                `?tanggal=${getTodayKey()}`,
            );

            console.log("📡 GET ABSENSI HARI INI:", todayResponse.status);

            if (todayResponse.ok) {
              const todayData = await todayResponse.json();

              console.log("✅ ABSENSI HARI INI:", todayData);

              // Respons backend: { exists, data }
              const absensiHariIni = todayData.data;

              // Server bilang tidak ada absensi hari ini, tapi browser
              // masih menyimpan salinannya. Itu terjadi kalau datanya
              // dihapus dari sisi lain — misalnya reset data pengujian
              // lewat bot. Tanpa dibuang, cadangan di bawah akan
              // menghidupkannya lagi dan halaman ini menampilkan
              // absensi yang sudah tidak ada.
              if (!absensiHariIni) {
                try {
                  localStorage.removeItem(`attendance_${getTodayKey()}`);
                } catch (storageError) {
                  console.error("Gagal menghapus draf absensi:", storageError);
                }
              }

              setAttendance({
                status: absensiHariIni?.clockOut
                  ? "Sudah Absen Keluar"
                  : absensiHariIni?.clockIn
                    ? "Sudah Absen Masuk"
                    : "Belum Absen",

                clockIn: absensiHariIni?.clockIn || null,
                clockOut: absensiHariIni?.clockOut || null,

                // Jenis kehadiran saat absen masuk. Absen pulang WAJIB
                // memakai jenis yang sama — halaman Attendance menolak
                // kalau berbeda — jadi angka ini yang dipakai tombol
                // "Absen Pulang", bukan pilihan baru dari pegawai.
                jenis: absensiHariIni?.attendanceType || null,
              });

              // Jam mulai lembur = jam harus pulang, dihitung
              // backend dari jam masuk. Durasinya hanya terisi
              // kalau atasan sudah menyetujui.
              setLembur({
                sudahMasuk: Boolean(absensiHariIni?.clockIn),
                sudahPulang: Boolean(absensiHariIni?.clockOut),
                dinasLuar: absensiHariIni?.attendanceType === "DINAS",
                disetujui: absensiHariIni?.lembur?.disetujui === true,
                jamMulai: todayData.jamKerja?.jamHarusCheckout || "",
                jamSelesai: absensiHariIni?.clockOut || "",
                durasi: todayData.jamKerja?.durasiLembur || "",
                pembulatan: todayData.jamKerja?.pembulatanLembur || "",
              });
            } else {
              console.error(
                "❌ Gagal mengambil absensi hari ini:",
                await todayResponse.text(),
              );
            }
          } catch (attendanceError) {
            console.error("❌ Error mengambil absensi:", attendanceError);
          }
        }

        // =====================================================
        // FALLBACK LOCAL STORAGE
        // =====================================================

        const todayKey = getTodayKey();

        const savedData = localStorage.getItem(`attendance_${todayKey}`);

        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);

            // Hanya gunakan localStorage kalau database
            // belum memberikan data
            setAttendance((current) => ({
              status: current.clockOut
                ? "Sudah Absen Keluar"
                : current.clockIn
                  ? "Sudah Absen Masuk"
                  : parsed.clockOut
                    ? "Sudah Absen Keluar"
                    : parsed.clockIn
                      ? "Sudah Absen Masuk"
                      : "Belum Absen",

              clockIn: current.clockIn || parsed.clockIn || null,

              clockOut: current.clockOut || parsed.clockOut || null,
            }));
          } catch (storageError) {
            console.error("Gagal membaca localStorage absensi:", storageError);
          }
        }
      } catch (err) {
        console.error("❌ Error loading Home data:", err);

        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // =========================================================
  // LOADING
  // =========================================================

  if (isLoading) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-paper flex items-center justify-center font-sans text-navy">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-paper flex flex-col items-center justify-center font-sans text-navy px-6">
        <p className="text-red-500 font-bold mb-2">Terjadi Kesalahan</p>

        <p className="text-navy/70 text-sm text-center mb-4">{error}</p>

        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-brand text-white font-semibold"
          >
            Coba Lagi
          </button>

          {/* Tanpa ini pengguna terkunci di layar error: sesi
              tersimpan membuat aplikasi selalu mulai dari Home,
              dan reload akan gagal terus. */}
          <button
            onClick={keLogout}
            className="px-4 py-2 rounded-xl border border-mist bg-white text-brand font-semibold"
          >
            Masuk Ulang
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen w-full bg-paper font-sans text-navy flex flex-col">
      {/* =====================================================
          1. DESKTOP NAVBAR (md:block hidden)
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
            <button
              onClick={() => {}}
              className="px-3.5 py-2 rounded-xl bg-brand text-white font-bold shadow-xs cursor-pointer"
            >
              Beranda
            </button>
            <button
              onClick={keRiwayat}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
            >
              Riwayat
            </button>
            <button
              onClick={keProfile}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
            >
              Profil Saya
            </button>
            {petugas && (
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
            <button
              onClick={keLogout}
              className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all cursor-pointer font-bold"
            >
              Keluar
            </button>
          </nav>
        </div>
      </header>

      {/* =====================================================
          2. MOBILE TOP HEADER (block md:hidden)
      ===================================================== */}
      <header className="block md:hidden bg-white px-6 pt-7 pb-3 border-b border-mist/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-navy/60 font-medium">Selamat datang,</p>
            <h1 className="text-lg font-bold text-navy truncate max-w-[280px]">
              {user?.nama || "Pegawai"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {petugas && <PortalTuMenu compact />}
            <button onClick={keProfile} className="w-10 h-10 rounded-full bg-mist flex items-center justify-center cursor-pointer">
              <FiBell className="w-5 h-5 text-brand" />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          3. MAIN CONTENT CONTAINER (Grid Sejajar & Sebaris)
      ===================================================== */}
      <main className="w-full max-w-[430px] md:max-w-6xl mx-auto px-4 sm:px-5 md:px-8 py-4 md:py-8 flex-1 pb-24 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-stretch">
          
          {/* ===================================================
              BARIS 1: IDENTITAS PEGAWAI (Kiri) & KARTU LEMBUR (Kanan)
          =================================================== */}
          
          {/* BARIS 1 KIRI: PROFILE BANNER */}
          <div className="order-1 md:order-1 md:col-span-7 lg:col-span-8 h-full">
            <div className="relative overflow-hidden rounded-[22px] md:rounded-3xl bg-brand p-5 sm:p-6 text-white shadow-md h-full flex flex-col justify-between">
              <div className="absolute -right-10 -top-12 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
              
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-lg md:text-xl truncate">
                    {user?.nama || "Pengguna"}
                  </h2>
                  <p className="text-xs md:text-sm text-mist/90 mt-0.5 truncate font-mono">
                    {user?.nip || "-"} {" • "} {user?.jabatan || "-"}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    attendance.status === "Selesai" ? "bg-green" : attendance.clockIn ? "bg-yellow" : "bg-mist"
                  }`} />
                  <span className="text-xs font-semibold">{attendance.status}</span>
                </div>
              </div>

              {user?.sub_unit && (
                <div className="relative mt-3 pt-2.5 border-t border-white/15">
                  <p className="text-[11px] md:text-xs text-white/80 font-medium">
                    Unit Kerja: {user?.sub_unit}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BARIS 1 KANAN: KARTU LEMBUR */}
          <div className="order-4 md:order-2 md:col-span-5 lg:col-span-4 h-full">
            <KartuLembur lembur={lembur} />
          </div>

          {/* ===================================================
              BARIS 2: REAL-TIME CLOCK (Kiri) & KARTU CUTI (Kanan)
          =================================================== */}

          {/* BARIS 2 KIRI: REAL-TIME CLOCK & STATUS KEHADIRAN */}
          <div className="order-2 md:order-3 md:col-span-7 lg:col-span-8 h-full">
            <div className="bg-white rounded-[22px] md:rounded-3xl p-5 shadow-xs border border-mist h-full flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3.5 border-b border-mist/70">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">Hari ini</p>
                  <h3 className="font-bold text-navy text-sm sm:text-base mt-0.5">
                    {sekarang.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 font-semibold">Jam Digital</p>
                  <p className="font-extrabold text-brand text-lg sm:text-2xl tracking-tight">
                    {sekarang.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3.5">
                <div className="bg-paper p-3.5 rounded-2xl border border-mist/70 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Jam Masuk</p>
                    <p className="font-extrabold text-navy text-base sm:text-xl mt-0.5">
                      {attendance.clockIn ? `${attendance.clockIn} WIB` : "--:--"}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {attendance.clockIn ? "Tercatat" : "Belum absen"}
                  </p>
                </div>
                <div className="bg-paper p-3.5 rounded-2xl border border-mist/70 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Jam Keluar</p>
                    <p className="font-extrabold text-navy text-base sm:text-xl mt-0.5">
                      {attendance.clockOut ? `${attendance.clockOut} WIB` : "--:--"}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {attendance.clockOut ? "Tercatat" : "Belum absen"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BARIS 2 KANAN: KARTU CUTI */}
          <div className="order-5 md:order-4 md:col-span-5 lg:col-span-4 h-full">
            <a
              href={FORM_CUTI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-full w-full relative overflow-hidden text-left rounded-[22px] md:rounded-3xl bg-white text-navy p-5 flex flex-col justify-between border border-mist shadow-xs hover:border-brand/40 active:scale-[0.98] transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-navy">Cuti</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    Formulir
                  </span>
                </div>
                <p className="text-xs leading-relaxed my-2.5 text-slate-600">
                  Ajukan permohonan cuti resmi melalui formulir online. Formulir akan dibuka di tab baru.
                </p>
              </div>
              <span className="mt-4 bg-brand hover:bg-brand/90 text-white rounded-xl py-2.5 px-3 text-center text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5">
                Ajukan Cuti
              </span>
            </a>
          </div>

          {/* ===================================================
              BARIS 3: TINDAKAN PRESENSI (Kiri) & JADWAL & BANTUAN (Kanan)
          =================================================== */}

          {/* BARIS 3 KIRI: ACTIONS: MULAI ABSENSI / ABSEN PULANG */}
          <div className="order-3 md:order-5 md:col-span-7 lg:col-span-8 h-full">
            {attendance.clockIn && !attendance.clockOut ? (
              <div className="bg-white rounded-[22px] md:rounded-3xl p-5 sm:p-6 shadow-xs border border-mist h-full flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="font-bold text-navy text-base sm:text-lg">Absen Pulang</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Anda masuk pukul <strong>{attendance.clockIn} WIB</strong>
                    {attendance.jenis ? ` · ${LABEL_JENIS[attendance.jenis] || attendance.jenis}` : ""}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!user?.no_wa) {
                      showAlert({
                        title: "Perlu Login Ulang",
                        message: "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                        type: "warning",
                      });
                      return;
                    }
                    keAttendance(attendance.jenis || "WFO");
                  }}
                  className="w-full bg-brand hover:bg-brand/90 text-white py-3.5 sm:py-4 rounded-2xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer text-sm sm:text-base tracking-wide flex items-center justify-center gap-2"
                >
                  <span>ABSEN PULANG SEKARANG</span>
                  <FiArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : attendance.clockOut ? (
              <div className="bg-white rounded-[22px] md:rounded-3xl p-5 sm:p-6 border border-mist shadow-xs text-center h-full flex flex-col justify-center items-center">
                <div className="w-12 h-12 rounded-2xl bg-green/20 text-navy mx-auto flex items-center justify-center text-xl mb-2">
                  ✅
                </div>
                <h3 className="font-bold text-navy text-base">Absensi Hari Ini Sudah Lengkap</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Masuk pukul <strong>{attendance.clockIn}</strong> · Pulang pukul <strong>{attendance.clockOut}</strong>
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-[22px] md:rounded-3xl p-5 sm:p-6 shadow-xs border border-mist h-full flex flex-col justify-between">
                <div className="mb-3.5">
                  <h3 className="font-bold text-navy text-base">Mulai Absensi</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih lokasi penugasan Anda hari ini:
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                  {/* WFO */}
                  <button
                    onClick={() => {
                      if (!user?.no_wa) {
                        showAlert({
                          title: "Perlu Login Ulang",
                          message: "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                          type: "warning",
                        });
                        return;
                      }
                      keAttendance("WFO");
                    }}
                    className="group flex flex-col items-center text-center bg-paper hover:bg-white rounded-2xl p-3 sm:p-4 border border-mist/80 hover:border-teal/50 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal/15 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
                      🏢
                    </div>
                    <p className="font-bold text-xs sm:text-sm mt-2 text-navy">WFO</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">Di Kantor</p>
                  </button>

                  {/* WFH */}
                  <button
                    onClick={() => {
                      if (!user?.no_wa) {
                        showAlert({
                          title: "Perlu Login Ulang",
                          message: "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                          type: "warning",
                        });
                        return;
                      }
                      keAttendance("WFH");
                    }}
                    className="group flex flex-col items-center text-center bg-paper hover:bg-white rounded-2xl p-3 sm:p-4 border border-mist/80 hover:border-orange-light shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-light/25 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
                      🏠
                    </div>
                    <p className="font-bold text-xs sm:text-sm mt-2 text-navy">WFH</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">Work From Home</p>
                  </button>

                  {/* DINAS */}
                  <button
                    onClick={() => {
                      if (!user?.no_wa) {
                        showAlert({
                          title: "Perlu Login Ulang",
                          message: "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                          type: "warning",
                        });
                        return;
                      }
                      keAttendance("DINAS");
                    }}
                    className="group flex flex-col items-center text-center bg-paper hover:bg-white rounded-2xl p-3 sm:p-4 border border-mist/80 hover:border-green shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-green/20 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
                      🚗
                    </div>
                    <p className="font-bold text-xs sm:text-sm mt-2 text-navy">Dinas</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-tight">Luar Kantor</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BARIS 3 KANAN: JADWAL JAM KERJA & BANTUAN */}
          <div className="order-6 md:order-6 md:col-span-5 lg:col-span-4 h-full">
            <div className="bg-white rounded-[22px] md:rounded-3xl p-5 border border-mist shadow-xs h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🕒</span>
                  <h4 className="font-bold text-navy text-xs sm:text-sm">Jadwal Jam Kerja</h4>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 pl-6">
                  <div className="flex items-center justify-between">
                    <span>Senin–Kamis:</span>
                    <strong className="text-navy font-semibold">07.30 – 16.00 WIB</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Jumat:</span>
                    <strong className="text-navy font-semibold">07.30 – 16.30 WIB</strong>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-mist/80 my-3" />

              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">💬</span>
                  <p className="text-slate-600 truncate">
                    Butuh bantuan?
                  </p>
                </div>
                <a
                  href={`https://wa.me/${NOMOR_BOT_SISKA}?text=menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-brand hover:underline shrink-0 text-xs inline-flex items-center gap-1"
                >
                  <span>Chatbot SisKA</span>
                  <FiExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* =====================================================
          4. BOTTOM NAVIGATION (MOBILE ONLY: block md:hidden)
      ===================================================== */}
      <div className="block md:hidden">
        <BottomNav
          activeNav="attendance"
          keHome={() => {}}
          keRiwayat={keRiwayat}
          keProfile={keProfile}
          category="1"
        />
      </div>
    </div>
  );
}

export default Home;
