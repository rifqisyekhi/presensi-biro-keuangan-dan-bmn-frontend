import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";

const API_URL = "http://localhost:5000";

function Home({ keAttendance, keRiwayat, keProfile }) {
  const [user, setUser] = useState(null);

  const [attendance, setAttendance] = useState({
    status: "Belum Absen",
    clockIn: null,
    clockOut: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

        if (profileData.nip) {
          try {
            const todayResponse = await fetch(
              `${API_URL}/api/absensi/today/${encodeURIComponent(
                profileData.nip,
              )}`,
            );

            console.log("📡 GET ABSENSI HARI INI:", todayResponse.status);

            if (todayResponse.ok) {
              const todayData = await todayResponse.json();

              console.log("✅ ABSENSI HARI INI:", todayData);

              setAttendance({
                status:
                  todayData.status_absen === "clock_out"
                    ? "Sudah Clock Out"
                    : todayData.status_absen === "clock_in"
                      ? "Sudah Clock In"
                      : "Belum Absen",

                clockIn: todayData.jam_checkin || null,
                clockOut: todayData.jam_checkout || null,
              });
            } else if (todayResponse.status === 404) {
              console.log("ℹ️ Belum ada absensi hari ini");

              setAttendance({
                status: "Belum Absen",
                clockIn: null,
                clockOut: null,
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
                ? "Sudah Clock Out"
                : current.clockIn
                  ? "Sudah Clock In"
                  : parsed.clockOut
                    ? "Sudah Clock Out"
                    : parsed.clockIn
                      ? "Sudah Clock In"
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
  // TODAY
  // =========================================================

  function getTodayKey() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (isLoading) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F7F9FC] flex items-center justify-center font-sans text-gray-800">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B84F5]" />
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F7F9FC] flex flex-col items-center justify-center font-sans text-gray-800 px-6">
        <p className="text-red-500 font-bold mb-2">Terjadi Kesalahan</p>

        <p className="text-gray-500 text-sm text-center mb-4">{error}</p>

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-[#5B84F5] text-white font-semibold"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F7F9FC] font-sans text-gray-800 relative overflow-x-hidden">
      {/* HEADER */}

      <header className="bg-white px-6 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Selamat datang,</p>

            <h1 className="text-2xl font-bold text-gray-800">
              {user?.nama || "Pegawai"}
            </h1>
          </div>

          <button className="w-11 h-11 rounded-full bg-[#EEF3FF] flex items-center justify-center">
            <svg
              className="w-6 h-6 text-[#5B84F5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.5-2v-5a6.5 6.5 0 00-13 0v5L4 17h5m6 0a3 3 0 01-6 0"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* PROFILE */}

      <section className="px-5">
        <div className="relative overflow-hidden rounded-[28px] bg-[#5B84F5] p-5 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />

          <div className="absolute -right-5 bottom-[-45px] w-36 h-36 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-4">
            <div className="w-[64px] h-[64px] rounded-full bg-white/20 border-2 border-white/70 overflow-hidden shrink-0">
              <img
                src={user?.foto_profil || "https://i.pravatar.cc/150?img=11"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <h2 className="font-bold text-lg truncate">
                {user?.nama || "Pengguna"}
              </h2>

              <p className="text-sm text-blue-100 mt-0.5">{user?.nip || "-"}</p>

              <div className="flex items-center gap-1.5 mt-1.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                  />
                </svg>

                <span className="text-xs text-blue-100">
                  {user?.jabatan || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-100">Status Kehadiran</p>

              <p className="font-semibold mt-1">{attendance.status}</p>
            </div>

            <div className="px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-300" />

                <span className="text-xs font-semibold">
                  {attendance.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY */}

      <section className="px-5 mt-5">
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Hari ini</p>

              <h2 className="font-bold text-gray-800 mt-1">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-400">Jam</p>

              <p className="font-bold text-[#5B84F5]">
                {new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-[#F5F7FB] rounded-2xl p-3">
              <p className="text-xs text-gray-400">Clock In</p>

              <p className="font-bold text-gray-700 mt-1">
                {attendance.clockIn || "--:--"}
              </p>
            </div>

            <div className="bg-[#F5F7FB] rounded-2xl p-3">
              <p className="text-xs text-gray-400">Clock Out</p>

              <p className="font-bold text-gray-700 mt-1">
                {attendance.clockOut || "--:--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ATTENDANCE TYPE */}

      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Mulai Absensi</h2>

            <p className="text-xs text-gray-400 mt-0.5">
              Pilih lokasi kerja hari ini
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              console.log("➡️ Masuk Attendance WFH");

              if (!user?.no_wa) {
                alert(
                  "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                );
                return;
              }

              keAttendance("WFH");
            }}
            className="group bg-white rounded-[22px] p-4 shadow-sm border border-gray-100 text-left active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E8F7FF] flex items-center justify-center text-[#16A9E8]">
              <span className="text-xl">🏠</span>
            </div>

            <p className="font-bold text-sm mt-3">WFH</p>

            <p className="text-[11px] text-gray-400 mt-1">Bekerja Remote</p>
          </button>

          <button
            onClick={() => {
              console.log("➡️ Masuk Attendance WFO");

              if (!user?.no_wa) {
                alert(
                  "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                );
                return;
              }

              keAttendance("WFO");
            }}
            className="group bg-white rounded-[22px] p-4 shadow-sm border border-gray-100 text-left active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FFF4D9] flex items-center justify-center text-[#F5B800]">
              <span className="text-xl">🏢</span>
            </div>

            <p className="font-bold text-sm mt-3">WFO</p>

            <p className="text-[11px] text-gray-400 mt-1">Di Kantor</p>
          </button>

          <button
            onClick={() => {
              console.log("➡️ Masuk Attendance DINAS");

              if (!user?.no_wa) {
                alert(
                  "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                );
                return;
              }

              keAttendance("DINAS");
            }}
            className="group bg-white rounded-[22px] p-4 shadow-sm border border-gray-100 text-left active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0EB] flex items-center justify-center text-[#F45B35]">
              <span className="text-xl">🚗</span>
            </div>

            <p className="font-bold text-sm mt-3">Dinas</p>

            <p className="text-[11px] text-gray-400 mt-1">Dinas Keluar</p>
          </button>
        </div>
      </section>

      {/* FEATURE */}

      <section className="px-5 mt-6 pb-28">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => alert("Fitur lembur belum tersedia.")}
            className="relative overflow-hidden text-left rounded-[25px] bg-[#65D600] text-white p-5 min-h-[190px] shadow-sm active:scale-[0.98] transition-all"
          >
            <h2 className="text-xl font-bold relative">Lembur</h2>

            <p className="text-xs leading-relaxed mt-3 text-white/90 relative">
              Isi form pengajuan lembur dan permintaan akan diperiksa oleh
              atasan.
            </p>

            <span className="absolute bottom-5 left-5 right-5 bg-white text-[#57B800] rounded-full py-2.5 text-center text-xs font-bold">
              MULAI LEMBUR
            </span>
          </button>

          <button
            onClick={() => alert("Fitur izin belum tersedia.")}
            className="relative overflow-hidden text-left rounded-[25px] bg-[#16A6B8] text-white p-5 min-h-[190px] shadow-sm active:scale-[0.98] transition-all"
          >
            <h2 className="text-xl font-bold relative">Izin</h2>

            <p className="text-xs leading-relaxed mt-3 text-white/90 relative">
              Isi form izin dan permintaan akan dikirim untuk persetujuan.
            </p>

            <span className="absolute bottom-5 left-5 right-5 bg-white text-[#1494A4] rounded-full py-2.5 text-center text-xs font-bold">
              AJUKAN IZIN
            </span>
          </button>
        </div>
      </section>

      <BottomNav
        activeNav="attendance"
        keHome={() => {}}
        keRiwayat={keRiwayat}
        keProfile={keProfile}
      />
    </div>
  );
}

export default Home;
