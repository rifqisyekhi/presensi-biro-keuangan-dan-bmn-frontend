import { useState, useEffect } from "react";
import BottomNav from "../components/BottomNav.jsx";

function Profile({ keHome, keRiwayat, keProfile }) {
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
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F9FAFB] flex items-center justify-center font-sans text-gray-800">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00AEEF]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F9FAFB] flex flex-col items-center justify-center font-sans text-gray-800 px-5">
        <p className="text-red-500 font-bold mb-2">Terjadi Kesalahan</p>
        <p className="text-gray-500 text-sm text-center">{error}</p>
        <button onClick={keHome} className="mt-5 px-4 py-2 bg-[#00AEEF] text-white rounded-lg">
          Kembali ke Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F9FAFB] font-sans text-gray-800 relative overflow-x-hidden">
      <div className="bg-white pt-14 pb-16 px-6 rounded-b-[32px] relative z-10 shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-700">Profile Anda</h1>
          <button className="text-sm font-bold text-[#00AEEF] hover:text-blue-500 transition-colors">
            Ubah Kata Sandi
          </button>
        </div>
      </div>

      <div className="relative z-20 -mt-12 flex justify-center">
        <div className="w-[100px] h-[100px] rounded-full border-[6px] border-[#F9FAFB] overflow-hidden bg-white shadow-md flex items-center justify-center">
          <img
            src={user?.foto_profil || "https://i.pravatar.cc/150?img=11"}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="px-5 mt-6 pb-28">
        <h2 className="text-[15px] font-bold text-gray-600 mb-3 px-1">Informasi Pribadi</h2>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-5 mb-7">
          <div>
            <p className="text-[13px] text-gray-400 mb-0.5">NIP</p>
            <p className="font-bold text-gray-700">{user?.nip || "-"}</p>
          </div>
          <div>
            <p className="text-[13px] text-gray-400 mb-0.5">Jabatan</p>
            <p className="font-bold text-gray-700">{user?.jabatan || "-"}</p>
          </div>
          <div>
            <p className="text-[13px] text-gray-400 mb-0.5">Nama</p>
            <p className="font-bold text-gray-700">{user?.nama || "-"}</p>
          </div>
          <div>
            <p className="text-[13px] text-gray-400 mb-0.5">Sub Unit</p>
            <p className="font-bold text-gray-700">{user?.sub_unit || "-"}</p>
          </div>
        </div>

        <h2 className="text-[15px] font-bold text-gray-600 mb-3 px-1">Info Kontak</h2>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-5">
          <div>
            <p className="text-[13px] text-gray-400 mb-0.5">Email</p>
            <p className="font-bold text-gray-700">{user?.email || "-"}</p>
          </div>
          <div>
            <p className="text-[13px] text-gray-400 mb-0.5">Nomor Telepon / WA</p>
            <p className="font-bold text-gray-700">{user?.no_wa || "-"}</p>
          </div>
        </div>
      </div>

      <BottomNav activeNav="profile" keHome={keHome} keRiwayat={keRiwayat} keProfile={keProfile} />
    </div>
  );
}

export default Profile;