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

// Nilai yang dikirim ke backend beserta labelnya di layar.
// Urutannya mengikuti seberapa sering dipakai, bukan abjad.
const JENIS_KEHADIRAN = [
  { nilai: "WFO", label: "WFO" },
  { nilai: "WFH", label: "WFH" },
  { nilai: "DINAS", label: "Dinas Luar" },
];

// Rekap menyimpan jam sebagai "07.30", sedangkan <input
// type="time"> hanya menerima "HH:MM" dan menampilkan kosong
// kalau bentuknya tidak pas — termasuk untuk "7.30" yang jamnya
// satu angka. Karena itu dibakukan dulu, bukan diserahkan ke
// input-nya.
function jamKeInput(jam) {
  const cocok = /^(\d{1,2})[.:](\d{2})$/.exec(String(jam || "").trim());

  if (!cocok) return "";

  return `${cocok[1].padStart(2, "0")}:${cocok[2]}`;
}

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

  // Ubah status dibuka per kartu, sama seperti hapus: id baris
  // yang sedang disunting, pilihan yang belum disimpan, dan
  // catatan opsionalnya.
  const [editStatus, setEditStatus] = useState(null);
  const [statusBaru, setStatusBaru] = useState("");
  const [alasanEdit, setAlasanEdit] = useState("");
  const [sedangSimpan, setSedangSimpan] = useState(null);

  // Ubah jam, pola yang sama: satu kartu saja yang terbuka.
  const [editJam, setEditJam] = useState(null);
  const [jamMasukBaru, setJamMasukBaru] = useState("");
  const [jamPulangBaru, setJamPulangBaru] = useState("");
  const [alasanJam, setAlasanJam] = useState("");
  const [sedangSimpanJam, setSedangSimpanJam] = useState(null);

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
    setEditStatus(null);
    setEditJam(null);

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

  // =======================================================
  // UBAH JENIS KEHADIRAN
  // =======================================================
  //
  // Dipakai ketika hari seorang pegawai berubah di tengah
  // jalan — berangkat WFO, lalu ditugaskan dinas luar sesudah
  // makan siang. Yang bersangkutan tidak bisa membetulkannya
  // sendiri: absen masuk hari itu sudah terpakai, dan satu
  // orang hanya boleh punya satu absensi per tanggal.

  const mulaiUbahStatus = (baris) => {
    setEditStatus(baris.id);
    setStatusBaru(baris.attendanceType || "");
    setAlasanEdit("");
    setEditJam(null);
    setKonfirmasiHapus(null);
    setPesan(null);
    setError(null);
  };

  const ubahStatus = async (baris) => {
    setSedangSimpan(baris.id);
    setError(null);
    setPesan(null);

    try {
      const response = await fetch(
        `${API_URL}/api/rekap/${encodeURIComponent(baris.id)}/status` +
          `?pemohon=${encodeURIComponent(noWa)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendanceType: statusBaru,
            alasan: alasanEdit,
          }),
        },
      );

      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal mengubah status.");
      }

      // Hanya kartu ini yang diperbarui, bukan seluruh rekap
      // dimuat ulang — alasannya sama seperti pada hapus:
      // petugas biasanya membetulkan beberapa baris berurutan,
      // dan memuat ulang melempar posisi gulirnya ke atas.
      //
      // Kartu ini memang tidak menampilkan angka jam kerja —
      // Terlambat, Menit Kerja, dan Lembur hanya ada di berkas
      // Excel, dihitung backend saat rekap dibaca. Karena itu
      // panel suntingnya menyebutkan lebih dulu kolom apa saja
      // yang ikut berubah: di layar ini perubahannya tidak
      // kelihatan sama sekali.
      setData((lama) =>
        lama
          ? {
              ...lama,
              data: lama.data.map((d) =>
                d.id === baris.id
                  ? {
                      ...d,
                      attendanceType:
                        hasil.absensi?.attendanceType || statusBaru,
                      jenis: hasil.absensi?.jenis || d.jenis,
                      perubahanStatus:
                        hasil.absensi?.perubahanStatus || d.perubahanStatus,
                    }
                  : d,
              ),
            }
          : lama,
      );

      setPesan(hasil.message || "Status absensi diubah.");
      setEditStatus(null);
    } catch (err) {
      console.error("Error ubah status:", err);

      setError(err.message);
    } finally {
      setSedangSimpan(null);
    }
  };

  // =======================================================
  // UBAH JAM MASUK DAN JAM PULANG
  // =======================================================
  //
  // Absensi yang gagal di tengah jalan membuat pegawai rugi
  // tanpa itu kesalahan siapa pun: foto berkali-kali gagal
  // diunggah sampai jam masuknya tercatat terlambat, atau bot
  // mentok sebelum absen pulang sehingga kolomnya kosong —
  // padahal orangnya hadir sampai sore. Tidak semua orang absen
  // lewat cadangan, jadi tanpa fitur ini kerugiannya menempel di
  // rekap yang dipakai menilai kinerjanya.

  const mulaiUbahJam = (baris) => {
    setEditJam(baris.id);
    setJamMasukBaru(jamKeInput(baris.jamMasuk));
    setJamPulangBaru(jamKeInput(baris.jamPulang));
    setAlasanJam("");
    setEditStatus(null);
    setKonfirmasiHapus(null);
    setPesan(null);
    setError(null);
  };

  const ubahJam = async (baris) => {
    setSedangSimpanJam(baris.id);
    setError(null);
    setPesan(null);

    try {
      const response = await fetch(
        `${API_URL}/api/rekap/${encodeURIComponent(baris.id)}/jam` +
          `?pemohon=${encodeURIComponent(noWa)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clockIn: jamMasukBaru,
            clockOut: jamPulangBaru,
            alasan: alasanJam,
          }),
        },
      );

      const hasil = await response.json();

      if (!response.ok) {
        throw new Error(hasil.message || "Gagal mengubah jam.");
      }

      // Kartunya diperbarui setempat, bukan seluruh rekap dimuat
      // ulang — petugas biasanya membetulkan beberapa baris
      // berurutan. Jam yang tampil di kartu ikut berubah; angka
      // Terlambat dan Menit Kerja tidak, karena keduanya hanya
      // ada di berkas Excel dan dihitung backend saat dibaca.
      setData((lama) =>
        lama
          ? {
              ...lama,
              data: lama.data.map((d) =>
                d.id === baris.id
                  ? {
                      ...d,
                      jamMasuk: hasil.absensi?.jamMasuk ?? d.jamMasuk,
                      jamPulang: hasil.absensi?.jamPulang ?? d.jamPulang,
                      perubahanJam:
                        hasil.absensi?.perubahanJam || d.perubahanJam,
                    }
                  : d,
              ),
            }
          : lama,
      );

      setPesan(hasil.message || "Jam absensi diubah.");
      setEditJam(null);
    } catch (err) {
      console.error("Error ubah jam:", err);

      setError(err.message);
    } finally {
      setSedangSimpanJam(null);
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

            {baris.kinerjaLembur && (
              <div className="mt-3">
                <p className="text-[11px] text-navy/60">Kinerja lembur</p>
                <p className="text-[12px] break-words">{baris.kinerjaLembur}</p>
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

            {/* ---------- JEJAK PERUBAHAN STATUS ---------- */}

            {baris.perubahanStatus && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold text-amber-700">
                  Status diubah petugas
                </p>
                <p className="text-[11px] text-amber-900 break-words">
                  Dari {baris.perubahanStatus.dariLabel} oleh{" "}
                  {baris.perubahanStatus.oleh || "-"}
                  {baris.perubahanStatus.pada
                    ? `, ${new Date(
                        baris.perubahanStatus.pada,
                      ).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}`
                    : ""}
                  {baris.perubahanStatus.alasan
                    ? ` — ${baris.perubahanStatus.alasan}`
                    : ""}
                  {baris.perubahanStatus.jumlah > 1
                    ? ` (${baris.perubahanStatus.jumlah}x diubah)`
                    : ""}
                </p>
              </div>
            )}

            {baris.perubahanJam && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold text-amber-700">
                  Jam diubah petugas
                </p>
                <p className="text-[11px] text-amber-900 break-words">
                  {baris.perubahanJam.dariMasuk !== baris.perubahanJam.keMasuk &&
                    `Masuk ${baris.perubahanJam.dariMasuk || "(kosong)"} → ${
                      baris.perubahanJam.keMasuk || "(kosong)"
                    }. `}
                  {baris.perubahanJam.dariPulang !==
                    baris.perubahanJam.kePulang &&
                    `Pulang ${baris.perubahanJam.dariPulang || "(kosong)"} → ${
                      baris.perubahanJam.kePulang || "(kosong)"
                    }. `}
                  Oleh {baris.perubahanJam.oleh || "-"}
                  {baris.perubahanJam.pada
                    ? `, ${new Date(baris.perubahanJam.pada).toLocaleString(
                        "id-ID",
                        { dateStyle: "short", timeStyle: "short" },
                      )}`
                    : ""}
                  {baris.perubahanJam.alasan
                    ? ` — ${baris.perubahanJam.alasan}`
                    : ""}
                  {baris.perubahanJam.jumlah > 1
                    ? ` (${baris.perubahanJam.jumlah}x diubah)`
                    : ""}
                </p>
              </div>
            )}

            {/* ---------- UBAH JAM ---------- */}

            {editJam === baris.id && (
              <div className="mt-3 pt-3 border-t border-mist">
                <p className="text-[11px] text-navy/70">
                  Ubah jam <b>{baris.nama || baris.no_wa}</b> tanggal{" "}
                  {baris.tanggal}.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-[10px] text-navy/60 mb-1">Jam masuk</p>
                    <input
                      type="time"
                      value={jamMasukBaru}
                      onChange={(e) => setJamMasukBaru(e.target.value)}
                      disabled={sedangSimpanJam === baris.id}
                      className="w-full border border-mist rounded-xl px-3 py-2 text-[13px] font-bold outline-none focus:border-brand disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] text-navy/60 mb-1">Jam pulang</p>
                    <input
                      type="time"
                      value={jamPulangBaru}
                      onChange={(e) => setJamPulangBaru(e.target.value)}
                      disabled={sedangSimpanJam === baris.id}
                      className="w-full border border-mist rounded-xl px-3 py-2 text-[13px] font-bold outline-none focus:border-brand disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Dampaknya disebut sebelum disimpan. Jam
                    menggerakkan seluruh hitungan di rekap, dan
                    tidak satu pun angka itu tampil di kartu ini —
                    jadi tanpa keterangan ini perubahannya
                    seolah tidak berakibat apa-apa. */}
                {jamKeInput(baris.jamMasuk) !== jamMasukBaru && (
                  <p className="mt-2 text-[10px] text-amber-700 leading-relaxed">
                    Jam masuk berubah: Terlambat dan Jam Harus Checkout
                    dihitung ulang — dan karena Lembur diukur dari Jam Harus
                    Checkout, Lembur ikut berubah.
                  </p>
                )}

                {jamKeInput(baris.jamPulang) !== jamPulangBaru && (
                  <p className="mt-2 text-[10px] text-amber-700 leading-relaxed">
                    {jamPulangBaru
                      ? "Jam pulang berubah: Menit Kerja, Durasi Lembur, dan Pembulatan Lembur dihitung ulang."
                      : "Jam pulang dikosongkan: baris ini kembali berstatus belum absen pulang, dan Menit Kerja serta Lembur menjadi kosong."}
                  </p>
                )}

                <input
                  type="text"
                  value={alasanJam}
                  onChange={(e) => setAlasanJam(e.target.value)}
                  disabled={sedangSimpanJam === baris.id}
                  placeholder="Catatan (opsional), mis. foto gagal diunggah"
                  maxLength={300}
                  className="mt-2 w-full border border-mist rounded-xl px-3 py-2 text-[12px] outline-none focus:border-brand disabled:opacity-60"
                />

                <p className="mt-1 text-[10px] text-navy/50 leading-relaxed">
                  Foto, titik lokasi, dan kinerja harian tidak berubah — cap
                  waktu di dalam foto juga tidak. Perubahan ini tercatat
                  beserta nama petugas dan waktunya.
                </p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => ubahJam(baris)}
                    disabled={
                      sedangSimpanJam === baris.id ||
                      !jamMasukBaru ||
                      (jamKeInput(baris.jamMasuk) === jamMasukBaru &&
                        jamKeInput(baris.jamPulang) === jamPulangBaru)
                    }
                    className="flex-1 bg-brand text-white py-2 rounded-xl font-bold text-[12px] active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {sedangSimpanJam === baris.id ? "Menyimpan..." : "Simpan"}
                  </button>

                  <button
                    onClick={() => setEditJam(null)}
                    disabled={sedangSimpanJam === baris.id}
                    className="flex-1 border border-mist text-navy py-2 rounded-xl font-bold text-[12px] active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* ---------- UBAH STATUS ---------- */}

            {editStatus === baris.id && (
              <div className="mt-3 pt-3 border-t border-mist">
                <p className="text-[11px] text-navy/70">
                  Ubah status kehadiran{" "}
                  <b>{baris.nama || baris.no_wa}</b> tanggal {baris.tanggal}.
                </p>

                <div className="flex gap-2 mt-2">
                  {JENIS_KEHADIRAN.map((j) => (
                    <button
                      key={j.nilai}
                      onClick={() => setStatusBaru(j.nilai)}
                      disabled={sedangSimpan === baris.id}
                      className={
                        "flex-1 py-2 rounded-xl font-bold text-[11px] border transition-all active:scale-[0.98] disabled:opacity-60 " +
                        (statusBaru === j.nilai
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-navy border-mist")
                      }
                    >
                      {j.label}
                    </button>
                  ))}
                </div>

                {/* Konsekuensinya disebut sebelum disimpan, bukan
                    sesudah. Status bukan cuma label: ia dasar
                    perhitungan jam kerja, dan petugas tidak bisa
                    menduga itu dari kata "Dinas Luar" saja. */}
                {statusBaru === "DINAS" && baris.attendanceType !== "DINAS" && (
                  <p className="mt-2 text-[10px] text-amber-700 leading-relaxed">
                    Dinas luar tidak terikat jam kantor. Kolom Jam Harus
                    Checkout, Terlambat, Menit Kerja, dan Lembur akan
                    dikosongkan di rekap dan di berkas Excel.
                  </p>
                )}

                {baris.attendanceType === "DINAS" &&
                  statusBaru &&
                  statusBaru !== "DINAS" && (
                    <p className="mt-2 text-[10px] text-amber-700 leading-relaxed">
                      Jam kantor akan berlaku lagi. Terlambat, Menit Kerja,
                      dan Lembur dihitung ulang dari jam masuk dan jam pulang
                      yang sudah tercatat.
                    </p>
                  )}

                <input
                  type="text"
                  value={alasanEdit}
                  onChange={(e) => setAlasanEdit(e.target.value)}
                  disabled={sedangSimpan === baris.id}
                  placeholder="Catatan (opsional), mis. ditugaskan ke Kanwil"
                  maxLength={300}
                  className="mt-2 w-full border border-mist rounded-xl px-3 py-2 text-[12px] outline-none focus:border-brand disabled:opacity-60"
                />

                <p className="mt-1 text-[10px] text-navy/50 leading-relaxed">
                  Jam, foto, dan titik lokasi tidak berubah. Perubahan ini
                  tercatat beserta nama petugas dan waktunya.
                </p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => ubahStatus(baris)}
                    disabled={
                      sedangSimpan === baris.id ||
                      !statusBaru ||
                      statusBaru === baris.attendanceType
                    }
                    className="flex-1 bg-brand text-white py-2 rounded-xl font-bold text-[12px] active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {sedangSimpan === baris.id ? "Menyimpan..." : "Simpan"}
                  </button>

                  <button
                    onClick={() => setEditStatus(null)}
                    disabled={sedangSimpan === baris.id}
                    className="flex-1 border border-mist text-navy py-2 rounded-xl font-bold text-[12px] active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

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
              editStatus !== baris.id &&
              editJam !== baris.id && (
                <div className="mt-3 flex gap-4 flex-wrap">
                  <button
                    onClick={() => mulaiUbahJam(baris)}
                    className="text-[11px] font-bold text-brand"
                  >
                    Ubah jam
                  </button>

                  <button
                    onClick={() => mulaiUbahStatus(baris)}
                    className="text-[11px] font-bold text-brand"
                  >
                    Ubah status
                  </button>

                  <button
                    onClick={() => {
                      setKonfirmasiHapus(baris.id);
                      setEditStatus(null);
                      setEditJam(null);
                      setPesan(null);
                      setError(null);
                    }}
                    className="text-[11px] font-bold text-red-600"
                  >
                    Hapus data ini
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rekap;
