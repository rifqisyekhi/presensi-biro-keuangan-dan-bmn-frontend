import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";

function History({ keHome, keRiwayat, keProfile }) {
  const [riwayatData, setRiwayatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const normalizePhoneNumber = (value) => {
    if (!value) return "";

    let digits = String(value)
      .trim()
      .replace(/\D/g, "");

    if (!digits) return "";

    if (digits.startsWith("0")) {
      digits = "62" + digits.slice(1);
    }

    if (!digits.startsWith("62")) {
      digits = "62" + digits;
    }

    return digits;
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");

      // Ambil nomor WA dari localStorage
      const userPhone = localStorage.getItem("userPhone");

      console.log("=================================");
      console.log("📋 HISTORY ABSENSI");
      console.log("userPhone:", userPhone);
      console.log("=================================");

      const no_wa = normalizePhoneNumber(userPhone);

      if (!no_wa) {
        console.log("❌ Nomor WA tidak ditemukan");
        setError("Nomor WhatsApp tidak ditemukan.");
        return;
      }

      const url = `http://localhost:5000/api/absensi/history/${no_wa}`;

      console.log("📡 GET HISTORY:", url);

      const response = await fetch(url);

      console.log(
        "📥 Response:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        throw new Error("Gagal mengambil riwayat absensi.");
      }

      const result = await response.json();

      console.log("📦 DATA HISTORY:", JSON.stringify(result, null, 2));
      console.log("result.data:", result.data);
      console.log("Array?", Array.isArray(result.data));

      setRiwayatData(result.data || []);
    } catch (err) {
      console.error("❌ Error history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) {
      return {
        month: "-",
        date: "-",
      };
    }

    const [year, month, day] = tanggal.split("-");

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return {
      month: monthNames[parseInt(month, 10) - 1] || "-",
      date: day,
    };
  };

  const getAttendanceName = (type) => {
    switch (type) {
      case "WFO":
        return "Bekerja di Kantor";

      case "WFH":
        return "Bekerja dari Rumah";

      case "DINAS":
        return "Dinas Luar";

      default:
        return type || "-";
    }
  };

  const getStatus = (item) => {
    if (item.clockOut) {
      return {
        text: "Selesai",
        color: "text-[#6CC220]",
      };
    }

    if (item.clockIn) {
      return {
        text: "Sedang Bekerja",
        color: "text-[#F0592A]",
      };
    }

    return {
      text: "Belum Absen",
      color: "text-gray-400",
    };
  };

  const calculateWorkingTime = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) {
      return "-";
    }

    const parseTime = (time) => {
      const [hour, minute] = time.split(".").map(Number);

      return hour * 60 + minute;
    };

    const start = parseTime(clockIn);
    const end = parseTime(clockOut);

    let difference = end - start;

    if (difference < 0) {
      difference += 24 * 60;
    }

    const hours = Math.floor(difference / 60);
    const minutes = difference % 60;

    return `${hours} jam ${minutes} menit`;
  };

  if (loading) {
    return (
      <div className="h-screen w-full max-w-[400px] mx-auto bg-[#F9FAFB] flex items-center justify-center">
        <p className="text-gray-400 text-sm">
          Memuat riwayat absensi...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full max-w-[400px] mx-auto bg-[#F9FAFB] relative overflow-hidden flex flex-col font-sans text-gray-800 shadow-xl">

      {/* HEADER */}
      <div className="flex justify-between items-center px-6 pt-10 pb-4 bg-white z-10 border-b border-gray-50">
        <h1 className="text-2xl font-bold text-gray-700">
          Riwayat
        </h1>

        <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-[#00AEEF]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>

          Filter
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24">

        {error && (
          <div className="text-center mt-10 px-5">
            <p className="text-red-400 text-sm">
              {error}
            </p>
          </div>
        )}

        {!error && riwayatData.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-gray-400 text-sm">
              Belum ada riwayat absensi.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">

          {riwayatData.map((item) => {
            const tanggal = formatTanggal(item.tanggal);
            const status = getStatus(item);

            return (
              <button
                key={item._id}
                onClick={() => setSelectedItem(item)}
                className="w-full text-left bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex gap-4 transition-transform active:scale-[0.98]"
              >

                {/* TANGGAL */}
                <div className="bg-[#F5B026] w-[60px] h-[64px] rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                  <span className="text-xs font-medium opacity-90">
                    {tanggal.month}
                  </span>

                  <span className="text-2xl font-bold leading-none mt-0.5">
                    {tanggal.date}
                  </span>
                </div>

                {/* DETAIL */}
                <div className="flex-1 flex flex-col justify-center relative">

                  <div className="absolute right-0 top-0 text-[#00AEEF]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>

                  <h3 className="font-bold text-gray-700 text-base mb-1.5 pr-6">
                    {getAttendanceName(item.attendanceType)}
                  </h3>

                  <div className="flex items-center text-xs mb-1">
                    <span className="text-gray-500 w-[70px]">
                      Jam Kerja
                    </span>

                    <span className="text-gray-500 mr-1">
                      :
                    </span>

                    <span className="font-medium text-gray-700">
                      {calculateWorkingTime(
                        item.clockIn,
                        item.clockOut
                      )}
                    </span>
                  </div>

                  <div className="flex items-center text-xs">
                    <span className="text-gray-500 w-[70px]">
                      Status
                    </span>

                    <span className="text-gray-500 mr-1">
                      :
                    </span>

                    <span className={`font-bold ${status.color}`}>
                      {status.text}
                    </span>
                  </div>

                </div>

              </button>
            );
          })}

        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="absolute inset-0 bg-black/40 z-30 flex items-end">

          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85%] overflow-y-auto">

            <div className="flex justify-between items-center mb-5">

              <h2 className="text-xl font-bold text-gray-700">
                Detail Absensi
              </h2>

              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 text-xl"
              >
                ✕
              </button>

            </div>

            <div className="space-y-4">

              {/* JENIS */}
              <div>
                <p className="text-xs text-gray-400">
                  Jenis Kehadiran
                </p>

                <p className="font-bold text-gray-700">
                  {getAttendanceName(
                    selectedItem.attendanceType
                  )}
                </p>
              </div>

              {/* TANGGAL */}
              <div>
                <p className="text-xs text-gray-400">
                  Tanggal
                </p>

                <p className="font-medium text-gray-700">
                  {selectedItem.tanggal}
                </p>
              </div>

              {/* JAM */}
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <p className="text-xs text-gray-400">
                    Jam Masuk
                  </p>

                  <p className="font-bold text-gray-700">
                    {selectedItem.clockIn || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Jam Keluar
                  </p>

                  <p className="font-bold text-gray-700">
                    {selectedItem.clockOut || "-"}
                  </p>
                </div>

              </div>

              {/* KINERJA */}
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Kinerja Harian
                </p>

                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-700">
                    {selectedItem.kinerjaHarian ||
                      selectedItem.kinerja_harian ||
                      "Tidak ada keterangan kinerja harian."}
                  </p>
                </div>
              </div>

              {/* LOKASI MASUK */}
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Lokasi Clock In
                </p>

                <p className="text-sm text-gray-700">
                  {selectedItem.clockInAddress || "-"}
                </p>
              </div>

              {/* LOKASI KELUAR */}
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Lokasi Clock Out
                </p>

                <p className="text-sm text-gray-700">
                  {selectedItem.clockOutAddress || "-"}
                </p>
              </div>

              {/* FOTO */}
              <div>
                <p className="text-xs text-gray-400 mb-2">
                  Foto Absensi
                </p>

                <div className="grid grid-cols-2 gap-3">

                  {selectedItem.clockInPhoto && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Clock In
                      </p>

                      <img
                        src={selectedItem.clockInPhoto}
                        alt="Clock In"
                        className="w-full h-36 object-cover rounded-xl"
                      />
                    </div>
                  )}

                  {selectedItem.clockOutPhoto && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Clock Out
                      </p>

                      <img
                        src={selectedItem.clockOutPhoto}
                        alt="Clock Out"
                        className="w-full h-36 object-cover rounded-xl"
                      />
                    </div>
                  )}

                </div>
              </div>

            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full mt-6 bg-[#00AEEF] text-white py-3 rounded-xl font-bold"
            >
              Tutup
            </button>

          </div>

        </div>
      )}

      {/* BOTTOM NAV */}
      <BottomNav
        activeNav="history"
        keHome={keHome}
        keRiwayat={keRiwayat}
        keProfile={keProfile}
      />

    </div>
  );
}

export default History;