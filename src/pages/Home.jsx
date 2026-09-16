import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";

import { API_URL, FORM_CUTI_URL, NOMOR_BOT_SISKA } from "../config";

// =========================================================
// HELPER
// =========================================================

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizePhoneNumber(value) {
  if (!value) return "";

  const digits = String(value).trim().replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (!digits.startsWith("62")) {
    return `62${digits}`;
  }

  return digits;
}

// "03.13" -> "3 jam 13 menit", "03.00" -> "3 jam".
function lamaJam(nilai) {
  const cocok = /^(\d{1,2})[.:](\d{2})$/.exec(String(nilai || ""));

  if (!cocok) return "";

  const jam = Number(cocok[1]);
  const menit = Number(cocok[2]);

  return [jam ? `${jam} jam` : "", menit ? `${menit} menit` : ""]
    .filter(Boolean)
    .join(" ") || "0 jam";
}

// =========================================================
// KARTU LEMBUR
// =========================================================
//
// Lembur non-ASN tidak diisi di web. Mulainya jam harus pulang,
// selesainya jam absen pulang, dan persetujuannya terjadi di
// WhatsApp — atasan membalas pesan dari bot SisKA. Kartu ini
// menampilkan keadaannya hari ini dan mengantar pegawai ke chat
// bot untuk mengajukan.

const LINK_BOT = `https://wa.me/${NOMOR_BOT_SISKA}?text=menu`;

function KartuLembur({ lembur }) {
  let isi;
  let tombol = { teks: "AJUKAN LEWAT WA", link: LINK_BOT };

  if (!lembur) {
    isi = "Diajukan lewat WhatsApp SisKA, lalu disetujui atasan.";
  } else if (!lembur.sudahMasuk) {
    isi = "Absen masuk dulu. Jam mulai lembur dihitung dari jam masuk Anda.";
    tombol = null;
  } else if (lembur.dinasLuar) {
    isi = "Lembur tidak berlaku untuk Dinas Luar.";
    tombol = null;
  } else if (!lembur.jamMulai) {
    // Jam harus pulang kosong padahal sudah absen masuk dan bukan
    // dinas luar: jabatannya memang mengikuti jadwal tugas (supir).
    // Tanpa cabang ini kartunya menulis "Mulai  (jam pulang Anda)"
    // dengan jam kosong.
    isi = "Lembur tidak berlaku untuk jabatan Anda — jam kerja mengikuti jadwal tugas.";
    tombol = null;
  } else if (lembur.disetujui && lembur.sudahPulang) {
    isi = (
      <>
        ✅ Tercatat {lembur.jamMulai}–{lembur.jamSelesai}
        <br />
        Dihitung <b>{lamaJam(lembur.pembulatan)}</b>
        {lembur.durasi && lembur.durasi !== lembur.pembulatan
          ? ` (dari ${lamaJam(lembur.durasi)})`
          : ""}
      </>
    );
    tombol = null;
  } else if (lembur.disetujui) {
    // Absen pulang lewat web tidak diketahui bot, jadi bot tidak
    // akan meminta 3 foto bukti lemburnya. Diarahkan ke WA.
    isi = (
      <>
        ✅ Disetujui. Mulai {lembur.jamMulai}, selesai saat absen pulang.
        <br />
        Absen pulang lewat WA agar bot meminta foto bukti.
      </>
    );
    tombol = { teks: "PULANG LEWAT WA", link: LINK_BOT };
  } else if (lembur.sudahPulang) {
    isi = `Sudah absen pulang ${lembur.jamSelesai}, tanpa persetujuan lembur.`;
  } else {
    isi = (
      <>
        Mulai <b>{lembur.jamMulai}</b> (jam pulang Anda). Belum disetujui
        atasan.
        <br />
        Di WA: ketik <b>9</b> lalu <b>2</b>.
      </>
    );
  }

  const kelas =
    "relative overflow-hidden text-left rounded-[22px] bg-brand text-white p-4 min-h-[175px] flex flex-col shadow-sm";

  const isiKartu = (
    <>
      <h2 className="text-lg font-bold relative">Lembur</h2>

      {/* mb-3: tanpa jarak ini tombol menempel ke teks saat
          isinya panjang, karena mt-auto hanya mendorong ke
          bawah selama masih ada ruang sisa. */}
      <p className="text-xs leading-relaxed mt-2 mb-3 text-white/90 relative">
        {isi}
      </p>

      {tombol && (
        <span className="mt-auto bg-white text-brand rounded-full py-2 px-1 text-center text-[11px] font-bold">
          {tombol.teks}
        </span>
      )}
    </>
  );

  return tombol ? (
    <a
      href={tombol.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${kelas} active:scale-[0.98] transition-all`}
    >
      {isiKartu}
    </a>
  ) : (
    <div className={kelas}>{isiKartu}</div>
  );
}

function Home({ keAttendance, keRiwayat, keProfile, keLogout }) {
  const [user, setUser] = useState(null);

  const [attendance, setAttendance] = useState({
    status: "Belum Absen",
    clockIn: null,
    clockOut: null,
  });

  // Keadaan lembur hari ini, dibaca dari absensi yang sama.
  // null = absensi hari ini belum terbaca dari server.
  const [lembur, setLembur] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Jam pada kartu "Hari ini" harus ikut berjalan, bukan
  // berhenti di waktu halaman dibuka.
  const [sekarang, setSekarang] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setSekarang(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const identifier =
          localStorage.getItem("userNip") || localStorage.getItem("userPhone");

        console.log("=================================");
        console.log("🏠 HOME");
        console.log("Identifier:", identifier);
        console.log("userNip:", localStorage.getItem("userNip"));
        console.log("userPhone:", localStorage.getItem("userPhone"));
        console.log("=================================");

        if (!identifier) {
          throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
        }

        const url = `${API_URL}/api/pegawai/${encodeURIComponent(identifier)}`;

        console.log("📡 GET PEGAWAI:", url);

        const profileResponse = await fetch(url);

        console.log(
          "📥 Response pegawai:",
          profileResponse.status,
          profileResponse.statusText,
        );

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json().catch(() => null);

          console.error("❌ Gagal mengambil pegawai:", errorData);

          throw new Error(
            errorData?.message || "Gagal mengambil data pegawai dari database.",
          );
        }

        const profileData = await profileResponse.json();

        console.log("✅ DATA PEGAWAI:", profileData);

        setUser(profileData);

        localStorage.setItem("userData", JSON.stringify(profileData));

        localStorage.setItem("userPhone", profileData.no_wa || identifier);

        console.log("💾 Data pegawai disimpan ke localStorage");

        // =====================================================
        // AMBIL ABSENSI HARI INI DARI DATABASE
        // =====================================================

        // Endpoint ini dicari berdasarkan nomor WhatsApp,
        // bukan NIP.
        const no_wa = normalizePhoneNumber(profileData.no_wa || identifier);

        if (no_wa) {
          try {
            const todayResponse = await fetch(
              `${API_URL}/api/absensi/today/${encodeURIComponent(no_wa)}` +
                `?tanggal=${getTodayKey()}`,
            );

            console.log("📡 GET ABSENSI HARI INI:", todayResponse.status);

            if (todayResponse.ok) {
              const todayData = await todayResponse.json();

              console.log("✅ ABSENSI HARI INI:", todayData);

              // Respons backend: { exists, data }
              const absensiHariIni = todayData.data;

              // Server bilang tidak ada absensi hari ini, tapi browser
              // masih menyimpan salinannya. Itu terjadi kalau datanya
              // dihapus dari sisi lain — misalnya reset data pengujian
              // lewat bot. Tanpa dibuang, cadangan di bawah akan
              // menghidupkannya lagi dan halaman ini menampilkan
              // absensi yang sudah tidak ada.
              if (!absensiHariIni) {
                try {
                  localStorage.removeItem(`attendance_${getTodayKey()}`);
                } catch (storageError) {
                  console.error("Gagal menghapus draf absensi:", storageError);
                }
              }

              setAttendance({
                status: absensiHariIni?.clockOut
                  ? "Sudah Absen Keluar"
                  : absensiHariIni?.clockIn
                    ? "Sudah Absen Masuk"
                    : "Belum Absen",

                clockIn: absensiHariIni?.clockIn || null,
                clockOut: absensiHariIni?.clockOut || null,
              });

              // Jam mulai lembur = jam harus pulang, dihitung
              // backend dari jam masuk. Durasinya hanya terisi
              // kalau atasan sudah menyetujui.
              setLembur({
                sudahMasuk: Boolean(absensiHariIni?.clockIn),
                sudahPulang: Boolean(absensiHariIni?.clockOut),
                dinasLuar: absensiHariIni?.attendanceType === "DINAS",
                disetujui: absensiHariIni?.lembur?.disetujui === true,
                jamMulai: todayData.jamKerja?.jamHarusCheckout || "",
                jamSelesai: absensiHariIni?.clockOut || "",
                durasi: todayData.jamKerja?.durasiLembur || "",
                pembulatan: todayData.jamKerja?.pembulatanLembur || "",
              });
            } else {
              console.error(
                "❌ Gagal mengambil absensi hari ini:",
                await todayResponse.text(),
              );
            }
          } catch (attendanceError) {
            console.error("❌ Error mengambil absensi:", attendanceError);
          }
        }

        // =====================================================
        // FALLBACK LOCAL STORAGE
        // =====================================================

        const todayKey = getTodayKey();

        const savedData = localStorage.getItem(`attendance_${todayKey}`);

        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);

            // Hanya gunakan localStorage kalau database
            // belum memberikan data
            setAttendance((current) => ({
              status: current.clockOut
                ? "Sudah Absen Keluar"
                : current.clockIn
                  ? "Sudah Absen Masuk"
                  : parsed.clockOut
                    ? "Sudah Absen Keluar"
                    : parsed.clockIn
                      ? "Sudah Absen Masuk"
                      : "Belum Absen",

              clockIn: current.clockIn || parsed.clockIn || null,

              clockOut: current.clockOut || parsed.clockOut || null,
            }));
          } catch (storageError) {
            console.error("Gagal membaca localStorage absensi:", storageError);
          }
        }
      } catch (err) {
        console.error("❌ Error loading Home data:", err);

        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // =========================================================
  // LOADING
  // =========================================================

  if (isLoading) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-paper flex items-center justify-center font-sans text-navy">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-screen w-full max-w-[430px] mx-auto bg-paper flex flex-col items-center justify-center font-sans text-navy px-6">
        <p className="text-red-500 font-bold mb-2">Terjadi Kesalahan</p>

        <p className="text-navy/70 text-sm text-center mb-4">{error}</p>

        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-brand text-white font-semibold"
          >
            Coba Lagi
          </button>

          {/* Tanpa ini pengguna terkunci di layar error: sesi
              tersimpan membuat aplikasi selalu mulai dari Home,
              dan reload akan gagal terus. */}
          <button
            onClick={keLogout}
            className="px-4 py-2 rounded-xl border border-mist bg-white text-brand font-semibold"
          >
            Masuk Ulang
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-paper font-sans text-navy relative overflow-x-hidden">
      {/* HEADER */}

      <header className="bg-white px-6 pt-8 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-navy/60">Selamat datang,</p>

            <h1 className="text-xl font-bold text-navy">
              {user?.nama || "Pegawai"}
            </h1>
          </div>

          <button className="w-10 h-10 rounded-full bg-mist flex items-center justify-center">
            <svg
              className="w-6 h-6 text-brand"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.5-2v-5a6.5 6.5 0 00-13 0v5L4 17h5m6 0a3 3 0 01-6 0"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* PROFILE */}

      <section className="px-5">
        <div className="relative overflow-hidden rounded-[20px] bg-brand px-4 py-3 text-white shadow-lg">
          <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-white/10" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-bold text-base truncate">
                {user?.nama || "Pengguna"}
              </h2>

              <p className="text-xs text-mist mt-0.5 truncate">
                {user?.nip || "-"}
                {" \u2022 "}
                {user?.jabatan || "-"}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
              <span className="w-2 h-2 rounded-full bg-mist" />

              <span className="text-xs font-semibold">{attendance.status}</span>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY */}

      <section className="px-5 mt-3">
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-mist">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-navy/60">Hari ini</p>

              <h2 className="font-bold text-navy mt-1">
                {sekarang.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>

            <div className="text-right">
              <p className="text-xs text-navy/60">Jam</p>

              <p className="font-bold text-brand">
                {sekarang.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-mist rounded-2xl p-3">
              <p className="text-xs text-navy/60">Jam Masuk</p>

              <p className="font-bold text-navy mt-1">
                {attendance.clockIn || "--:--"}
              </p>
            </div>

            <div className="bg-mist rounded-2xl p-3">
              <p className="text-xs text-navy/60">Jam Keluar</p>

              <p className="font-bold text-navy mt-1">
                {attendance.clockOut || "--:--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ATTENDANCE TYPE */}

      <section className="px-5 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold text-navy text-base">Mulai Absensi</h2>

            <p className="text-xs text-navy/60 mt-0.5">
              Pilih lokasi kerja hari ini
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* TOMBOL WFO */}
          <button
            onClick={() => {
              console.log("➡️ Masuk Attendance WFO");

              if (!user?.no_wa) {
                alert(
                  "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                );
                return;
              }

              keAttendance("WFO");
            }}
            className="group flex flex-col items-center text-center bg-white rounded-[18px] p-3 shadow-sm border border-mist active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center text-navy">
              <span className="text-lg">🏢</span>
            </div>

            <p className="font-bold text-sm mt-2">WFO</p>

            <p className="text-[11px] text-navy/60 mt-1">Bekerja di Kantor</p>
          </button>

          {/* TOMBOL WFH */}
          <button
            onClick={() => {
              console.log("➡️ Masuk Attendance WFH");

              if (!user?.no_wa) {
                alert(
                  "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                );
                return;
              }

              keAttendance("WFH");
            }}
            className="group flex flex-col items-center text-center bg-white rounded-[18px] p-3 shadow-sm border border-mist active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center text-navy">
              <span className="text-lg">🏠</span>
            </div>

            <p className="font-bold text-sm mt-2">WFH</p>

            <p className="text-[11px] text-navy/60 mt-1">Bekerja dari Rumah</p>
          </button>

          {/* TOMBOL DINAS */}
          <button
            onClick={() => {
              console.log("➡️ Masuk Attendance DINAS");

              if (!user?.no_wa) {
                alert(
                  "Data nomor WhatsApp belum tersedia. Silakan login kembali.",
                );
                return;
              }

              keAttendance("DINAS");
            }}
            className="group flex flex-col items-center text-center bg-white rounded-[18px] p-3 shadow-sm border border-mist active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center text-navy">
              <span className="text-lg">🚗</span>
            </div>

            <p className="font-bold text-sm mt-2">Dinas Luar</p>

            <p className="text-[11px] text-navy/60 mt-1">Tugas di Luar Kantor</p>
          </button>
        </div>
      </section>

      {/* FEATURE */}

      <section className="px-5 mt-4 pb-24">
        <div className="grid grid-cols-2 gap-4">
          <KartuLembur lembur={lembur} />

          {/* Sama dengan menu 9 → 3 di bot: cuti diajukan lewat
              formulir, jadi kartu ini cukup membukanya. */}
          <a
            href={FORM_CUTI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative overflow-hidden text-left rounded-[22px] bg-navy text-white p-4 min-h-[175px] flex flex-col shadow-sm active:scale-[0.98] transition-all"
          >
            <h2 className="text-lg font-bold relative">Cuti</h2>

            <p className="text-xs leading-relaxed mt-2 text-white/90 relative">
              Isi formulir pengajuan cuti. Formulirnya terbuka di tab baru.
            </p>

            <span className="mt-auto bg-white text-navy rounded-full py-2 text-center text-xs font-bold">
              AJUKAN CUTI
            </span>
          </a>
        </div>
      </section>

      <BottomNav
        activeNav="attendance"
        keHome={() => {}}
        keRiwayat={keRiwayat}
        keProfile={keProfile}
      />
    </div>
  );
}

export default Home;
