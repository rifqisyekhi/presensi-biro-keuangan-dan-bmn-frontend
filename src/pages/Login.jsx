import { useState } from "react";
import logoKemnaker from "../assets/logo-kemnaker.png";
import { API_URL, NOMOR_BOT_SISKA } from "../config";

function Login({ keHome, kePilihKehadiran }) {
  const [showPassword, setShowPassword] = useState(false);

  // State untuk menyimpan inputan form (menggunakan nomor WhatsApp / telepon)
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // State untuk status loading dan error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // 1. Tembak API Login di Node.js
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: phone, password: password }),
      });

      const data = await response.json();

      // 2. Cek apakah ada error dari server
      if (!response.ok) {
        throw new Error(data.message || "Gagal melakukan login. Periksa kembali nomor WA dan password.");
      }

      // 3. Simpan data sesi login ke localStorage
      localStorage.setItem("userPhone", data.user.no_wa || phone);

      const nip = data.user?.nip || data.user?.nip_pegawai || data.user?.nik;
      if (nip) {
        localStorage.setItem("userNip", nip);
      }

      // 4. Arahkan ke halaman utama
      if (keHome) keHome();
      else if (kePilihKehadiran) kePilihKehadiran();
    } catch (error) {
      console.error("❌ Error login:", error);
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-paper flex items-center justify-center p-0 md:p-6 lg:p-10 font-sans text-navy">
      {/* =====================================================
          CONTAINER UTAMA (SPLIT SCREEN DESKTOP & MOBILE)
      ===================================================== */}
      <div className="w-full min-h-screen md:min-h-[640px] max-w-full md:max-w-4xl lg:max-w-5xl bg-white md:rounded-[32px] md:shadow-xl md:border md:border-mist overflow-hidden flex flex-col md:grid md:grid-cols-12">
        
        {/* =====================================================
            1. SISI KIRI (HERO BRAND PANEL - DESKTOP ONLY)
        ===================================================== */}
        <div className="hidden md:flex md:col-span-5 lg:col-span-5 bg-gradient-to-br from-navy via-[#1e4d79] to-brand text-white p-8 lg:p-12 flex-col justify-between relative overflow-hidden select-none">
          {/* Subtle Geometric Background Vector (Saleskip style curves) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
            viewBox="0 0 400 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="200" r="220" stroke="white" strokeWidth="1.5" />
            <circle cx="50" cy="200" r="280" stroke="white" strokeWidth="1.5" />
            <circle cx="50" cy="200" r="340" stroke="white" strokeWidth="1.5" />
            <circle cx="50" cy="200" r="400" stroke="white" strokeWidth="1.5" />
          </svg>

          {/* Aksentuasi Glow Halus */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-brand/30 blur-2xl pointer-events-none" />

          {/* Top Logo / Icon */}
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-2 flex items-center justify-center shadow-inner">
              <img
                src={logoKemnaker}
                alt="Logo Kemnaker"
                className="w-full h-full object-contain drop-shadow-xs"
              />
            </div>
          </div>

          {/* Main Greeting / Typography (Mirip Desain Referensi) */}
          <div className="relative z-10 my-auto py-8">
            <div className="text-3xl text-yellow mb-2">✦</div>
            <h1 className="text-3xl lg:text-4xl font-black text-white leading-[1.15] tracking-tight">
              Halo <br />
              Pegawai! <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-white/80 text-xs lg:text-sm mt-4 leading-relaxed max-w-xs font-normal">
              Sistem presensi mandiri Non-ASN Biro Keuangan dan BMN. Catat kehadiran harian, pantau waktu kerja, dan kelola lembur dengan mudah.
            </p>
          </div>

          {/* Footer Copyright */}
          <div className="relative z-10 text-[11px] text-white/60 font-medium">
            © {new Date().getFullYear()} Biro Keuangan dan BMN Kemnaker RI.
          </div>
        </div>

        {/* =====================================================
            2. MOBILE TOP BANNER (block md:hidden)
        ===================================================== */}
        <div className="block md:hidden bg-gradient-to-br from-navy via-[#1e4d79] to-brand text-white pt-8 pb-7 px-6 relative shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 p-1.5 border border-white/25 flex items-center justify-center shadow-inner shrink-0">
              <img src={logoKemnaker} alt="Logo Kemnaker" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-white/15 px-2 py-0.5 rounded-full inline-block">
                Presensi Non-ASN
              </span>
              <p className="text-[11px] text-white/75 font-medium mt-0.5">Biro Keuangan dan BMN</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold mt-1">Selamat Datang 👋</h1>
          <p className="text-xs text-white/80 mt-0.5">
            Masuk untuk mencatat kehadiran hari ini.
          </p>
        </div>

        {/* =====================================================
            3. SISI KANAN (FORM LOGIN - DESKTOP & MOBILE)
        ===================================================== */}
        <div className="w-full md:col-span-7 lg:col-span-7 bg-white p-6 sm:p-8 lg:p-12 flex flex-col justify-between relative flex-1">
          {/* Header Brand Sisi Kanan (Desktop) */}
          <div className="hidden md:flex items-center justify-between pb-3 border-b border-mist/80 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-paper p-1.5 border border-mist flex items-center justify-center">
                <img src={logoKemnaker} alt="Logo Kemnaker" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-navy leading-tight">Presensi Non-ASN</h2>
                <p className="text-[10px] text-slate-400">Biro Keuangan dan BMN</p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 bg-paper px-2.5 py-1 rounded-lg border border-mist">
              Kemnaker RI
            </span>
          </div>

          {/* Form Area */}
          <div className="my-auto py-2">
            <div className="mb-6">
              <h2 className="text-2xl lg:text-3xl font-extrabold text-navy tracking-tight">
                Selamat Datang!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Silakan masukkan nomor WhatsApp dan password akun Anda.
              </p>
            </div>

            {/* Alert Error */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-50 text-red-700 text-xs sm:text-sm font-semibold rounded-2xl border border-red-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Field WhatsApp */}
              <div>
                <label className="block text-navy text-xs font-bold mb-1.5">
                  Nomor WhatsApp / Telepon
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="Contoh: 08123456789 atau 62812..."
                  className="w-full bg-paper border border-mist px-4 py-3 rounded-xl text-xs sm:text-sm text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Field Password */}
              <div>
                <label className="block text-navy text-xs font-bold mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Masukkan password Anda"
                    className="w-full bg-paper border border-mist px-4 py-3 pr-11 rounded-xl text-xs sm:text-sm text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy cursor-pointer transition-colors p-1"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Checkbox Remember Me */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-2 w-4 h-4 rounded border-mist text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  Ingat nomor saya di perangkat ini
                </label>
              </div>

              {/* Tombol Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy hover:bg-brand text-white py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses Masuk...</span>
                  </>
                ) : (
                  <span>Masuk Sekarang</span>
                )}
              </button>
            </form>
          </div>

          {/* Catatan Bantuan Bawah */}
          <div className="pt-4 text-center text-xs text-slate-500">
            Butuh bantuan akun atau lupa password?{" "}
            <a
              href={`https://wa.me/${NOMOR_BOT_SISKA}?text=menu`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Chatbot SisKA</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;