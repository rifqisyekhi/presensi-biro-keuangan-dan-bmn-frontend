import { useEffect } from "react";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiAlertCircle,
  FiInfo,
  FiX,
} from "react-icons/fi";

function AlertModal({
  isOpen,
  title,
  message,
  type = "info",
  buttonText = "Mengerti",
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Konfigurasi varian: warna, ikon, dan judul default
  const config = {
    success: {
      defaultTitle: "Berhasil",
      icon: <FiCheckCircle className="w-8 h-8 text-emerald-600" />,
      iconBox: "bg-emerald-50 border-emerald-100",
      buttonBg: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20",
    },
    error: {
      defaultTitle: "Perhatian",
      icon: <FiAlertTriangle className="w-8 h-8 text-red-500" />,
      iconBox: "bg-red-50 border-red-100",
      buttonBg: "bg-red-600 hover:bg-red-700 shadow-red-600/20",
    },
    warning: {
      defaultTitle: "Pemberitahuan",
      icon: <FiAlertCircle className="w-8 h-8 text-amber-500" />,
      iconBox: "bg-amber-50 border-amber-100",
      buttonBg: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
    },
    info: {
      defaultTitle: "Informasi",
      icon: <FiInfo className="w-8 h-8 text-brand" />,
      iconBox: "bg-blue-50 border-blue-100",
      buttonBg: "bg-brand hover:bg-brand/90 shadow-brand/20",
    },
  }[type] || {
    defaultTitle: "Informasi",
    icon: <FiInfo className="w-8 h-8 text-brand" />,
    iconBox: "bg-blue-50 border-blue-100",
    buttonBg: "bg-brand hover:bg-brand/90 shadow-brand/20",
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-white rounded-[28px] sm:rounded-3xl p-6 sm:p-7 shadow-2xl border border-mist relative overflow-hidden animate-in zoom-in-95 duration-200 text-center"
      >
        {/* Tombol Tutup X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          title="Tutup"
        >
          <FiX className="w-4 h-4" />
        </button>

        {/* Ikon Notifikasi */}
        <div
          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 border shadow-xs ${config.iconBox}`}
        >
          {config.icon}
        </div>

        {/* Judul & Pesan */}
        <h3 className="text-lg sm:text-xl font-bold text-navy">
          {title || config.defaultTitle}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed whitespace-pre-line">
          {message}
        </p>

        {/* Tombol Aksi */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer text-white ${config.buttonBg}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;

