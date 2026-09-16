import { useState } from "react";
import { API_URL, urlFoto } from "../config";

// =========================================================
// REKAP ABSENSI — HALAMAN PETUGAS
// =========================================================
//
// Hanya muncul untuk nomor yang terdaftar di PETUGAS_ABSENSI
// pada backend. Pemeriksaannya tetap dilakukan backend di
// setiap permintaan; kondisi di sini hanya menyembunyikan
// menunya dari pegawai biasa.

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

function Rekap({ keProfile }) {
  const [dari, setDari] = useState(awalBulanIni());
  const [sampai, setSampai] = useState(hariIni());

  const [pegawai, setPegawai] = useState("");
  const [jenis, setJenis] = useState("");

  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState(null);

  // Penghapusan dibuat dua langkah: tombol "Hapus" hanya
  // membuka konfirmasi di dalam kartunya sendiri, dan baru
  // klik kedua yang benar-benar menghapus. Halaman ini dibuka
  // di layar sentuh, dan datanya tidak bisa dikembalikan.
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(null);
  const [sedangHapus, setSedangHapus] = useState(null);
  const [pesan, setPesan] = useState(null);

  // Disimpan terpisah dari `data` supaya isi dropdown tidak
  // ikut menyusut saat rekapnya sedang difilter satu nama.
  const [daftarPegawai, setDaftarPegawai] = useState([]);

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

  const ambilData = async () => {
    setMemuat(true);
    setError(null);
    setPesan(null);
    setKonfirmasiHapus(null);

    try {
      const response = await fetch(`${API_URL}/api/rekap?${paramDasar}`);

      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal mengambil rekap.");
      }

      setData(hasil);

      // Hanya diperbarui saat tidak sedang memfilter nama,
      // supaya daftarnya tetap utuh.
      if (!pegawai && Array.isArray(hasil.daftarPegawai)) {
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

  // =======================================================
  // HAPUS SATU BARIS
  // =======================================================
  //
  // Dipakai untuk membuang sisa data pengujian dan salah absen
  // yang tidak bisa diperbaiki pegawainya sendiri. Baris yang
  // salah bukan cuma mengotori rekap: satu orang hanya boleh
  // punya satu absensi per tanggal, jadi baris itu menghalangi
  // absensi yang benar di tanggal yang sama.

  const hapusBaris = async (baris) => {
    setSedangHapus(baris.id);
    setError(null);
    setPesan(null);

    try {
      const response = await fetch(
        `${API_URL}/api/rekap/${encodeURIComponent(baris.id)}` +
          `?pemohon=${encodeURIComponent(noWa)}`,
        { method: "DELETE" },
      );

      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal menghapus data.");
      }

      // Barisnya dibuang dari daftar yang sedang tampil, bukan
      // dengan memuat ulang seluruh rekap: petugas biasanya
      // menghapus beberapa baris berurutan, dan memuat ulang
      // akan melempar posisi gulirnya kembali ke atas setiap
      // kali.
      setData((lama) =>
        lama
          ? {
              ...lama,
              total: Math.max(0, (lama.total || 0) - 1),
              data: lama.data.filter((d) => d.id !== baris.id),
            }
          : lama,
      );

      setPesan(hasil.message || "Data absensi dihapus.");
      setKonfirmasiHapus(null);
    } catch (err) {
      console.error("Error hapus absensi:", err);

      setError(err.message);
    } finally {
      setSedangHapus(null);
    }
  };

  // Ringkasan singkat supaya petugas langsung melihat
  // gambaran besarnya sebelum menelusuri baris satu per satu.
  const ringkasan = (() => {
    if (!data?.data?.length) return null;

    const pegawai = new Set(data.data.map((d) => d.no_wa));

    const belumPulang = data.data.filter((d) => !d.jamPulang).length;

    return {
      baris: data.total,
      pegawai: pegawai.size,
      belumPulang,
    };
  })();

  return (
    <div className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-paper font-sans text-navy flex flex-col">
      <div className="bg-white pt-10 pb-5 px-6 rounded-b-[28px] shadow-sm border-b border-mist shrink-0">
        <button
          onClick={keProfile}
          className="text-sm text-brand font-bold mb-2"
        >
          ← Kembali
        </button>

        <h1 className="text-xl font-bold text-navy">Rekap Absensi</h1>

        <p className="text-[11px] text-navy/60 mt-1">
          Seluruh pegawai, untuk keperluan pemeriksaan
        </p>
      </div>

      <div className="px-5 pt-4 pb-8 flex flex-col gap-4">
        {/* ============ FILTER ============ */}

        <div className="bg-white rounded-[20px] p-4 border border-mist shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="text-[11px] text-navy/60">Dari tanggal</span>
              <input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                className="mt-1 w-full border border-mist rounded-xl px-3 py-2 text-sm"
              />
            </label>

            <label className="flex-1">
              <span className="text-[11px] text-navy/60">Sampai tanggal</span>
              <input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                className="mt-1 w-full border border-mist rounded-xl px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex gap-3 mt-3">
            <label className="flex-1 min-w-0">
              <span className="text-[11px] text-navy/60">Pegawai</span>
              <select
                value={pegawai}
                onChange={(e) => setPegawai(e.target.value)}
                className="mt-1 w-full border border-mist rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="">Semua pegawai</option>
                {daftarPegawai.map((p) => (
                  <option key={p.no_wa} value={p.no_wa}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 min-w-0">
              <span className="text-[11px] text-navy/60">Status kerja</span>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
                className="mt-1 w-full border border-mist rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="">Semua</option>
                <option value="WFO">WFO</option>
                <option value="WFH">WFH (Dari Rumah)</option>
                <option value="DINAS">Dinas Luar</option>
              </select>
            </label>
          </div>

          {!daftarPegawai.length && (
            <p className="mt-2 text-[10px] text-navy/50">
              Daftar pegawai terisi setelah menekan Tampilkan.
            </p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={ambilData}
              disabled={memuat}
              className="flex-1 bg-brand text-white py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {memuat ? "Memuat..." : "Tampilkan"}
            </button>

            <a
              href={urlExport}
              className="flex-1 text-center border border-brand text-brand py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
            >
              Unduh Excel
            </a>
          </div>
        </div>

        {/* ============ ERROR ============ */}

        {error && (
          <div className="bg-white rounded-[20px] p-4 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ============ HASIL HAPUS ============ */}

        {pesan && (
          <div className="bg-white rounded-[20px] p-4 border border-emerald-200 text-sm text-emerald-700">
            {pesan}
          </div>
        )}

        {/* ============ RINGKASAN ============ */}

        {ringkasan && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Baris", nilai: ringkasan.baris },
              { label: "Pegawai", nilai: ringkasan.pegawai },
              { label: "Belum pulang", nilai: ringkasan.belumPulang },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-white rounded-[16px] p-3 border border-mist text-center"
              >
                <p className="text-lg font-bold text-navy">{k.nilai}</p>
                <p className="text-[10px] text-navy/60">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ============ DAFTAR ============ */}

        {data && !data.data.length && (
          <div className="bg-white rounded-[20px] p-6 border border-mist text-center text-sm text-navy/60">
            Tidak ada absensi pada rentang tanggal ini.
          </div>
        )}

        {data?.data?.map((baris, i) => (
          <div
            key={baris.id || `${baris.no_wa}-${baris.tanggal}-${i}`}
            className="bg-white rounded-[20px] p-4 border border-mist shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy break-words">
                  {baris.nama || "-"}
                </p>
                <p className="text-[11px] text-navy/60">
                  {baris.hari}, {baris.tanggal}
                </p>
              </div>

              <span className="shrink-0 text-[10px] font-bold bg-brand/10 text-brand px-2 py-1 rounded-full">
                {baris.jenis || "-"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-navy/60">Jam masuk</p>
                <p className="font-bold">{baris.jamMasuk || "-"}</p>
              </div>

              <div>
                <p className="text-navy/60">Jam pulang</p>
                <p
                  className={
                    baris.jamPulang ? "font-bold" : "font-bold text-amber-600"
                  }
                >
                  {baris.jamPulang || "Belum absen pulang"}
                </p>
              </div>
            </div>

            {baris.kinerja && (
              <div className="mt-3">
                <p className="text-[11px] text-navy/60">Kinerja harian</p>
                <p className="text-[12px] break-words">{baris.kinerja}</p>
              </div>
            )}

            {baris.alamatMasuk && (
              <div className="mt-3">
                <p className="text-[11px] text-navy/60">Lokasi masuk</p>
                <p className="text-[12px] break-words">{baris.alamatMasuk}</p>
              </div>
            )}

            <div className="mt-3 flex gap-3">
              {baris.fotoMasuk && (
                <a
                  href={urlFoto(baris.fotoMasuk)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-brand underline"
                >
                  Foto masuk
                </a>
              )}

              {baris.fotoPulang && (
                <a
                  href={urlFoto(baris.fotoPulang)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-brand underline"
                >
                  Foto pulang
                </a>
              )}
            </div>

            {/* ---------- HAPUS ---------- */}

            {konfirmasiHapus === baris.id ? (
              <div className="mt-3 pt-3 border-t border-mist">
                <p className="text-[11px] text-navy/70 leading-relaxed">
                  Hapus absensi <b>{baris.nama || baris.no_wa}</b> tanggal{" "}
                  {baris.tanggal}? Fotonya ikut terhapus dan data ini
                  tidak bisa dikembalikan.
                </p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => hapusBaris(baris)}
                    disabled={sedangHapus === baris.id}
                    className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-[12px] active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {sedangHapus === baris.id ? "Menghapus..." : "Ya, hapus"}
                  </button>

                  <button
                    onClick={() => setKonfirmasiHapus(null)}
                    disabled={sedangHapus === baris.id}
                    className="flex-1 border border-mist text-navy py-2 rounded-xl font-bold text-[12px] active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setKonfirmasiHapus(baris.id);
                  setPesan(null);
                  setError(null);
                }}
                className="mt-3 text-[11px] font-bold text-red-600"
              >
                Hapus data ini
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rekap;
