import { useEffect } from "react";
import { FiLogOut, FiX } from "react-icons/fi";

function LogoutModal({ isOpen, onBatal, onKonfirmasi }) {
  // Tutup modal jika tombol Escape ditekan
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onBatal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onBatal]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onBatal}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-white rounded-[28px] sm:rounded-3xl p-6 sm:p-7 shadow-2xl border border-mist relative overflow-hidden animate-in zoom-in-95 duration-200 text-center"
      >
        {/* Tombol Tutup X */}
        <button
          onClick={onBatal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          title="Batal"
        >
          <FiX className="w-4 h-4" />
        </button>

        {/* Ikon Peringatan Logout */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4 border border-red-100 shadow-xs">
          <FiLogOut className="w-8 h-8 ml-0.5" />
        </div>

        {/* Judul & Keterangan */}
        <h3 className="text-lg sm:text-xl font-bold text-navy">
          Konfirmasi Keluar
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
          Apakah Anda yakin ingin keluar dari akun ini? Absensi atau draf yang belum dikirim ke server akan hilang.
        </p>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onBatal}
            className="flex-1 py-3 px-4 rounded-xl border border-mist bg-paper hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onKonfirmasi}
            className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Ya, Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutModal;

