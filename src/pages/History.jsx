import { useEffect, useState } from "react";
import { FiFilter, FiChevronRight } from "react-icons/fi";
import BottomNav from "../components/BottomNav";
import logoKemnaker from "../assets/logo-kemnaker.png";
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
  { nilai: "WFO", label: "WFO" },
  { nilai: "WFH", label: "WFH" },
  { nilai: "DINAS", label: "Dinas Luar" },
  { nilai: "CUTI", label: "Cuti" },
  { nilai: "IZIN", label: "Izin" },
  { nilai: "ALPHA", label: "Alpha" },
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

function History({ keHome, keRiwayat, keProfile, keRekap, keLogout }) {
  const [riwayatData, setRiwayatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalFotoZoom, setModalFotoZoom] = useState(null);

  const [showFilterMobile, setShowFilterMobile] = useState(false);
  const [filterJenis, setFilterJenis] = useState("SEMUA");

  // Riwayat diambil per bulan dari server
  const [filterBulan, setFilterBulan] = useState(bulanSekarang);
  const [bulanTersedia, setBulanTersedia] = useState([]);

  // Hak akses petugas untuk menampilkan menu rekap di navbar desktop
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

  useEffect(() => {
    let dibatalkan = false;

    const ambilRiwayat = async () => {
      try {
        setLoading(true);
        setError("");

        const userPhone = localStorage.getItem("userPhone");
        const no_wa = normalizePhoneNumber(userPhone);

        if (!no_wa) {
          setError("Nomor WhatsApp tidak ditemukan. Silakan login kembali.");
          return;
        }

        const url =
          `${API_URL}/api/absensi/history/${no_wa}` +
          `?bulan=${encodeURIComponent(filterBulan || "")}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Gagal mengambil riwayat absensi.");
        }

        const result = await response.json();

        if (dibatalkan) return;

        const daftar = Array.isArray(result.bulanTersedia)
          ? result.bulanTersedia
          : [];

        setBulanTersedia(daftar);
        const dataList = result.data || [];
        setRiwayatData(dataList);

        // Auto-select item pertama jika di desktop
        if (window.innerWidth >= 768 && dataList.length > 0) {
          setSelectedItem(dataList[0]);
        }

        // Jika bulan ini kosong tapi ada bulan lain yang berisi, arahkan ke bulan terbaru
        const kosong = !dataList || dataList.length === 0;
        if (kosong && daftar.length > 0 && daftar[0] !== filterBulan) {
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
        full: "-",
      };
    }

    const [year, month, day] = tanggal.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    return {
      month: monthNames[parseInt(month, 10) - 1] || "-",
      date: day,
      year: year,
    };
  };

  const formatDDMMYYYY = (tanggal) => {
    if (!tanggal) return "-";
    const [year, month, day] = tanggal.split("-");
    return `${day}/${month}/${year}`;
  };

  const getAttendanceName = (type) => {
    switch (type) {
      case "WFO":
        return "WFO";
      case "WFH":
        return "WFH";
      case "DINAS":
        return "Dinas Luar";
      case "CUTI":
        return "Cuti";
      case "IZIN":
        return "Izin";
      case "ALPHA":
        return "Alpha";
      default:
        return type || "-";
    }
  };

  const getAttendanceBadge = (type) => {
    switch (type) {
      case "WFO":
        return "bg-teal/15 text-[#00897b] border border-teal/30";
      case "WFH":
        return "bg-orange-light/20 text-[#a06800] border border-orange-light/40";
      case "DINAS":
        return "bg-green/20 text-[#527926] border border-green/40";
      case "CUTI":
      case "IZIN":
        return "bg-yellow/25 text-[#856404] border border-yellow/50";
      case "ALPHA":
        return "bg-red-50 text-red-600 border border-red-200";
      default:
        return "bg-brand/10 text-brand border border-brand/20";
    }
  };

  const getStatus = (item) => {
    if (item.attendanceType === "ALPHA") {
      return {
        text: "Alpha",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    }

    if (item.attendanceType === "CUTI" || item.attendanceType === "IZIN") {
      return {
        text: item.attendanceType === "CUTI" ? "Cuti" : "Izin",
        color: "text-[#856404]",
        bg: "bg-yellow/25",
        border: "border-yellow/50",
      };
    }

    if (item.clockOut) {
      return {
        text: "Selesai",
        color: "text-[#527926]",
        bg: "bg-green/15",
        border: "border-green/40",
      };
    }

    if (item.clockIn) {
      return {
        text: "Sedang Bekerja",
        color: "text-[#856404]",
        bg: "bg-yellow/25",
        border: "border-yellow/50",
      };
    }

    return {
      text: "Belum Absen",
      color: "text-navy/60",
      bg: "bg-paper",
      border: "border-mist",
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

  const formatBulan = (nilai) => {
    if (!nilai) return "-";
    const [year, month] = nilai.split("-");
    return `${NAMA_BULAN[parseInt(month, 10) - 1] || nilai} ${year}`;
  };

  const daftarBulan = [
    ...new Set([bulanSekarang(), ...bulanTersedia]),
  ]
    .sort()
    .reverse();

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

  // Pilih item saat diklik
  const handlePilihItem = (item) => {
    setSelectedItem(item);
  };

  // Pastikan ada item terpilih di desktop saat filter atau bulan berganti
  useEffect(() => {
    if (dataTampil.length > 0) {
      if (!selectedItem || !dataTampil.some((it) => it._id === selectedItem._id)) {
        setSelectedItem(dataTampil[0]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [filterJenis, filterBulan, riwayatData]);

  // =========================================================
  // RENDER LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-paper flex flex-col font-sans text-navy">
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
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mb-3" />
          <p className="text-navy/70 text-sm font-medium">Memuat riwayat absensi...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER UTAMA
  // =========================================================
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
            <button
              onClick={keHome}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
            >
              Beranda
            </button>
            <button
              onClick={() => {}}
              className="px-3.5 py-2 rounded-xl bg-brand text-white font-bold shadow-xs cursor-pointer"
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
              <button
                onClick={keRekap}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Rekap Absensi</span>
                <span className="bg-brand/10 text-brand text-[10px] font-bold px-1.5 py-0.2 rounded-sm uppercase">Petugas</span>
              </button>
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
          2. MOBILE HEADER (block md:hidden)
      ===================================================== */}
      <header className="block md:hidden bg-white px-5 pt-8 pb-3.5 border-b border-mist/80 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-navy">Riwayat Absensi</h1>
            <p className="text-xs text-navy/60 mt-0.5 font-medium">
              Periode: {formatBulan(filterBulan)}
            </p>
          </div>

          <button
            onClick={() => setShowFilterMobile(true)}
            className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
              filterAktif
                ? "border-brand bg-brand text-white"
                : "border-mist bg-white text-navy hover:bg-slate-50"
            }`}
          >
            <FiFilter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {filterAktif && (
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================
          3. MAIN CONTENT CONTAINER (Responsive Mobile / Desktop)
      ===================================================== */}
      <main className="w-full max-w-[430px] md:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-8 flex-1 flex flex-col pb-24 md:pb-8">
        
        {/* ============ DESKTOP FILTER TOOLBAR ============ */}
        <div className="hidden md:flex items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-mist shadow-xs mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Dropdown Bulan */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Bulan:</span>
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="bg-paper border border-mist rounded-xl px-3 py-1.5 text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                {daftarBulan.map((bulan) => (
                  <option key={bulan} value={bulan}>
                    {formatBulan(bulan)}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-px h-5 bg-mist mx-1" />

            {/* Filter Pills Jenis */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1">Tipe:</span>
              {PILIHAN_JENIS.map((pilihan) => (
                <button
                  key={pilihan.nilai}
                  onClick={() => setFilterJenis(pilihan.nilai)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterJenis === pilihan.nilai
                      ? "bg-brand text-white shadow-xs"
                      : "bg-paper text-slate-600 hover:bg-slate-200/70 border border-mist/70"
                  }`}
                >
                  {pilihan.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Ditemukan: <strong className="text-navy">{dataTampil.length}</strong> kehadiran
            </span>
            {filterAktif && (
              <button
                onClick={resetFilter}
                className="text-xs font-bold text-brand hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* ============ ALERT ERROR ============ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs sm:text-sm mb-4">
            {error}
          </div>
        )}

        {/* ============ DATA KOSONG ============ */}
        {!error && dataTampil.length === 0 && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-mist shadow-xs my-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-3">
              📋
            </div>
            <h3 className="font-bold text-navy text-base">Tidak Ada Riwayat Absensi</h3>
            <p className="text-xs text-navy/60 mt-1 max-w-sm mx-auto">
              {filterAktif
                ? "Tidak ada data absensi yang sesuai dengan kriteria filter yang Anda pilih."
                : `Belum ada catatan absensi untuk periode ${formatBulan(filterBulan)}.`}
            </p>
            {filterAktif && (
              <button
                onClick={resetFilter}
                className="mt-4 px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-xs hover:bg-brand/90 transition-all cursor-pointer"
              >
                Hapus Filter
              </button>
            )}
          </div>
        )}

        {/* ============ SPLIT VIEW (DESKTOP) & LIST (MOBILE) ============ */}
        {dataTampil.length > 0 && (
          <div className="flex flex-col md:grid md:grid-cols-12 md:gap-5 items-stretch flex-1">
            
            {/* KOLOM KIRI: DAFTAR KARTU RIWAYAT */}
            <div className="w-full md:col-span-6 lg:col-span-7 flex flex-col md:h-[680px]">
              <div className="md:bg-white md:rounded-3xl md:border md:border-mist md:shadow-xs md:p-5 flex flex-col md:h-full">
                {/* DESKTOP LIST HEADER */}
                <div className="hidden md:flex items-center justify-between pb-3.5 border-b border-mist/80 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-navy">Daftar Kehadiran</h2>
                    <span className="text-[11px] font-semibold text-slate-500 bg-paper px-2.5 py-0.5 rounded-full border border-mist/70">
                      {formatBulan(filterBulan)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
                    {dataTampil.length} Hari
                  </span>
                </div>

                {/* SCROLLABLE LIST */}
                <div className="flex flex-col gap-3 md:gap-2.5 md:flex-1 md:overflow-y-auto md:pr-1.5 custom-scrollbar">
                  {dataTampil.map((item) => {
                    const tanggal = formatTanggal(item.tanggal);
                    const status = getStatus(item);
                    const isSelected = selectedItem?._id === item._id;

                    return (
                      <button
                        key={item._id}
                        onClick={() => handlePilihItem(item)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex gap-3.5 sm:gap-4 items-center ${
                          isSelected
                            ? "border-brand ring-2 ring-brand/20 bg-blue-50/40 shadow-xs"
                            : "border-mist/80 bg-white md:bg-paper/40 hover:bg-slate-100/70 hover:border-brand/40 shadow-2xs"
                        }`}
                      >
                        {/* TANGGAL BLOCK */}
                        <div className="bg-brand w-[56px] h-[58px] sm:w-[60px] sm:h-[62px] rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                          <span className="text-[10px] sm:text-[11px] font-semibold opacity-90 uppercase tracking-wider">
                            {tanggal.month}
                          </span>
                          <span className="text-xl sm:text-2xl font-black leading-none mt-0.5">
                            {tanggal.date}
                          </span>
                        </div>

                        {/* DETAIL SINGKAT */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-bold text-navy text-sm sm:text-base truncate">
                                {getAttendanceName(item.attendanceType)}
                              </span>
                              <span className="text-[11px] text-slate-400 hidden sm:inline">
                                • {formatDDMMYYYY(item.tanggal)}
                              </span>
                            </div>

                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${status.bg} ${status.color} ${status.border}`}>
                              {status.text}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-navy">
                                {item.clockIn || "--:--"}
                              </span>
                              <span className="text-slate-300">→</span>
                              <span className="font-semibold text-navy">
                                {item.clockOut || "--:--"}
                              </span>
                            </div>

                            <span className="text-[11px] font-semibold text-brand truncate">
                              {calculateWorkingTime(item.clockIn, item.clockOut)}
                            </span>
                          </div>
                        </div>

                        {/* ARROW ICON */}
                        <div className="text-slate-400 shrink-0 hidden sm:block">
                          <FiChevronRight className="h-4 w-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: STICKY DETAIL PANEL (DESKTOP ONLY) */}
            <div className="hidden md:block md:col-span-6 lg:col-span-5 md:h-[680px]">
              {selectedItem ? (
                <div className="bg-white rounded-3xl p-5 lg:p-6 border border-mist shadow-xs flex flex-col justify-between h-full overflow-hidden">
                  {/* HEADER */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-mist/80 shrink-0">
                    <div>
                      <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                        Detail Absensi
                      </span>
                      <h2 className="text-lg font-bold text-navy mt-0.5">
                        {formatDDMMYYYY(selectedItem.tanggal)}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getAttendanceBadge(selectedItem.attendanceType)}`}>
                        {getAttendanceName(selectedItem.attendanceType)}
                      </span>
                      {(() => {
                        const st = getStatus(selectedItem);
                        return (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.color} ${st.border}`}>
                            {st.text}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* SCROLLABLE DETAIL BODY */}
                  <div className="flex-1 overflow-y-auto pr-1 my-3 custom-scrollbar space-y-3.5">
                    {/* JAM KERJA STATS */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-paper p-3 rounded-2xl border border-mist/70">
                        <p className="text-[11px] font-semibold text-slate-500">Jam Masuk</p>
                        <p className="text-base font-extrabold text-navy mt-0.5">
                          {selectedItem.clockIn ? `${selectedItem.clockIn} WIB` : "--:--"}
                        </p>
                      </div>
                      <div className="bg-paper p-3 rounded-2xl border border-mist/70">
                        <p className="text-[11px] font-semibold text-slate-500">Jam Keluar</p>
                        <p className="text-base font-extrabold text-navy mt-0.5">
                          {selectedItem.clockOut ? `${selectedItem.clockOut} WIB` : "--:--"}
                        </p>
                      </div>
                    </div>

                    {/* TOTAL JAM KERJA */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs">
                      <span className="text-slate-600 font-medium">Durasi Kerja:</span>
                      <span className="font-bold text-brand">
                        {calculateWorkingTime(selectedItem.clockIn, selectedItem.clockOut)}
                      </span>
                    </div>

                    {/* KINERJA HARIAN */}
                    <div>
                      <h3 className="text-xs font-bold text-navy mb-1.5">
                        Kinerja Harian
                      </h3>
                      <div className="bg-paper rounded-2xl p-3 border border-mist/70 max-h-32 overflow-y-auto">
                        <p className="text-xs text-navy leading-relaxed whitespace-pre-line text-justify">
                          {selectedItem.kinerjaHarian ||
                            selectedItem.kinerja_harian ||
                            "Tidak ada catatan kinerja harian."}
                        </p>
                      </div>
                    </div>

                    {/* KINERJA LEMBUR (JIKA ADA) */}
                    {selectedItem.kinerja_lembur && (
                      <div>
                        <h3 className="text-xs font-bold text-amber-900 mb-1.5">
                          Kinerja Lembur
                        </h3>
                        <div className="bg-amber-50/60 rounded-2xl p-3 border border-amber-200/60 max-h-28 overflow-y-auto">
                          <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line text-justify">
                            {selectedItem.kinerja_lembur}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* LOKASI */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">Lokasi Masuk</p>
                        <p className="text-navy font-medium mt-0.5 line-clamp-2">
                          {selectedItem.clockInAddress || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">Lokasi Keluar</p>
                        <p className="text-navy font-medium mt-0.5 line-clamp-2">
                          {selectedItem.clockOutAddress || "-"}
                        </p>
                      </div>
                    </div>

                    {/* FOTO PREVIEW */}
                    {(selectedItem.clockInPhoto || selectedItem.clockOutPhoto) && (
                      <div className="pt-2 border-t border-mist/70">
                        <p className="text-[11px] font-semibold text-slate-500 mb-2">
                          Foto Geotag Absensi (Klik untuk memperbesar)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedItem.clockInPhoto && (
                            <div
                              onClick={() => setModalFotoZoom({ url: urlFoto(selectedItem.clockInPhoto), judul: "Foto Absen Masuk" })}
                              className="cursor-pointer group relative overflow-hidden rounded-xl border border-mist"
                            >
                              <img
                                src={urlFoto(selectedItem.clockInPhoto)}
                                alt="Foto absen masuk"
                                className="w-full h-24 object-cover group-hover:scale-105 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                                Perbesar
                              </div>
                              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                                Masuk
                              </span>
                            </div>
                          )}

                          {selectedItem.clockOutPhoto && (
                            <div
                              onClick={() => setModalFotoZoom({ url: urlFoto(selectedItem.clockOutPhoto), judul: "Foto Absen Keluar" })}
                              className="cursor-pointer group relative overflow-hidden rounded-xl border border-mist"
                            >
                              <img
                                src={urlFoto(selectedItem.clockOutPhoto)}
                                alt="Foto absen keluar"
                                className="w-full h-24 object-cover group-hover:scale-105 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                                Perbesar
                              </div>
                              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                                Keluar
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FOOTER METADATA */}
                  <div className="pt-3 border-t border-mist/80 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Data terekam pada server</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Presensi Non-ASN
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 border border-mist text-center shadow-xs h-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
                    🔍
                  </div>
                  <p className="text-xs font-semibold text-navy">Belum Memilih Riwayat</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    Pilih salah satu catatan kehadiran di sebelah kiri untuk melihat rincian lengkap jam kerja, lokasi, dan foto.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* =====================================================
          4. MOBILE DETAIL BOTTOM SHEET (md:hidden)
      ===================================================== */}
      {selectedItem && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[28px] p-5 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-mist">
              <div>
                <h2 className="text-lg font-bold text-navy">Detail Absensi</h2>
                <p className="text-xs text-navy/60">{formatDDMMYYYY(selectedItem.tanggal)}</p>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* STATUS & TIPE */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-navy/60">Jenis Kehadiran</p>
                  <p className="font-bold text-navy text-sm">
                    {getAttendanceName(selectedItem.attendanceType)}
                  </p>
                </div>

                {(() => {
                  const st = getStatus(selectedItem);
                  return (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.color} ${st.border}`}>
                      {st.text}
                    </span>
                  );
                })()}
              </div>

              {/* JAM */}
              <div className="grid grid-cols-2 gap-3 bg-paper p-3.5 rounded-2xl border border-mist/70">
                <div>
                  <p className="text-[11px] text-navy/60">Jam Masuk</p>
                  <p className="font-bold text-navy text-sm mt-0.5">
                    {selectedItem.clockIn ? `${selectedItem.clockIn} WIB` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-navy/60">Jam Keluar</p>
                  <p className="font-bold text-navy text-sm mt-0.5">
                    {selectedItem.clockOut ? `${selectedItem.clockOut} WIB` : "-"}
                  </p>
                </div>
              </div>

              {/* DURASI KERJA */}
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-slate-600">Durasi Kerja:</span>
                <span className="font-bold text-brand">
                  {calculateWorkingTime(selectedItem.clockIn, selectedItem.clockOut)}
                </span>
              </div>

              {/* KINERJA HARIAN */}
              <div>
                <p className="text-[11px] font-semibold text-navy/70 mb-1">Kinerja Harian</p>
                <div className="bg-paper rounded-2xl p-3.5 border border-mist">
                  <p className="text-xs text-navy text-justify leading-relaxed">
                    {selectedItem.kinerjaHarian ||
                      selectedItem.kinerja_harian ||
                      "Tidak ada keterangan kinerja harian."}
                  </p>
                </div>
              </div>

              {/* KINERJA LEMBUR */}
              {selectedItem.kinerja_lembur && (
                <div>
                  <p className="text-[11px] font-semibold text-amber-800 mb-1">Kinerja Lembur</p>
                  <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200">
                    <p className="text-xs text-amber-900 text-justify leading-relaxed">
                      {selectedItem.kinerja_lembur}
                    </p>
                  </div>
                </div>
              )}

              {/* LOKASI */}
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[11px] text-navy/60">Lokasi Absen Masuk</p>
                  <p className="text-navy font-medium mt-0.5">
                    {selectedItem.clockInAddress || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-navy/60">Lokasi Absen Keluar</p>
                  <p className="text-navy font-medium mt-0.5">
                    {selectedItem.clockOutAddress || "-"}
                  </p>
                </div>
              </div>

              {/* FOTO */}
              <div>
                <p className="text-[11px] text-navy/60 mb-2">Foto Absensi</p>
                <div className="grid grid-cols-2 gap-3">
                  {selectedItem.clockInPhoto && (
                    <div>
                      <p className="text-[10px] text-navy/70 mb-1">Masuk</p>
                      <img
                        src={urlFoto(selectedItem.clockInPhoto)}
                        alt="Foto absen masuk"
                        className="w-full h-32 object-cover rounded-xl border border-mist"
                        onClick={() => setModalFotoZoom({ url: urlFoto(selectedItem.clockInPhoto), judul: "Foto Absen Masuk" })}
                      />
                    </div>
                  )}

                  {selectedItem.clockOutPhoto && (
                    <div>
                      <p className="text-[10px] text-navy/70 mb-1">Keluar</p>
                      <img
                        src={urlFoto(selectedItem.clockOutPhoto)}
                        alt="Foto absen keluar"
                        className="w-full h-32 object-cover rounded-xl border border-mist"
                        onClick={() => setModalFotoZoom({ url: urlFoto(selectedItem.clockOutPhoto), judul: "Foto Absen Keluar" })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full mt-5 bg-brand text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          5. MOBILE FILTER MODAL (md:hidden)
      ===================================================== */}
      {showFilterMobile && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[28px] p-5 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-mist">
              <h2 className="text-lg font-bold text-navy">Filter Riwayat</h2>
              <button
                onClick={() => setShowFilterMobile(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* JENIS KEHADIRAN */}
            <p className="text-xs font-semibold text-navy/60 mb-2">Jenis Kehadiran</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {PILIHAN_JENIS.map((pilihan) => (
                <button
                  key={pilihan.nilai}
                  onClick={() => setFilterJenis(pilihan.nilai)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    filterJenis === pilihan.nilai
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-paper text-navy border-mist"
                  }`}
                >
                  {pilihan.label}
                </button>
              ))}
            </div>

            {/* BULAN */}
            <p className="text-xs font-semibold text-navy/60 mb-2">Periode Bulan</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {daftarBulan.map((bulan) => (
                <button
                  key={bulan}
                  onClick={() => setFilterBulan(bulan)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    filterBulan === bulan
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-paper text-navy border-mist"
                  }`}
                >
                  {formatBulan(bulan)}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetFilter}
                className="flex-1 border border-mist text-navy py-3 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterMobile(false)}
                className="flex-1 bg-brand text-white py-3 rounded-xl font-bold text-xs shadow-md cursor-pointer active:scale-95 transition-all"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          6. MODAL FOTO ZOOM (LIGHTBOX)
      ===================================================== */}
      {modalFotoZoom && (
        <div
          onClick={() => setModalFotoZoom(null)}
          className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-mist"
          >
            <div className="flex items-center justify-between p-4 border-b border-mist">
              <h3 className="font-bold text-navy text-sm">{modalFotoZoom.judul}</h3>
              <button
                onClick={() => setModalFotoZoom(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center">
              <img
                src={modalFotoZoom.url}
                alt={modalFotoZoom.judul}
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          7. BOTTOM NAVIGATION (Mobile Only: block md:hidden)
      ===================================================== */}
      <div className="block md:hidden">
        <BottomNav
          activeNav="history"
          keHome={keHome}
          keRiwayat={keRiwayat}
          keProfile={keProfile}
        />
      </div>
    </div>
  );
}

export default History;