import { useState } from "react";
import {
  LayoutGrid,
  Users,
  Package,
  Layers,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { getUrlSiska } from "../config";

export default function PortalTuMenu({ compact = false, align = "right" }) {
  const [buka, setBuka] = useState(false);

  return (
    <div className="relative inline-block text-left">
      {compact ? (
        <button
          type="button"
          onClick={() => setBuka((prev) => !prev)}
          className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs hover:bg-blue-100"
          title="Buka Portal Layanan TU & SisKA"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setBuka((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold text-xs ${
            buka
              ? "bg-blue-50 border-blue-300 text-blue-700 shadow-xs"
              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-700"
          }`}
          title="Akses Dashboard Layanan TU & SisKA Office"
        >
          <LayoutGrid className="w-4 h-4 text-brand shrink-0" />
          <span>Portal TU</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              buka ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </button>
      )}

      {buka && (
        <>
          {/* Backdrop untuk klik di luar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setBuka(false)}
          />

          <div
            className={`absolute ${
              align === "left" ? "left-0" : "right-0"
            } mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-150`}
          >
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Portal TU
              </p>
              <p className="text-xs font-semibold text-slate-700">
                Layanan Terpadu Tata Usaha
              </p>
            </div>

            <a
              href={getUrlSiska("/admin")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setBuka(false)}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                    Master Data
                  </p>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Pegawai & Kendaraan Dinas
                </p>
              </div>
            </a>

            <a
              href={getUrlSiska("/barang")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setBuka(false)}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition-colors group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700">
                    Stok ATK
                  </p>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Persediaan Barang Kantor
                </p>
              </div>
            </a>

            <a
              href={getUrlSiska("/")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setBuka(false)}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                    Katalog ATK
                  </p>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Permintaan Barang Pegawai
                </p>
              </div>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

