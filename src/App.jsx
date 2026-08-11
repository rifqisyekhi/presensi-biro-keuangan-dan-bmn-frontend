import { useState } from "react";

import Start from "./pages/Start";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Attendance from "./pages/Attendance";
import DailyPerformance from "./pages/DailyPerformance";
import Riwayat from "./pages/History";
import Profile from "./pages/Profile";

function App() {
  const [halamanAktif, setHalamanAktif] = useState("start");
  const [jenisKehadiran, setJenisKehadiran] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  // =========================================================
  // FINAL SUBMIT
  // CLOCK OUT + KINERJA HARIAN
  // BARU DISIMPAN KE DATABASE DI SINI
  // =========================================================
  const handleSubmitKinerja = async (teksKinerja) => {
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
      };

      console.log("=================================");
      console.log("📦 DATA FINAL KE BACKEND");
      console.log("=================================");
      console.log(finalData);

      // =====================================================
      // VALIDASI CLOCK IN
      // =====================================================

      if (!finalData.clockIn) {
        alert("Clock In belum dilakukan.");
        return;
      }

      // =====================================================
      // VALIDASI CLOCK OUT
      // =====================================================

      if (!finalData.clockOut) {
        alert("Clock Out belum dilakukan.");
        return;
      }

      // =====================================================
      // FINAL REQUEST
      // =====================================================

      const response = await fetch(
        "http://localhost:5000/api/absensi/clock-out",
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
          result.message || "Gagal menyimpan Clock Out dan kinerja.",
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

      alert("Absensi selesai. Clock Out dan kinerja harian berhasil disimpan.");

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
        />
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
