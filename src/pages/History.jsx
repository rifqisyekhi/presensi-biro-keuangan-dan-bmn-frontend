import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { API_URL, urlFoto } from "../config";

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const PILIHAN_JENIS = [
  { nilai: "SEMUA", label: "Semua" },
  { nilai: "WFO", label: "Di Kantor" },
  { nilai: "WFH", label: "Dari Rumah" },
  { nilai: "DINAS", label: "Dinas Luar" },
];

// Bulan berjalan menurut perangkat pegawai.
function bulanSekarang() {
  const now = new Date();

  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0")
  );
}

function History({ keHome, keRiwayat, keProfile }) {
  const [riwayatData, setRiwayatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);

  const [showFilter, setShowFilter] = useState(false);
  const [filterJenis, setFilterJenis] = useState("SEMUA");

  // Riwayat diambil per bulan dari server, bukan seluruhnya,
  // supaya daftarnya tidak pernah tumbuh tanpa batas.
  const [filterBulan, setFilterBulan] = useState(bulanSekarang);
  const [bulanTersedia, setBulanTersedia] = useState([]);

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


  // Pengambilan data didefinisikan di dalam effect supaya
  // tidak ada dependency yang berubah tiap render, dan supaya
  // respons yang datang terlambat bisa diabaikan — pegawai
  // bisa berganti bulan lebih cepat daripada jaringannya.
  useEffect(() => {
    let dibatalkan = false;

    const ambilRiwayat = async () => {
      try {
        setLoading(true);
        setError("");

        const userPhone = localStorage.getItem("userPhone");

        console.log("=================================");
        console.log("📋 HISTORY ABSENSI");
        console.log("userPhone:", userPhone);
        console.log("bulan:", filterBulan);
        console.log("=================================");

        const no_wa = normalizePhoneNumber(userPhone);

        if (!no_wa) {
          console.log("❌ Nomor WA tidak ditemukan");
          setError("Nomor WhatsApp tidak ditemukan.");
          return;
        }

        const url =
          `${API_URL}/api/absensi/history/${no_wa}` +
          `?bulan=${encodeURIComponent(filterBulan || "")}`;

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

        if (dibatalkan) return;

        console.log("📦 Jumlah:", result.data?.length);
        console.log("📅 Bulan tersedia:", result.bulanTersedia);

        const daftar = Array.isArray(result.bulanTersedia)
          ? result.bulanTersedia
          : [];

        setBulanTersedia(daftar);
        setRiwayatData(result.data || []);

        // Bulan ini kosong padahal ada riwayat di bulan lain:
        // langsung tampilkan bulan terbaru yang berisi, supaya
        // pegawai tidak melihat layar kosong tanpa sebab.
        const kosong = !result.data || result.data.length === 0;

        if (
          kosong &&
          daftar.length > 0 &&
          daftar[0] !== filterBulan
        ) {
          setFilterBulan(daftar[0]);
        }
      } catch (err) {
        if (dibatalkan) return;

        console.error("❌ Error history:", err);
        setError(err.message);
      } finally {
        if (!dibatalkan) {
          setLoading(false);
        }
      }
    };

    ambilRiwayat();

    return () => {
      dibatalkan = true;
    };
  }, [filterBulan]);

  const formatTanggal = (tanggal) => {
    if (!tanggal) {
      return {
        month: "-",
        date: "-",
      };
    }

    const [, month, day] = tanggal.split("-");

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

  // Helper untuk format tanggal DD/MM/YYYY di Detail Modal
  const formatDDMMYYYY = (tanggal) => {
    if (!tanggal) return "-";
    const [year, month, day] = tanggal.split("-");
    return `${day}/${month}/${year}`;
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
        color: "text-navy",
      };
    }

    if (item.clockIn) {
      return {
        text: "Sedang Bekerja",
        color: "text-brand",
      };
    }

    return {
      text: "Belum Absen",
      color: "text-navy/60",
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

  // =========================================================
  // FILTER
  // =========================================================
  const formatBulan = (nilai) => {
    if (!nilai) return "-";

    const [year, month] = nilai.split("-");

    return `${NAMA_BULAN[parseInt(month, 10) - 1] || nilai} ${year}`;
  };

  // Bulan yang bisa dipilih: yang punya data menurut server,
  // ditambah bulan ini supaya pegawai selalu bisa kembali ke
  // bulan berjalan walaupun belum ada absensi di dalamnya.
  const daftarBulan = [
    ...new Set([bulanSekarang(), ...bulanTersedia]),
  ]
    .sort()
    .reverse();

  // Data sudah dibatasi per bulan oleh server, jadi di sini
  // hanya jenis kehadiran yang difilter.
  const dataTampil = riwayatData.filter(
    (item) =>
      filterJenis === "SEMUA" ||
      item.attendanceType === filterJenis
  );

  const filterAktif = filterJenis !== "SEMUA";

  const resetFilter = () => {
    setFilterJenis("SEMUA");
    setFilterBulan(bulanSekarang());
  };

  if (loading) {
    return (
      <div className="h-screen w-full max-w-[400px] mx-auto bg-paper flex items-center justify-center">
        <p className="text-navy/60 text-sm">
          Memuat riwayat absensi...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full max-w-[400px] mx-auto bg-paper relative overflow-hidden flex flex-col font-sans text-navy shadow-xl">
      {/* HEADER */}
      <div className="flex justify-between items-center px-6 pt-10 pb-4 bg-white z-10 border-b border-mist">
        <div>
          <h1 className="text-2xl font-bold text-navy">Riwayat</h1>

          {/* Daftar dibatasi per bulan, jadi bulan yang sedang
              ditampilkan harus selalu terlihat. */}
          <p className="text-xs text-navy/60 mt-0.5">
            {formatBulan(filterBulan)}
          </p>
        </div>

        <button
          onClick={() => setShowFilter(true)}
          className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filterAktif
              ? "border-brand bg-brand text-white"
              : "border-mist text-brand"
          }`}
        >
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
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!error && dataTampil.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-navy/60 text-sm">
              {filterAktif
                ? "Tidak ada absensi yang cocok dengan filter."
                : "Belum ada riwayat absensi."}
            </p>

            {filterAktif && (
              <button
                onClick={resetFilter}
                className="mt-3 text-sm font-bold text-brand"
              >
                Hapus Filter
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {dataTampil.map((item) => {
            const tanggal = formatTanggal(item.tanggal);
            const status = getStatus(item);

            return (
              <button
                key={item._id}
                onClick={() => setSelectedItem(item)}
                className="w-full text-left bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-mist flex gap-4 transition-transform active:scale-[0.98]"
              >
                {/* TANGGAL */}
                <div className="bg-brand w-[60px] h-[64px] rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                  <span className="text-xs font-medium opacity-90">
                    {tanggal.month}
                  </span>

                  <span className="text-2xl font-bold leading-none mt-0.5">
                    {tanggal.date}
                  </span>
                </div>

                {/* DETAIL */}
                <div className="flex-1 flex flex-col justify-center relative">
                  <div className="absolute right-0 top-0 text-brand">
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

                  <h3 className="font-bold text-navy text-base mb-1.5 pr-6">
                    {getAttendanceName(item.attendanceType)}
                  </h3>

                  <div className="flex items-center text-xs mb-1">
                    <span className="text-navy/70 w-[70px]">
                      Jam Kerja
                    </span>

                    <span className="text-navy/70 mr-1">:</span>

                    <span className="font-medium text-navy">
                      {calculateWorkingTime(
                        item.clockIn,
                        item.clockOut
                      )}
                    </span>
                  </div>

                  <div className="flex items-center text-xs">
                    <span className="text-navy/70 w-[70px]">Status</span>

                    <span className="text-navy/70 mr-1">:</span>

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

      {/* FILTER MODAL */}
      {showFilter && (
        <div className="absolute inset-0 bg-black/40 z-40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85%] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-navy">
                Filter Riwayat
              </h2>

              <button
                onClick={() => setShowFilter(false)}
                className="text-navy/60 text-xl"
              >
                ✕
              </button>
            </div>

            {/* JENIS KEHADIRAN */}
            <p className="text-xs text-navy/60 mb-2">Jenis Kehadiran</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {PILIHAN_JENIS.map((pilihan) => (
                <button
                  key={pilihan.nilai}
                  onClick={() => setFilterJenis(pilihan.nilai)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    filterJenis === pilihan.nilai
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-navy border-mist"
                  }`}
                >
                  {pilihan.label}
                </button>
              ))}
            </div>

            {/* BULAN */}
            <p className="text-xs text-navy/60 mb-2">Bulan</p>


            <div className="flex flex-wrap gap-2 mb-6">
              {daftarBulan.map((bulan) => (
                <button
                  key={bulan}
                  onClick={() => setFilterBulan(bulan)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    filterBulan === bulan
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-navy border-mist"
                  }`}
                >
                  {formatBulan(bulan)}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetFilter}
                className="flex-1 border border-mist text-navy py-3 rounded-xl font-bold"
              >
                Reset
              </button>

              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 bg-brand text-white py-3 rounded-xl font-bold"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="absolute inset-0 bg-black/40 z-30 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85%] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-navy">
                Detail Absensi
              </h2>

              <button
                onClick={() => setSelectedItem(null)}
                className="text-navy/60 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* JENIS */}
              <div>
                <p className="text-xs text-navy/60">Jenis Kehadiran</p>

                <p className="font-bold text-navy">
                  {getAttendanceName(selectedItem.attendanceType)}
                </p>
              </div>

              {/* TANGGAL - Menggunakan format DD/MM/YYYY */}
              <div>
                <p className="text-xs text-navy/60">Tanggal</p>

                <p className="font-medium text-navy">
                  {formatDDMMYYYY(selectedItem.tanggal)}
                </p>
              </div>

              {/* JAM */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-navy/60">Jam Masuk</p>

                  <p className="font-bold text-navy">
                    {selectedItem.clockIn || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-navy/60">Jam Keluar</p>

                  <p className="font-bold text-navy">
                    {selectedItem.clockOut || "-"}
                  </p>
                </div>
              </div>

              {/* KINERJA - Menggunakan text-justify */}
              <div>
                <p className="text-xs text-navy/60 mb-1">
                  Kinerja Harian
                </p>

                <div className="bg-mist rounded-xl p-3">
                  <p className="text-sm text-navy text-justify">
                    {selectedItem.kinerjaHarian ||
                      selectedItem.kinerja_harian ||
                      "Tidak ada keterangan kinerja harian."}
                  </p>
                </div>
              </div>

              {/* KINERJA LEMBUR — hanya untuk jabatan yang
                  lemburnya otomatis, jadi biasanya kosong */}
              {selectedItem.kinerja_lembur && (
                <div>
                  <p className="text-xs text-navy/60 mb-1">Kinerja Lembur</p>

                  <div className="bg-mist rounded-xl p-3">
                    <p className="text-sm text-navy text-justify">
                      {selectedItem.kinerja_lembur}
                    </p>
                  </div>
                </div>
              )}

              {/* LOKASI MASUK */}
              <div>
                <p className="text-xs text-navy/60 mb-1">
                  Lokasi Absen Masuk
                </p>

                <p className="text-sm text-navy">
                  {selectedItem.clockInAddress || "-"}
                </p>
              </div>

              {/* LOKASI KELUAR */}
              <div>
                <p className="text-xs text-navy/60 mb-1">
                  Lokasi Absen Keluar
                </p>

                <p className="text-sm text-navy">
                  {selectedItem.clockOutAddress || "-"}
                </p>
              </div>

              {/* FOTO */}
              <div>
                <p className="text-xs text-navy/60 mb-2">
                  Foto Absensi
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {selectedItem.clockInPhoto && (
                    <div>
                      <p className="text-xs text-navy/70 mb-1">
                        Jam Masuk
                      </p>

                      <img
                        src={urlFoto(selectedItem.clockInPhoto)}
                        alt="Foto absen masuk"
                        className="w-full h-36 object-cover rounded-xl"
                      />
                    </div>
                  )}

                  {selectedItem.clockOutPhoto && (
                    <div>
                      <p className="text-xs text-navy/70 mb-1">
                        Jam Keluar
                      </p>

                      <img
                        src={urlFoto(selectedItem.clockOutPhoto)}
                        alt="Foto absen keluar"
                        className="w-full h-36 object-cover rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full mt-6 bg-brand text-white py-3 rounded-xl font-bold"
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