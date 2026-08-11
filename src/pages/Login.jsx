import { useState } from "react";
import officePhoto from "../assets/photo.png";

function Login({ keStart, keHome, kePilihKehadiran }) {
  const [showPassword, setShowPassword] = useState(false);

  // State untuk menyimpan inputan form (menggunakan phone, bukan nip)
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // State untuk status loading dan error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault(); // Mencegah halaman refresh
    setErrorMsg("");
    setIsLoading(true);

    try {
      // 1. Tembak API Login di Node.js
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: phone, password: password }),
      });

      const data = await response.json();

      // 2. Cek apakah ada error dari server
      if (!response.ok) {
        throw new Error(data.message || "Gagal melakukan login");
      }

      // 3. Jika Sukses: Simpan data sesi login ke memori browser
      localStorage.setItem("userPhone", data.user.no_wa || phone);

      if (data.user?.nip) {
        localStorage.setItem("userNip", data.user.nip);
      } else if (data.user?.nip_pegawai) {
        localStorage.setItem("userNip", data.user.nip_pegawai);
      } else if (data.user?.nip_pegawai || data.user?.nik) {
        localStorage.setItem("userNip", data.user.nip_pegawai || data.user.nik);
      }

      // 4. Pindah ke halaman Home
      if (keHome) keHome();
      else if (kePilihKehadiran) kePilihKehadiran();
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full max-w-[400px] mx-auto bg-[#5B84F5] relative overflow-hidden flex flex-col shadow-lg font-sans">
      <div className="absolute top-0 -left-[25%] w-[150%] h-[35%] bg-gray-300 rounded-b-[50%] overflow-hidden z-0">
        <img
          src={officePhoto}
          alt="Office Background"
          className="w-full h-full object-cover opacity-60 mix-blend-multiply bg-[#436BD6]"
        />
      </div>

      {/* Tombol Back menuju Start */}
      <button
        onClick={keStart}
        className="absolute top-10 left-6 z-10 bg-[#5B84F5] text-white p-2 rounded-full shadow-md transition-transform active:scale-90"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className="relative z-10 mt-[35%] flex flex-col items-center text-white px-6">
        <h1 className="text-3xl font-bold mb-1">Welcome Back</h1>
        <p className="text-sm text-blue-100">Login to your account</p>
      </div>

      {/* FORM LOGIN */}
      <form
        onSubmit={handleLogin}
        className="relative z-10 bg-white mx-5 mt-6 mb-8 rounded-3xl flex-1 px-6 py-8 shadow-xl flex flex-col"
      >
        {/* Notifikasi Error */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-xl text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            No Telp (62)
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="Contoh: 08123456789 atau 62812..."
            className="w-full bg-[#F3F4F6] p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#5B84F5] transition-all"
          />
        </div>

        <div className="mb-4 relative">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Masukkan nomor telepon yang sama"
            className="w-full bg-[#F3F4F6] p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#5B84F5] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-4 top-11 text-gray-500"
          >
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        </div>

        <div className="flex justify-between items-center mb-8 mt-2">
          <label className="flex items-center text-sm text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              className="mr-2 w-4 h-4 rounded border-gray-300 text-[#5B84F5] focus:ring-[#5B84F5]"
            />
            Remember me
          </label>
        </div>

        {/* Tombol Login */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#5B84F5] text-white py-4 rounded-xl font-bold text-lg mb-6 shadow-md transition-transform active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Memproses..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;