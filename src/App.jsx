import { useState } from "react";

import Start from "./pages/Start";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Attendance from "./pages/Attendance";
import DailyPerformance from "./pages/DailyPerformance";
import Riwayat from "./pages/History";
import Profile from "./pages/Profile";
import Rekap from "./pages/Rekap";
import { API_URL } from "./config";

// =========================================================
// SESI
// =========================================================

// localStorage bisa melempar error di mode privat sebagian
// browser, jadi setiap aksesnya dibungkus.

function bacaSesi(kunci) {
  try {
    return localStorage.getItem(kunci);
  } catch (error) {
    console.error("Gagal membaca localStorage:", error);
    return null;
  }
}

function hapusSesi() {
  try {
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userNip");
    localStorage.removeItem("userData");

    // Draf absensi harian ikut dihapus. Kalau tidak, absensi
    // pegawai sebelumnya akan terbaca oleh pegawai berikutnya
    // yang login di perangkat yang sama.
    Object.keys(localStorage)
      .filter((kunci) => kunci.startsWith("attendance_"))
      .forEach((kunci) => localStorage.removeItem(kunci));
  } catch (error) {
    console.error("Gagal menghapus localStorage:", error);
  }
}

function App() {
  // Kalau sesinya masih ada, langsung ke Home. Tanpa ini
  // pegawai dilempar ke halaman Login setiap kali halaman
  // dimuat ulang, walaupun datanya masih tersimpan.
  const [halamanAktif, setHalamanAktif] = useState(() =>
    bacaSesi("userPhone") ? "home" : "start",
  );

  const [jenisKehadiran, setJenisKehadiran] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    const yakin = window.confirm(
      "Keluar dari akun ini? Absensi yang belum dikirim akan hilang.",
    );

    if (!yakin) return;

    hapusSesi();

    setJenisKehadiran(null);
    setAttendanceData(null);
    setHalamanAktif("start");
  };

  // =========================================================
  // FINAL SUBMIT
  // CLOCK OUT + KINERJA HARIAN
  // BARU DISIMPAN KE DATABASE DI SINI
  // =========================================================
  const handleSubmitKinerja = async (teksKinerja, teksKinerjaLembur = "") => {
    try {
      console.log("=================================");
      console.log("🔴 FINAL SUBMIT ABSENSI");
      console.log("=================================");
      console.log("Kinerja:", teksKinerja);
      console.log("Attendance Data:", attendanceData);

      // =====================================================
      // VALIDASI
      // =====================================================

      if (!attendanceData) {
        alert("Data absensi tidak ditemukan.");
        return;
      }

      if (!teksKinerja || !teksKinerja.trim()) {
        alert("Silakan isi kinerja harian terlebih dahulu.");
        return;
      }

      const userPhone =
        localStorage.getItem("userPhone") ||
        attendanceData.no_wa ||
        attendanceData.noWa;

      if (!userPhone) {
        alert("Nomor WhatsApp tidak ditemukan. Silakan login kembali.");
        return;
      }

      // =====================================================
      // DATA FINAL
      // =====================================================

      const finalData = {
        no_wa: String(userPhone),

        // Tanggal Clock In-nya, bukan tanggal saat submit.
        // Kalau Clock Out dilakukan lewat tengah malam,
        // absensinya tetap masuk ke hari yang benar.
        tanggal: attendanceData.date || null,

        attendanceType: attendanceData.attendanceType || null,

        clockIn: attendanceData.clockIn || null,

        clockInPhoto: attendanceData.clockInPhoto || null,

        clockInLocation: attendanceData.clockInLocation || null,

        clockInAddress: attendanceData.clockInAddress || null,

        clockOut: attendanceData.clockOut || null,

        clockOutPhoto: attendanceData.clockOutPhoto || null,

        clockOutLocation: attendanceData.clockOutLocation || null,

        clockOutAddress: attendanceData.clockOutAddress || null,

        // FINAL KINERJA
        kinerja_harian: teksKinerja.trim(),

        // Hanya terisi untuk jabatan yang lemburnya otomatis
        // (petugas kebersihan) dan hanya kalau lemburnya genap
        // satu jam. Lihat DailyPerformance.jsx.
        kinerja_lembur: String(teksKinerjaLembur || "").trim(),
      };

      console.log("=================================");
      console.log("📦 DATA FINAL KE BACKEND");
      console.log("=================================");
      console.log(finalData);

      // =====================================================
      // VALIDASI CLOCK IN
      // =====================================================

      if (!finalData.clockIn) {
        alert("Anda belum absen masuk.");
        return;
      }

      // =====================================================
      // VALIDASI CLOCK OUT
      // =====================================================

      if (!finalData.clockOut) {
        alert("Anda belum absen keluar.");
        return;
      }

      // =====================================================
      // FINAL REQUEST
      // =====================================================

      const response = await fetch(
        `${API_URL}/api/absensi/clock-out`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(finalData),
        },
      );

      const result = await response.json();

      console.log("=================================");
      console.log("📥 RESPONSE FINAL");
      console.log("Status:", response.status);
      console.log("Data:", result);
      console.log("=================================");

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal menyimpan absen keluar dan kinerja.",
        );
      }

      // =====================================================
      // DATA BERHASIL DISIMPAN
      // =====================================================

      const savedData = result.data || {
        ...finalData,
      };

      setAttendanceData(savedData);

      // =====================================================
      // UPDATE LOCAL STORAGE
      // =====================================================

      const today = new Date();

      const year = today.getFullYear();

      const month = String(today.getMonth() + 1).padStart(2, "0");

      const day = String(today.getDate()).padStart(2, "0");

      const todayKey = `${year}-${month}-${day}`;

      localStorage.setItem(`attendance_${todayKey}`, JSON.stringify(savedData));

      // =====================================================
      // SELESAI
      // =====================================================

      console.log("=================================");
      console.log("✅ ABSENSI SELESAI");
      console.log("✅ CLOCK IN TERSIMPAN");
      console.log("✅ CLOCK OUT TERSIMPAN");
      console.log("✅ KINERJA TERSIMPAN");
      console.log("=================================");

      alert("Absensi selesai. Absen keluar dan kinerja harian berhasil disimpan.");

      setHalamanAktif("home");
    } catch (error) {
      console.error("❌ ERROR FINAL SUBMIT:", error);

      alert(error.message || "Terjadi kesalahan saat menyimpan absensi.");

      setHalamanAktif("home");
    }
  };

  return (
    <>
      {/* =====================================================
          START
      ===================================================== */}

      {halamanAktif === "start" && (
        <Start keLogin={() => setHalamanAktif("login")} />
      )}

      {/* =====================================================
          LOGIN
      ===================================================== */}

      {halamanAktif === "login" && (
        <Login
          keStart={() => setHalamanAktif("start")}
          keHome={() => setHalamanAktif("home")}
          kePilihKehadiran={() => setHalamanAktif("home")}
        />
      )}

      {/* =====================================================
          HOME
      ===================================================== */}

      {halamanAktif === "home" && (
        <Home
          keStart={() => setHalamanAktif("start")}
          keAttendance={(jenis) => {
            console.log("➡️ MASUK ATTENDANCE:", jenis);

            setJenisKehadiran(jenis);
            setHalamanAktif("attendance");
          }}
          keRiwayat={() => setHalamanAktif("riwayat")}
          keProfile={() => setHalamanAktif("profile")}
          keLogout={handleLogout}
        />
      )}

      {/* =====================================================
          RIWAYAT
      ===================================================== */}

      {halamanAktif === "riwayat" && (
        <Riwayat
          keHome={() => setHalamanAktif("home")}
          keRiwayat={() => setHalamanAktif("riwayat")}
          keProfile={() => setHalamanAktif("profile")}
        />
      )}

      {/* =====================================================
          PROFILE
      ===================================================== */}

      {halamanAktif === "profile" && (
        <Profile
          keHome={() => setHalamanAktif("home")}
          keRiwayat={() => setHalamanAktif("riwayat")}
          keProfile={() => setHalamanAktif("profile")}
          keRekap={() => setHalamanAktif("rekap")}
          keLogout={handleLogout}
        />
      )}

      {/* =====================================================
          REKAP (PETUGAS)
      ===================================================== */}

      {halamanAktif === "rekap" && (
        <Rekap keProfile={() => setHalamanAktif("profile")} />
      )}

      {/* =====================================================
          ATTENDANCE
      ===================================================== */}

      {halamanAktif === "attendance" && (
        <Attendance
          jenisKehadiran={jenisKehadiran}
          keHome={() => setHalamanAktif("home")}
          keKinerja={(data) => {
            console.log("=================================");

            console.log("➡️ CLOCK OUT SELESAI");

            console.log("➡️ MASUK KINERJA HARIAN");

            console.log("Attendance Data:", data);

            console.log("=================================");

            // SIMPAN SEMENTARA DI STATE
            setAttendanceData(data);

            // JANGAN KE DATABASE DI SINI
            setHalamanAktif("daily-performance");
          }}
        />
      )}

      {/* =====================================================
          DAILY PERFORMANCE
      ===================================================== */}

      {halamanAktif === "daily-performance" && (
        <DailyPerformance
          attendanceData={attendanceData}
          keBack={() => setHalamanAktif("home")}
          onSubmitKinerja={handleSubmitKinerja}
        />
      )}
    </>
  );
}

export default App;
