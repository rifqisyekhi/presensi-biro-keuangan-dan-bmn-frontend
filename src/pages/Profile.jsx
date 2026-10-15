import { useState, useEffect } from "react";
import { FiFileText, FiLogOut } from "react-icons/fi";
import BottomNav from "../components/BottomNav.jsx";
import logoKemnaker from "../assets/logo-kemnaker.png";
import { API_URL, NOMOR_BOT_SISKA, FORM_CUTI_URL } from "../config";

function Profile({ keHome, keRiwayat, keProfile, keRekap, keLogout }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Menu rekap hanya untuk petugas.
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
      } catch (err) {
        console.error("Gagal memeriksa hak akses rekap:", err);
      }
    };

    cekPetugas();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const nipUser =
          localStorage.getItem("userNip") || localStorage.getItem("userPhone");

        if (!nipUser) {
          throw new Error(
            "Sesi login tidak ditemukan. Silakan kembali ke halaman awal."
          );
        }

        const response = await fetch(
          `${API_URL}/api/pegawai/${encodeURIComponent(nipUser)}`
        );

        if (!response.ok) {
          throw new Error(
            "Gagal mengambil data. Data pegawai tidak ditemukan di database."
          );
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error("Error profile:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // =========================================================
  // LOADING STATE
  // =========================================================
  if (isLoading) {
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
          <p className="text-navy/70 text-sm font-medium">Memuat profil pegawai...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR STATE
  // =========================================================
  if (error) {
    return (
      <div className="min-h-screen w-full bg-paper flex flex-col items-center justify-center font-sans text-navy px-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-mist shadow-xs text-center">
          <p className="text-red-500 font-bold mb-2">Terjadi Kesalahan</p>
          <p className="text-navy/70 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={keHome}
              className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Kembali ke Beranda
            </button>
            <button
              onClick={keLogout}
              className="px-4 py-2 border border-mist bg-white text-brand rounded-xl text-xs font-bold cursor-pointer"
            >
              Masuk Ulang
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dataProfil = [
    { label: "Nama Lengkap", nilai: user?.nama },
    { label: "Nomor Induk Pegawai (NIP)", nilai: user?.nip },
    { label: "Jabatan", nilai: user?.jabatan },
    { label: "Unit / Sub Unit", nilai: user?.sub_unit },
    { label: "Nomor WhatsApp / Telepon", nilai: user?.no_wa },
    { label: "Alamat Email", nilai: user?.email },
    {
      label: "Hak Akses Presensi",
      nilai: petugas ? "Pegawai Non-ASN & Petugas Presensi" : "Pegawai Non-ASN",
    },
  ];

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
              onClick={keRiwayat}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
            >
              Riwayat
            </button>
            <button
              onClick={() => {}}
              className="px-3.5 py-2 rounded-xl bg-brand text-white font-bold shadow-xs cursor-pointer"
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
      <header className="block md:hidden bg-white px-6 pt-8 pb-4 border-b border-mist/80 sticky top-0 z-20">
        <h1 className="text-xl font-bold text-navy">Profil Anda</h1>
        <p className="text-xs text-navy/60 mt-0.5">
          Informasi identitas dan akun presensi pegawai
        </p>
      </header>

      {/* =====================================================
          3. MAIN CONTENT CONTAINER (Responsive Mobile & Desktop)
      ===================================================== */}
      <main className="w-full max-w-[430px] md:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-8 flex-1 flex flex-col pb-24 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-stretch">
          
          {/* BARIS 1 KIRI: AVATAR CARD */}
          <div className="order-1 md:order-1 md:col-span-5 lg:col-span-4 h-full">
            <div className="bg-white rounded-[24px] md:rounded-3xl p-5 sm:p-6 border border-mist shadow-xs text-center flex flex-col justify-between items-center h-full">
              <div className="flex flex-col items-center w-full">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-navy to-brand text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-4 border-paper mb-3">
                  {user?.nama?.charAt(0)?.toUpperCase() || "P"}
                </div>

                <h2 className="font-bold text-base sm:text-lg text-navy leading-snug">
                  {user?.nama || "Pegawai Non-ASN"}
                </h2>

                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {user?.nip || "-"}
                </p>

                <div className="mt-2.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
                  {user?.jabatan || "Non-ASN"}
                </div>

                {user?.sub_unit && (
                  <p className="text-xs text-slate-600 mt-2 font-medium">
                    {user?.sub_unit}
                  </p>
                )}
              </div>

              <div className="w-full mt-4 pt-4 border-t border-mist/80 flex flex-col gap-2">
                <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-green/15 text-[#527926] border border-green/40 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-green" />
                  <span>Akun Pegawai Aktif</span>
                </div>

                {petugas && (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow/25 text-[#856404] border border-yellow/50 font-bold text-xs">
                    <span>🛡️</span>
                    <span>Petugas Rekap Presensi</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BARIS 1 KANAN: INFORMASI PEGAWAI */}
          <div className="order-2 md:order-2 md:col-span-7 lg:col-span-8 h-full">
            <div className="bg-white rounded-[24px] md:rounded-3xl p-5 sm:p-6 border border-mist shadow-xs h-full flex flex-col justify-between">
              <div className="pb-3 border-b border-mist/80 mb-1">
                <h3 className="font-bold text-navy text-sm sm:text-base">
                  Informasi Pegawai
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data diri yang terdaftar pada sistem Presensi Biro Keuangan & BMN
                </p>
              </div>

              <div className="divide-y divide-mist/70 flex-1 flex flex-col justify-around py-1">
                {dataProfil.map((item) => (
                  <div
                    key={item.label}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs"
                  >
                    <span className="text-slate-500 font-medium sm:w-2/5">
                      {item.label}
                    </span>
                    <span className="font-bold text-navy sm:w-3/5 sm:text-right break-words">
                      {item.nilai || "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BARIS 2 KIRI: ACTION BUTTONS (REKAP & LOGOUT) */}
          <div className="order-4 md:order-3 md:col-span-5 lg:col-span-4 h-full">
            <div className="bg-white rounded-[24px] md:rounded-3xl p-5 sm:p-6 border border-mist shadow-xs flex flex-col justify-center gap-2.5 h-full">
              {petugas && (
                <button
                  onClick={keRekap}
                  className="w-full bg-brand hover:bg-brand/90 text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiFileText className="w-4 h-4" />
                  <span>Rekap Absensi Pegawai</span>
                </button>
              )}

              <button
                onClick={keLogout}
                className="w-full border border-red-200 hover:bg-red-50 text-red-600 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <FiLogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>

          {/* BARIS 2 KANAN: LAYANAN MANDIRI & BOT SISKA */}
          <div className="order-3 md:order-4 md:col-span-7 lg:col-span-8 h-full">
            <div className="bg-white rounded-[24px] md:rounded-3xl p-5 sm:p-6 border border-mist shadow-xs flex flex-col justify-center h-full">
              <div>
                <h3 className="font-bold text-navy text-sm sm:text-base">
                  Layanan Mandiri & Bot SisKA
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengajuan lembur dan formulir cuti dilakukan melalui integrasi WhatsApp Bot SisKA.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
                <a
                  href={`https://wa.me/${NOMOR_BOT_SISKA}?text=menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-paper hover:bg-slate-100/80 border border-mist transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-teal/15 text-teal flex items-center justify-center font-bold shrink-0 text-xs">
                    WA
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy group-hover:text-brand transition-colors">
                      WhatsApp Bot SisKA
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Ketik menu untuk ajukan lembur
                    </p>
                  </div>
                </a>

                <a
                  href={FORM_CUTI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-paper hover:bg-slate-100/80 border border-mist transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand flex items-center justify-center font-bold shrink-0 text-xs">
                    📄
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy group-hover:text-brand transition-colors">
                      Formulir Cuti
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Buka form pengajuan cuti
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================
          4. BOTTOM NAVIGATION (Mobile Only: block md:hidden)
      ===================================================== */}
      <div className="block md:hidden">
        <BottomNav
          activeNav="profile"
          keHome={keHome}
          keRiwayat={keRiwayat}
          keProfile={keProfile}
        />
      </div>
    </div>
  );
}

export default Profile;