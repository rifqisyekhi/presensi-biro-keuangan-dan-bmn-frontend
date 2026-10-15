import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Search,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  ExternalLink,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { API_URL, urlFoto } from "../config";

// =========================================================
// REKAP ABSENSI — HALAMAN PETUGAS (RESPONSIF TABLE & MODAL)
// =========================================================

const JENIS_KEHADIRAN = [
  { nilai: "WFO", label: "WFO" },
  { nilai: "WFH", label: "WFH (Dari Rumah)" },
  { nilai: "DINAS", label: "Dinas Luar" },
];

function jamKeInput(jam) {
  const cocok = /^(\d{1,2})[.:](\d{2})$/.exec(String(jam || "").trim());
  if (!cocok) return "";
  return `${cocok[1].padStart(2, "0")}:${cocok[2]}`;
}

function awalBulanIni() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function hariIni() {
  const now = new Date();
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`
  );
}

function awalBulanLalu() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function akhirBulanLalu() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 0);
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  );
}

function Rekap({ keProfile }) {
  // Filter Waktu & Parameter Server
  const [dari, setDari] = useState(awalBulanIni());
  const [sampai, setSampai] = useState(hariIni());
  const [pegawai, setPegawai] = useState("");
  const [jenis, setJenis] = useState("");

  // Data State
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [daftarPegawai, setDaftarPegawai] = useState([]);

  // Client-Side Live Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHanyaBelumPulang, setFilterHanyaBelumPulang] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Modal State
  const [modalFoto, setModalFoto] = useState(null);
  const [modalJam, setModalJam] = useState(null);
  const [jamMasukBaru, setJamMasukBaru] = useState("");
  const [jamPulangBaru, setJamPulangBaru] = useState("");
  const [alasanJam, setAlasanJam] = useState("");
  const [sedangSimpanJam, setSedangSimpanJam] = useState(false);

  const [modalStatus, setModalStatus] = useState(null);
  const [statusBaru, setStatusBaru] = useState("");
  const [alasanStatus, setAlasanStatus] = useState("");
  const [sedangSimpanStatus, setSedangSimpanStatus] = useState(false);

  const [modalHapus, setModalHapus] = useState(null);
  const [sedangHapus, setSedangHapus] = useState(false);

  const noWa = (() => {
    try {
      return localStorage.getItem("userPhone") || "";
    } catch {
      return "";
    }
  })();

  const paramDasar =
    `dari=${encodeURIComponent(dari)}` +
    `&sampai=${encodeURIComponent(sampai)}` +
    `&pemohon=${encodeURIComponent(noWa)}` +
    `&pegawai=${encodeURIComponent(pegawai)}` +
    `&jenis=${encodeURIComponent(jenis)}`;

  const urlExport = `${API_URL}/api/rekap/export?${paramDasar}`;

  const ambilData = async (overrideDari, overrideSampai, overridePegawai, overrideJenis) => {
    const dDari = typeof overrideDari === "string" ? overrideDari : dari;
    const dSampai = typeof overrideSampai === "string" ? overrideSampai : sampai;
    const dPegawai = typeof overridePegawai === "string" ? overridePegawai : pegawai;
    const dJenis = typeof overrideJenis === "string" ? overrideJenis : jenis;

    setMemuat(true);
    setError(null);
    setPesan(null);
    setPage(1);

    const query =
      `dari=${encodeURIComponent(dDari)}` +
      `&sampai=${encodeURIComponent(dSampai)}` +
      `&pemohon=${encodeURIComponent(noWa)}` +
      `&pegawai=${encodeURIComponent(dPegawai)}` +
      `&jenis=${encodeURIComponent(dJenis)}`;

    try {
      const response = await fetch(`${API_URL}/api/rekap?${query}`);
      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal mengambil rekap.");
      }

      setData(hasil);

      if (!dPegawai && Array.isArray(hasil.daftarPegawai)) {
        setDaftarPegawai(hasil.daftarPegawai);
      }
    } catch (err) {
      console.error("Error rekap:", err);
      setError(err.message);
      setData(null);
    } finally {
      setMemuat(false);
    }
  };

  // Muat data awal saat halaman pertama kali dibuka
  useEffect(() => {
    ambilData();
  }, []);

  // Shortcut tombol preset tanggal: langsung update tanggal & muat data otomatis
  const pasangPreset = (dDari, dSampai) => {
    setDari(dDari);
    setSampai(dSampai);
    ambilData(dDari, dSampai);
  };

  // =======================================================
  // FILTERING CLIENT-SIDE (LIVE SEARCH & QUICK PILL)
  // =======================================================
  const dataFiltered = useMemo(() => {
    if (!data?.data) return [];
    let list = data.data;

    if (filterHanyaBelumPulang) {
      list = list.filter((item) => !item.jamPulang);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.nama && item.nama.toLowerCase().includes(q)) ||
          (item.nip && item.nip.toLowerCase().includes(q)) ||
          (item.sub_unit && item.sub_unit.toLowerCase().includes(q)) ||
          (item.kinerja && item.kinerja.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data?.data, searchQuery, filterHanyaBelumPulang]);

  // Statistik Ringkasan Cepat
  const ringkasan = useMemo(() => {
    if (!data?.data?.length) return null;
    const pegawaiSet = new Set(data.data.map((d) => d.no_wa));
    const belumPulang = data.data.filter((d) => !d.jamPulang).length;
    const wfo = data.data.filter((d) => d.attendanceType === "WFO").length;
    const wfh = data.data.filter((d) => d.attendanceType === "WFH").length;
    const dinas = data.data.filter((d) => d.attendanceType === "DINAS").length;

    return {
      totalBaris: data.total,
      totalPegawai: pegawaiSet.size,
      belumPulang,
      wfo,
      wfh,
      dinas,
    };
  }, [data?.data]);

  // Pagination Slice
  const totalPages = Math.ceil(dataFiltered.length / perPage) || 1;
  const pagedData = useMemo(() => {
    const start = (page - 1) * perPage;
    return dataFiltered.slice(start, start + perPage);
  }, [dataFiltered, page, perPage]);

  // =======================================================
  // AKSI: HAPUS
  // =======================================================
  const eksekusiHapus = async () => {
    if (!modalHapus) return;
    setSedangHapus(true);
    setError(null);
    setPesan(null);

    try {
      const response = await fetch(
        `${API_URL}/api/rekap/${encodeURIComponent(modalHapus.id)}?pemohon=${encodeURIComponent(noWa)}`,
        { method: "DELETE" }
      );
      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal menghapus data.");
      }

      setData((lama) =>
        lama
          ? {
              ...lama,
              total: Math.max(0, (lama.total || 0) - 1),
              data: lama.data.filter((d) => d.id !== modalHapus.id),
            }
          : lama
      );

      setPesan(hasil.message || "Data absensi berhasil dihapus.");
      setModalHapus(null);
    } catch (err) {
      console.error("Error hapus absensi:", err);
      setError(err.message);
    } finally {
      setSedangHapus(false);
    }
  };

  // =======================================================
  // AKSI: UBAH STATUS
  // =======================================================
  const bukaModalStatus = (baris) => {
    setModalStatus(baris);
    setStatusBaru(baris.attendanceType || "WFO");
    setAlasanStatus("");
  };

  const eksekusiUbahStatus = async () => {
    if (!modalStatus) return;
    setSedangSimpanStatus(true);
    setError(null);
    setPesan(null);

    try {
      const response = await fetch(
        `${API_URL}/api/rekap/${encodeURIComponent(modalStatus.id)}/status?pemohon=${encodeURIComponent(noWa)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendanceType: statusBaru,
            alasan: alasanStatus,
          }),
        }
      );
      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal mengubah status.");
      }

      setData((lama) =>
        lama
          ? {
              ...lama,
              data: lama.data.map((d) =>
                d.id === modalStatus.id
                  ? {
                      ...d,
                      attendanceType: hasil.absensi?.attendanceType || statusBaru,
                      jenis: hasil.absensi?.jenis || d.jenis,
                      perubahanStatus: hasil.absensi?.perubahanStatus || d.perubahanStatus,
                    }
                  : d
              ),
            }
          : lama
      );

      setPesan(hasil.message || "Status kehadiran berhasil diubah.");
      setModalStatus(null);
    } catch (err) {
      console.error("Error ubah status:", err);
      setError(err.message);
    } finally {
      setSedangSimpanStatus(false);
    }
  };

  // =======================================================
  // AKSI: UBAH JAM
  // =======================================================
  const bukaModalJam = (baris) => {
    setModalJam(baris);
    setJamMasukBaru(jamKeInput(baris.jamMasuk));
    setJamPulangBaru(jamKeInput(baris.jamPulang));
    setAlasanJam("");
  };

  const eksekusiUbahJam = async () => {
    if (!modalJam) return;
    setSedangSimpanJam(true);
    setError(null);
    setPesan(null);

    try {
      const response = await fetch(
        `${API_URL}/api/rekap/${encodeURIComponent(modalJam.id)}/jam?pemohon=${encodeURIComponent(noWa)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clockIn: jamMasukBaru,
            clockOut: jamPulangBaru,
            alasan: alasanJam,
          }),
        }
      );
      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal mengubah jam.");
      }

      setData((lama) =>
        lama
          ? {
              ...lama,
              data: lama.data.map((d) =>
                d.id === modalJam.id
                  ? {
                      ...d,
                      jamMasuk: hasil.absensi?.jamMasuk ?? d.jamMasuk,
                      jamPulang: hasil.absensi?.jamPulang ?? d.jamPulang,
                      perubahanJam: hasil.absensi?.perubahanJam || d.perubahanJam,
                    }
                  : d
              ),
            }
          : lama
      );

      setPesan(hasil.message || "Jam absensi berhasil diubah.");
      setModalJam(null);
    } catch (err) {
      console.error("Error ubah jam:", err);
      setError(err.message);
    } finally {
      setSedangSimpanJam(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/60 font-sans text-navy pb-16">
      {/* =====================================================
          HEADER ATAS
      ===================================================== */}
      <header className="bg-white border-b border-mist/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={keProfile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mist hover:bg-slate-50 text-xs font-semibold text-navy transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-brand" />
              <span>Kembali</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-navy leading-tight">
                  Rekap Absensi Pegawai
                </h1>
                <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Petugas
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Biro Keuangan dan BMN • Monitor kehadiran, jam kerja, dan foto geotag
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={urlExport}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Unduh berkas spreadsheet Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Excel</span>
            </a>
          </div>
        </div>
      </header>

      {/* =====================================================
          KONTEN UTAMA
      ===================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        {/* ============ ALERT FEEDBACK ============ */}
        {error && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs sm:text-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {pesan && (
          <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs sm:text-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{pesan}</span>
            </div>
            <button onClick={() => setPesan(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============ STATISTIK RINGKASAN ============ */}
        {ringkasan && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-mist shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">Total Pegawai</p>
                <h3 className="text-xl sm:text-2xl font-bold text-navy">{ringkasan.totalPegawai}</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-mist shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">Total Kehadiran</p>
                <h3 className="text-xl sm:text-2xl font-bold text-navy">{ringkasan.totalBaris}</h3>
              </div>
            </div>

            <div
              onClick={() => setFilterHanyaBelumPulang((prev) => !prev)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                filterHanyaBelumPulang
                  ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400"
                  : "bg-white border-mist hover:border-amber-300 shadow-xs"
              }`}
              title="Klik untuk menyaring yang belum pulang"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-slate-500 font-medium truncate">Belum Pulang</p>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-sm">Filter</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-amber-600">{ringkasan.belumPulang}</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-mist shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">Status Kehadiran</p>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mt-1">
                  <span className="text-blue-600">WFO: {ringkasan.wfo}</span>
                  <span className="text-purple-600">WFH: {ringkasan.wfh}</span>
                  <span className="text-emerald-600">Dinas: {ringkasan.dinas}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ FILTER CARD ============ */}
        <div className="bg-white rounded-2xl border border-mist/80 p-4 sm:p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-mist/60">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-bold text-navy">Filter Rentang Waktu & Kriteria</h2>
            </div>

            {/* Presets Tanggal */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1 text-[11px]">Preset:</span>
              <button
                type="button"
                onClick={() => pasangPreset(hariIni(), hariIni())}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                  dari === hariIni() && sampai === hariIni()
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "border-mist hover:bg-slate-100 text-slate-700"
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => pasangPreset(awalBulanIni(), hariIni())}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                  dari === awalBulanIni() && sampai === hariIni()
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "border-mist hover:bg-slate-100 text-slate-700"
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => pasangPreset(awalBulanLalu(), akhirBulanLalu())}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                  dari === awalBulanLalu() && sampai === akhirBulanLalu()
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "border-mist hover:bg-slate-100 text-slate-700"
                }`}
              >
                Bulan Lalu
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                className="w-full border border-mist rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                className="w-full border border-mist rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pegawai</label>
              <select
                value={pegawai}
                onChange={(e) => setPegawai(e.target.value)}
                className="w-full border border-mist rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand truncate"
              >
                <option value="">Semua Pegawai</option>
                {daftarPegawai.map((p) => (
                  <option key={p.no_wa} value={p.no_wa}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Kehadiran</label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
                className="w-full border border-mist rounded-xl px-3 py-2 text-xs sm:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="">Semua Status</option>
                <option value="WFO">WFO</option>
                <option value="WFH">WFH (Dari Rumah)</option>
                <option value="DINAS">Dinas Luar</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={ambilData}
                disabled={memuat}
                className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-2 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer h-[38px]"
              >
                <RefreshCw className={`w-4 h-4 ${memuat ? "animate-spin" : ""}`} />
                <span>{memuat ? "Memuat..." : "Tampilkan"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============ LIVE SEARCH & BARIS PER HALAMAN ============ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Ketik untuk mencari nama, NIP, atau sub unit..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-mist rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 self-end sm:self-auto">
            <span className="font-medium">
              Ditemukan: <strong className="text-navy">{dataFiltered.length}</strong> data
            </span>
            <div className="flex items-center gap-1.5">
              <span>Baris:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-mist bg-white rounded-lg px-2 py-1 text-xs text-navy font-semibold focus:outline-hidden"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* =====================================================
            TABEL DATA (DESKTOP & TABLET: md+)
        ===================================================== */}
        <div className="hidden md:block bg-white rounded-2xl border border-mist/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-mist/80 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Pegawai</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Tanggal & Hari</th>
                  <th className="py-3.5 px-3 min-w-[90px] text-center">Status</th>
                  <th className="py-3.5 px-3 min-w-[90px] text-center">Masuk</th>
                  <th className="py-3.5 px-3 min-w-[110px] text-center">Pulang</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Kinerja Harian</th>
                  <th className="py-3.5 px-3 min-w-[100px] text-center">Foto</th>
                  <th className="py-3.5 px-4 min-w-[120px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist/50">
                {memuat && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
                      <span>Sedang memuat data rekap presensi...</span>
                    </td>
                  </tr>
                )}

                {!memuat && pagedData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-500">Tidak ada data absensi yang cocok.</p>
                      <p className="text-[11px] mt-0.5">Coba ubah rentang tanggal atau kata kunci pencarian.</p>
                    </td>
                  </tr>
                )}

                {!memuat &&
                  pagedData.map((baris, idx) => {
                    const noUrut = (page - 1) * perPage + idx + 1;
                    const isBelumPulang = !baris.jamPulang;

                    return (
                      <tr
                        key={baris.id || `${baris.no_wa}-${baris.tanggal}-${idx}`}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isBelumPulang ? "bg-amber-50/30" : ""
                        }`}
                      >
                        {/* NO */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">{noUrut}</td>

                        {/* PEGAWAI */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-navy text-[13px]">{baris.nama || "-"}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            {baris.sub_unit && (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-sm text-[10px] font-medium">
                                {baris.sub_unit}
                              </span>
                            )}
                            {baris.nip && <span>{baris.nip}</span>}
                          </div>
                        </td>

                        {/* TANGGAL */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-700">{baris.tanggal}</div>
                          <div className="text-[11px] text-slate-400">{baris.hari}</div>
                        </td>

                        {/* STATUS */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              baris.attendanceType === "WFO"
                                ? "bg-blue-100 text-blue-700"
                                : baris.attendanceType === "WFH"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {baris.jenis || baris.attendanceType || "-"}
                          </span>
                          {baris.perubahanStatus && (
                            <div className="text-[9px] text-amber-700 font-semibold mt-1">Diedit Petugas</div>
                          )}
                        </td>

                        {/* JAM MASUK */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold text-slate-700 text-[13px]">{baris.jamMasuk || "-"}</span>
                          {baris.perubahanJam?.dariMasuk && (
                            <div className="text-[9px] text-amber-700 font-semibold">Diedit</div>
                          )}
                        </td>

                        {/* JAM PULANG */}
                        <td className="py-3.5 px-3 text-center">
                          {baris.jamPulang ? (
                            <span className="font-bold text-slate-700 text-[13px]">{baris.jamPulang}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>Belum</span>
                            </span>
                          )}
                        </td>

                        {/* KINERJA HARIAN */}
                        <td className="py-3.5 px-4 text-slate-600 leading-relaxed max-w-[260px]">
                          {baris.kinerja ? (
                            <div className="line-clamp-2 text-[11px]" title={baris.kinerja}>
                              {baris.kinerja}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">Tidak ada catatan kinerja</span>
                          )}
                          {baris.kinerjaLembur && (
                            <div className="mt-1 text-[10px] text-indigo-700 line-clamp-1" title={baris.kinerjaLembur}>
                              <strong>Lembur:</strong> {baris.kinerjaLembur}
                            </div>
                          )}
                        </td>

                        {/* FOTO */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {baris.fotoMasuk ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalFoto({
                                    url: urlFoto(baris.fotoMasuk),
                                    tipe: "Masuk",
                                    nama: baris.nama,
                                    tanggal: baris.tanggal,
                                    jam: baris.jamMasuk,
                                    lokasi: baris.alamatMasuk,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-blue-200 text-brand hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Lihat Foto Masuk"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-200 text-[10px]">-</span>
                            )}

                            {baris.fotoPulang ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalFoto({
                                    url: urlFoto(baris.fotoPulang),
                                    tipe: "Pulang",
                                    nama: baris.nama,
                                    tanggal: baris.tanggal,
                                    jam: baris.jamPulang,
                                    lokasi: baris.alamatPulang,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Lihat Foto Pulang"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => bukaModalJam(baris)}
                              className="p-1.5 rounded-lg border border-mist text-slate-600 hover:text-brand hover:border-brand hover:bg-blue-50/50 transition-all cursor-pointer"
                              title="Ubah Jam Masuk / Pulang"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => bukaModalStatus(baris)}
                              className="p-1.5 rounded-lg border border-mist text-slate-600 hover:text-brand hover:border-brand hover:bg-blue-50/50 transition-all cursor-pointer"
                              title="Ubah Status Kehadiran"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setModalHapus(baris)}
                              className="p-1.5 rounded-lg border border-mist text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 transition-all cursor-pointer"
                              title="Hapus Data Absensi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================
            KARTU DATA (MOBILE: < md)
        ===================================================== */}
        <div className="block md:hidden flex flex-col gap-3">
          {memuat && (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-mist">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
              <p className="text-xs">Memuat data absensi...</p>
            </div>
          )}

          {!memuat && pagedData.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-mist">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Tidak ada data absensi.</p>
              <p className="text-xs mt-1">Coba sesuaikan filter pencarian.</p>
            </div>
          )}

          {!memuat &&
            pagedData.map((baris, idx) => {
              const isBelumPulang = !baris.jamPulang;

              return (
                <div
                  key={baris.id || `${baris.no_wa}-${baris.tanggal}-${idx}`}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    isBelumPulang ? "border-amber-300 bg-amber-50/20 shadow-xs" : "border-mist shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-mist/60">
                    <div>
                      <h4 className="font-bold text-navy text-sm">{baris.nama || "-"}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {baris.hari}, {baris.tanggal}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        baris.attendanceType === "WFO"
                          ? "bg-blue-100 text-blue-700"
                          : baris.attendanceType === "WFH"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {baris.jenis || baris.attendanceType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-mist/60">
                      <p className="text-[10px] text-slate-400 font-medium">Jam Masuk</p>
                      <p className="font-bold text-slate-700 text-sm mt-0.5">{baris.jamMasuk || "-"}</p>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border ${
                        isBelumPulang
                          ? "bg-amber-100/50 border-amber-300"
                          : "bg-slate-50 border-mist/60"
                      }`}
                    >
                      <p className="text-[10px] text-slate-400 font-medium">Jam Pulang</p>
                      <p
                        className={`text-sm mt-0.5 font-bold ${
                          isBelumPulang ? "text-amber-700" : "text-slate-700"
                        }`}
                      >
                        {baris.jamPulang || "Belum Pulang"}
                      </p>
                    </div>
                  </div>

                  {baris.kinerja && (
                    <div className="mb-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-mist/60">
                      <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Kinerja Harian:</p>
                      <p className="text-slate-700 leading-relaxed text-[11px]">{baris.kinerja}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-mist/60">
                    <div className="flex items-center gap-2">
                      {baris.fotoMasuk && (
                        <button
                          type="button"
                          onClick={() =>
                            setModalFoto({
                              url: urlFoto(baris.fotoMasuk),
                              tipe: "Masuk",
                              nama: baris.nama,
                              tanggal: baris.tanggal,
                              jam: baris.jamMasuk,
                              lokasi: baris.alamatMasuk,
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Foto Masuk</span>
                        </button>
                      )}
                      {baris.fotoPulang && (
                        <button
                          type="button"
                          onClick={() =>
                            setModalFoto({
                              url: urlFoto(baris.fotoPulang),
                              tipe: "Pulang",
                              nama: baris.nama,
                              tanggal: baris.tanggal,
                              jam: baris.jamPulang,
                              lokasi: baris.alamatPulang,
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:underline cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Foto Pulang</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => bukaModalJam(baris)}
                        className="p-1.5 rounded-lg border border-mist text-slate-600 hover:bg-slate-100"
                        title="Ubah Jam"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => bukaModalStatus(baris)}
                        className="p-1.5 rounded-lg border border-mist text-slate-600 hover:bg-slate-100"
                        title="Ubah Status"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalHapus(baris)}
                        className="p-1.5 rounded-lg border border-mist text-red-500 hover:bg-red-50"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* =====================================================
            PAGINATION CONTROLS
        ===================================================== */}
        {!memuat && dataFiltered.length > 0 && (
          <div className="bg-white rounded-2xl border border-mist/80 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
            <div>
              Menampilkan{" "}
              <strong>
                {Math.min((page - 1) * perPage + 1, dataFiltered.length)} -{" "}
                {Math.min(page * perPage, dataFiltered.length)}
              </strong>{" "}
              dari <strong>{dataFiltered.length}</strong> absensi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-mist hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-3 py-1 font-bold text-navy">
                Halaman {page} dari {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-mist hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================
          MODAL: PRATINJAU FOTO GEOTAG
      ===================================================== */}
      {modalFoto && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-mist animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-mist flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-sm text-navy">
                  Foto Absen {modalFoto.tipe} — {modalFoto.nama}
                </h3>
              </div>
              <button
                onClick={() => setModalFoto(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col items-center gap-3">
              <div className="w-full bg-slate-100 rounded-2xl overflow-hidden border border-mist/80 flex items-center justify-center min-h-[250px]">
                <img
                  src={modalFoto.url}
                  alt={`Foto ${modalFoto.tipe}`}
                  className="max-h-[60vh] w-auto object-contain rounded-xl"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://placehold.co/400x300?text=Foto+Tidak+Ditemukan";
                  }}
                />
              </div>

              {modalFoto.lokasi && (
                <div className="w-full bg-blue-50/70 border border-blue-200/60 p-3 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-navy font-bold">Lokasi Geotag:</strong>
                    <span>{modalFoto.lokasi}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-mist bg-slate-50 flex items-center justify-between gap-2">
              <a
                href={modalFoto.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Ukuran Asli</span>
              </a>

              <button
                type="button"
                onClick={() => setModalFoto(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: UBAH JAM MASUK / PULANG
      ===================================================== */}
      {modalJam && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-mist animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-mist flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-sm text-navy">Ubah Jam Absensi</h3>
              </div>
              <button
                onClick={() => setModalJam(null)}
                disabled={sedangSimpanJam}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-mist/80">
                <p className="font-bold text-navy text-sm">{modalJam.nama}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Tanggal: <strong>{modalJam.hari}, {modalJam.tanggal}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Jam Masuk (WIB)</label>
                  <input
                    type="time"
                    value={jamMasukBaru}
                    onChange={(e) => setJamMasukBaru(e.target.value)}
                    disabled={sedangSimpanJam}
                    className="w-full border border-mist rounded-xl px-3 py-2 text-sm font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Jam Pulang (WIB)</label>
                  <input
                    type="time"
                    value={jamPulangBaru}
                    onChange={(e) => setJamPulangBaru(e.target.value)}
                    disabled={sedangSimpanJam}
                    className="w-full border border-mist rounded-xl px-3 py-2 text-sm font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Catatan / Alasan Perubahan</label>
                <input
                  type="text"
                  value={alasanJam}
                  onChange={(e) => setAlasanJam(e.target.value)}
                  disabled={sedangSimpanJam}
                  placeholder="Misal: Perangkat pegawai sempat mati / kendala foto"
                  maxLength={300}
                  className="w-full border border-mist rounded-xl px-3 py-2 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Penting:</strong> Perubahan jam akan menghitung ulang durasi kerja, keterlambatan, dan lembur secara otomatis di rekap Excel. Tindakan ini tercatat di riwayat audit.
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-mist bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalJam(null)}
                disabled={sedangSimpanJam}
                className="px-4 py-2 bg-white border border-mist hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={eksekusiUbahJam}
                disabled={sedangSimpanJam || !jamMasukBaru}
                className="px-5 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {sedangSimpanJam ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: UBAH STATUS KEHADIRAN
      ===================================================== */}
      {modalStatus && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-mist animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-mist flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-sm text-navy">Ubah Status Kehadiran</h3>
              </div>
              <button
                onClick={() => setModalStatus(null)}
                disabled={sedangSimpanStatus}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-mist/80">
                <p className="font-bold text-navy text-sm">{modalStatus.nama}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Tanggal: <strong>{modalStatus.hari}, {modalStatus.tanggal}</strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1.5">Pilih Status Baru:</label>
                <div className="grid grid-cols-3 gap-2">
                  {JENIS_KEHADIRAN.map((j) => (
                    <button
                      key={j.nilai}
                      type="button"
                      onClick={() => setStatusBaru(j.nilai)}
                      disabled={sedangSimpanStatus}
                      className={`py-2.5 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        statusBaru === j.nilai
                          ? "bg-brand text-white border-brand shadow-xs"
                          : "bg-white text-slate-700 border-mist hover:bg-slate-50"
                      }`}
                    >
                      {j.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Catatan / Alasan Perubahan</label>
                <input
                  type="text"
                  value={alasanStatus}
                  onChange={(e) => setAlasanStatus(e.target.value)}
                  disabled={sedangSimpanStatus}
                  placeholder="Misal: Ditugaskan dinas luar mendadak siang hari"
                  maxLength={300}
                  className="w-full border border-mist rounded-xl px-3 py-2 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {statusBaru === "DINAS" && modalStatus.attendanceType !== "DINAS" && (
                <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                  <strong>Catatan Dinas Luar:</strong> Status dinas luar tidak terikat jam kantor. Kolom Jam Harus Checkout, Terlambat, dan Menit Kerja akan disesuaikan di rekap.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-mist bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalStatus(null)}
                disabled={sedangSimpanStatus}
                className="px-4 py-2 bg-white border border-mist hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={eksekusiUbahStatus}
                disabled={sedangSimpanStatus || !statusBaru}
                className="px-5 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {sedangSimpanStatus ? "Menyimpan..." : "Simpan Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: KONFIRMASI HAPUS DATA
      ===================================================== */}
      {modalHapus && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-mist animate-in zoom-in-95 duration-200">
            <div className="p-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-bold text-base text-navy">Hapus Absensi Pegawai?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Absensi milik <strong>{modalHapus.nama}</strong> pada tanggal{" "}
                  <strong>{modalHapus.tanggal}</strong> akan dihapus permanen beserta foto geotag-nya.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-[11px] text-red-700 text-left w-full">
                ⚠️ Tindakan ini tidak dapat dibatalkan. Data yang terhapus tidak bisa dipulihkan kembali.
              </div>
            </div>

            <div className="p-4 border-t border-mist bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalHapus(null)}
                disabled={sedangHapus}
                className="flex-1 py-2 bg-white border border-mist hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={eksekusiHapus}
                disabled={sedangHapus}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {sedangHapus ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rekap;
