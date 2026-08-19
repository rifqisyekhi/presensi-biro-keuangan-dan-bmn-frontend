import { useState, useEffect } from "react";
import BottomNav from "../components/BottomNav.jsx";

function Profile({ keHome, keRiwayat, keProfile, keLogout }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Ambil NIP yang disimpan saat login
        const nipUser = localStorage.getItem("userNip") || localStorage.getItem("userPhone");

        if (!nipUser) {
          throw new Error("Sesi login tidak ditemukan. Silakan kembali ke halaman Start/Login.");
        }

        const response = await fetch(
          `http://localhost:5000/api/pegawai/${encodeURIComponent(nipUser)}`
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data. Data pegawai tidak ditemukan di database.");
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-paper flex items-center justify-center font-sans text-navy">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-paper flex flex-col items-center justify-center font-sans text-navy px-5">
        <p className="text-red-500 font-bold mb-2">Terjadi Kesalahan</p>
        <p className="text-navy/70 text-sm text-center">{error}</p>
        <button onClick={keHome} className="mt-5 px-4 py-2 bg-brand text-white rounded-lg">
          Kembali ke Home
        </button>
      </div>
    );
  }

  // Satu kartu dengan pembatas, bukan dua kartu terpisah,
  // supaya seluruh isi Profile muat dalam satu layar.
  const dataProfil = [
    { label: "Nama", nilai: user?.nama },
    { label: "NIP", nilai: user?.nip },
    { label: "Jabatan", nilai: user?.jabatan },
    { label: "Sub Unit", nilai: user?.sub_unit },
    { label: "Email", nilai: user?.email },
    { label: "Nomor Telepon / WA", nilai: user?.no_wa },
  ];

  return (
    <div className="h-[100dvh] w-full max-w-[430px] mx-auto bg-paper font-sans text-navy flex flex-col overflow-hidden">
      <div className="bg-white pt-10 pb-5 px-6 rounded-b-[28px] shadow-sm border-b border-mist shrink-0">
        <h1 className="text-xl font-bold text-navy">Profile Anda</h1>
      </div>

      <div className="flex-1 min-h-0 px-5 pt-4 pb-[64px] flex flex-col overflow-hidden">
        <h2 className="text-sm font-bold text-navy mb-2 px-1 shrink-0">
          Informasi Pegawai
        </h2>

        <div className="bg-white rounded-[20px] px-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-mist divide-y divide-mist">
          {dataProfil.map((item) => (
            <div key={item.label} className="py-2.5">
              <p className="text-[11px] text-navy/60">{item.label}</p>
              <p className="text-sm font-bold text-navy break-words">
                {item.nilai || "-"}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={keLogout}
          className="mt-auto shrink-0 w-full border border-mist bg-white text-brand py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
        >
          Keluar
        </button>
      </div>

      <BottomNav activeNav="profile" keHome={keHome} keRiwayat={keRiwayat} keProfile={keProfile} />
    </div>
  );
}

export default Profile;