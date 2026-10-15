import officePhoto from "../assets/photo.png";
import logoKemnaker from "../assets/logo-kemnaker.png";

function Start({ keLogin }) {
  return (
    <div className="min-h-screen w-full bg-paper flex items-center justify-center p-0 md:p-6 lg:p-10 font-sans text-navy">
      {/* =====================================================
          RESPONSIVE CARD (MOBILE & DESKTOP)
      ===================================================== */}
      <div className="w-full min-h-screen md:min-h-[580px] md:h-auto max-w-full md:max-w-3xl lg:max-w-4xl bg-gradient-to-br from-navy via-[#164369] to-brand text-white md:rounded-[32px] md:shadow-2xl md:border md:border-mist/60 overflow-hidden relative flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        
        {/* Background decorative photo & shapes */}
        <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay">
          <img
            src={officePhoto}
            alt="Office Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-brand/40 blur-3xl pointer-events-none" />

        {/* TOP BRANDING */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shadow-inner shrink-0">
            <img
              src={logoKemnaker}
              alt="Logo Kemnaker"
              className="w-full h-full object-contain drop-shadow-xs"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentNode.innerHTML = "<span class='font-black text-white text-lg'>P</span>";
              }}
            />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight text-white">
              Presensi Non-ASN
            </h2>
            <p className="text-[11px] text-white/75">
              Biro Keuangan dan BMN • Setjen Kemnaker
            </p>
          </div>
        </div>

        {/* CENTER CONTENT */}
        <div className="relative z-10 my-auto py-10 md:py-12 max-w-2xl">
          <span className="inline-block px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold text-white mb-4 border border-white/20">
            Sistem Informasi Presensi Digital
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white">
            Website Presensi <br />
            <span className="text-amber-300 font-extrabold">Bagi Non-ASN</span>
          </h1>

          <p className="text-sm sm:text-base text-white/85 mt-4 leading-relaxed max-w-xl">
            Layanan pencatatan kehadiran mandiri, validasi lokasi geotagging, pelaporan kinerja harian, dan integrasi persetujuan lembur.
          </p>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="relative z-10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/20">
          <p className="text-xs text-white/70 order-2 sm:order-1 text-center sm:text-left">
            Pastikan Anda telah memiliki nomor WhatsApp terdaftar.
          </p>

          <button
            onClick={keLogin}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold transition-all active:scale-95 bg-white text-navy hover:bg-slate-100 shadow-lg cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2 shrink-0"
          >
            <span>Mulai / Login</span>
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
                strokeWidth={2.5}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}

export default Start;