import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiArrowLeft, FiAlertTriangle, FiMapPin, FiLogOut, FiLogIn, FiCheckCircle } from "react-icons/fi";
import { useAlert } from "../context/AlertContext";
import { API_URL, urlFoto } from "../config";
import logoKemnaker from "../assets/logo-kemnaker.png";

// =========================================================
// PETA UNTUK WATERMARK
// =========================================================

// Sumber tile peta. Kalau volume absensi sudah besar,
// arahkan ke tile server sendiri di VPS — kebijakan
// pemakaian tile.openstreetmap.org tidak untuk beban tinggi.
// Sisi terpanjang foto dibatasi. Kamera HP bisa menghasilkan
// 4000px lebih; tanpa batas ini unggahannya berat dan teks
// watermark jadi sangat kecil dibanding gambarnya.
const MAX_DIMENSI_FOTO = 1280;

// Kepekatan maksimum latar watermark di tepi bawah foto.
// Naikkan kalau teks kurang terbaca, turunkan kalau foto
// terasa terhalang.
const WATERMARK_OPACITY = 0.55;

const TILE_URL = "https://tile.openstreetmap.org";

const MAP_ZOOM = 16;
const TILE_SIZE = 256;
const TILE_TIMEOUT = 6000;

function lonKeTileX(lon, zoom) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latKeTileY(lat, zoom) {
  const rad = (lat * Math.PI) / 180;

  return (
    ((1 -
      Math.log(
        Math.tan(rad) + 1 / Math.cos(rad)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  );
}

function muatTile(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Wajib. Tanpa CORS, canvas jadi "tainted" dan
    // toDataURL() melempar SecurityError, yang artinya
    // seluruh proses absensi ikut gagal.
    img.crossOrigin = "anonymous";

    const timer = setTimeout(() => {
      img.src = "";

      reject(new Error("Tile peta timeout."));
    }, TILE_TIMEOUT);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timer);

      reject(
        new Error(`Gagal memuat tile: ${url}`)
      );
    };

    img.src = url;
  });
}

function gambarPenanda(ctx, x, y, ukuran) {
  const radius = Math.max(6, ukuran * 0.055);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);

  ctx.fillStyle = "#123B5D";
  ctx.fill();

  ctx.lineWidth = Math.max(2, radius * 0.35);
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

async function buatThumbnailPeta(lat, lng, ukuran) {
  const jumlahTile = Math.pow(2, MAP_ZOOM);

  const pusatX =
    lonKeTileX(lng, MAP_ZOOM) * TILE_SIZE;

  const pusatY =
    latKeTileY(lat, MAP_ZOOM) * TILE_SIZE;

  const kiri = pusatX - ukuran / 2;
  const atas = pusatY - ukuran / 2;

  const canvas =
    document.createElement("canvas");

  canvas.width = ukuran;
  canvas.height = ukuran;

  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, ukuran, ukuran);

  const tileAwalX = Math.floor(kiri / TILE_SIZE);
  const tileAkhirX = Math.floor(
    (kiri + ukuran - 1) / TILE_SIZE
  );

  const tileAwalY = Math.floor(atas / TILE_SIZE);
  const tileAkhirY = Math.floor(
    (atas + ukuran - 1) / TILE_SIZE
  );

  const tugas = [];

  for (let x = tileAwalX; x <= tileAkhirX; x++) {
    for (let y = tileAwalY; y <= tileAkhirY; y++) {
      // Di luar kutub tidak ada tile-nya.
      if (y < 0 || y >= jumlahTile) continue;

      const xTerbungkus =
        ((x % jumlahTile) + jumlahTile) % jumlahTile;

      const url =
        `${TILE_URL}/${MAP_ZOOM}/` +
        `${xTerbungkus}/${y}.png`;

      tugas.push(
        muatTile(url)
          .then((img) => {
            ctx.drawImage(
              img,
              x * TILE_SIZE - kiri,
              y * TILE_SIZE - atas,
              TILE_SIZE,
              TILE_SIZE
            );

            return true;
          })
          .catch((error) => {
            console.error(
              "❌ Tile peta gagal:",
              error.message
            );

            return false;
          })
      );
    }
  }

  const hasil = await Promise.all(tugas);

  // Semua tile gagal (offline / tile server diblokir):
  // lebih baik tanpa peta daripada kotak abu-abu kosong.
  if (!hasil.some(Boolean)) {
    return null;
  }

  gambarPenanda(
    ctx,
    ukuran / 2,
    ukuran / 2,
    ukuran
  );

  // Atribusi OpenStreetMap wajib dicantumkan (ODbL).
  const tinggiFont = Math.max(
    10,
    Math.round(ukuran * 0.055)
  );

  ctx.font = `${tinggiFont}px Arial`;

  const teks = "© OpenStreetMap";

  const lebarTeks =
    ctx.measureText(teks).width;

  ctx.fillStyle = "rgba(255,255,255,0.78)";

  ctx.fillRect(
    ukuran - lebarTeks - 10,
    ukuran - tinggiFont - 8,
    lebarTeks + 10,
    tinggiFont + 8
  );

  ctx.fillStyle = "#333333";

  ctx.fillText(
    teks,
    ukuran - lebarTeks - 5,
    ukuran - 6
  );

  return canvas;
}

function Attendance({
  jenisKehadiran = "WFO",
  keHome,
  keRiwayat,
  keProfile,
  keRekap,
  keLogout,
  keKinerja,
}) {
  const { showAlert } = useAlert();
  const inputKameraRef = useRef(null);
  const lokasiRef = useRef(null);
  const attendanceTypeRef = useRef(jenisKehadiran);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [previewFoto, setPreviewFoto] = useState(null);
  const [lokasi, setLokasi] = useState(null);
  const [alamat, setAlamat] = useState("Mencari alamat...");

  const [kameraAktif, setKameraAktif] = useState(false);
  const [kameraSiap, setKameraSiap] = useState(false);
  const [petugas, setPetugas] = useState(false);
  const [sekarang, setSekarang] = useState(() => new Date());

  const [attendance, setAttendance] = useState({
    date: null,
    attendanceType: null,

    clockIn: null,
    clockInPhoto: null,
    clockInLocation: null,
    clockInAddress: null,

    clockOut: null,
    clockOutPhoto: null,
    clockOutLocation: null,
    clockOutAddress: null,

    kinerja_harian: null,
  });

  // Jam digital real-time berjalan setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setSekarang(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Periksa hak akses petugas untuk navbar desktop
  useEffect(() => {
    const cekPetugas = async () => {
      try {
        const noWa = localStorage.getItem("userPhone");
        if (!noWa) return;
        const response = await fetch(
          `${API_URL}/api/rekap/izin?pemohon=${encodeURIComponent(noWa)}`
        );
        if (!response.ok) return;
        const hasil = await response.json();
        setPetugas(Boolean(hasil.petugas));
      } catch {
        // Abaikan jika gagal
      }
    };
    cekPetugas();
  }, []);

  const badgeConfig = {
    WFO: {
      label: "WFO (Work From Office)",
      icon: "🏢",
      color: "bg-teal/15 text-teal border border-teal/30",
      desc: "Presensi kehadiran di kantor Biro Keuangan dan BMN.",
      lokasiTip: "Pastikan Anda berada di area kantor Kemnaker RI.",
    },
    WFH: {
      label: "WFH (Work From Home)",
      icon: "🏠",
      color: "bg-orange-light/25 text-navy border border-orange-light/40",
      desc: "Presensi kerja mandiri dari rumah / kediaman.",
      lokasiTip: "Geotag lokasi tempat tinggal Anda akan diverifikasi otomatis.",
    },
    DINAS: {
      label: "Dinas Luar",
      icon: "🚗",
      color: "bg-green/25 text-navy border border-green/40",
      desc: "Presensi tugas dinas luar kantor.",
      lokasiTip: "Titik koordinat lokasi penugasan dinas akan dicatat dalam berkas rekap.",
    },
  }[jenisKehadiran] || {
    label: jenisKehadiran,
    icon: "📍",
    color: "bg-brand/10 text-brand border border-brand/20",
    desc: "Presensi kehadiran pegawai.",
    lokasiTip: "Pastikan GPS aktif untuk merekam koordinat kehadiran.",
  };

  // =========================================================
  // INIT
  // =========================================================

  useEffect(() => {
    attendanceTypeRef.current = jenisKehadiran;

    try {
      const savedUser = localStorage.getItem("userData");

      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        console.log("=================================");
        console.log("📋 ATTENDANCE INIT");
        console.log("=================================");
        console.log("Pegawai:", parsedUser.nama);
        console.log("No WA:", parsedUser.no_wa);

        setUser(parsedUser);
      }
    } catch (error) {
      console.error("❌ Gagal membaca userData:", error);
    }

    const savedData = localStorage.getItem(
      `attendance_${getTodayKey()}`
    );

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);

        setAttendance(parsed);

        if (parsed.clockOutPhoto) {
          setPreviewFoto(parsed.clockOutPhoto);
        } else if (parsed.clockInPhoto) {
          setPreviewFoto(parsed.clockInPhoto);
        }

        if (parsed.clockOutLocation) {
          setLokasi(parsed.clockOutLocation);
          setAlamat(
            parsed.clockOutAddress || "Alamat tidak tersedia"
          );
        } else if (parsed.clockInLocation) {
          setLokasi(parsed.clockInLocation);
          setAlamat(
            parsed.clockInAddress || "Alamat tidak tersedia"
          );
        }
      } catch (error) {
        console.error("❌ Gagal membaca attendance:", error);
      }
    }
  }, [jenisKehadiran]);

  // =========================================================
  // SINKRON DENGAN DATABASE
  // =========================================================

  // localStorage saja tidak cukup: kalau pegawai ganti HP,
  // ganti browser, atau storage-nya terhapus, tombolnya
  // kembali ke "Clock In" padahal di database sudah ada
  // Clock In hari itu, sehingga Clock Out tidak pernah bisa
  // dilakukan. Database yang jadi acuan; localStorage hanya
  // melengkapi data yang belum sempat terkirim (mis. Clock
  // Out yang masih menunggu kinerja harian).

  useEffect(() => {
    let dibatalkan = false;

    const sinkronkanAbsensiHariIni = async () => {
      try {
        const no_wa = normalizePhoneNumber(
          user?.no_wa ||
            localStorage.getItem("userPhone")
        );

        if (!no_wa) return;

        const tanggal = getTodayKey();

        const response = await fetch(
          `${API_URL}/api/absensi/today/${no_wa}` +
            `?tanggal=${tanggal}`
        );

        if (!response.ok) return;

        const result = await response.json();

        if (dibatalkan) return;

        if (!result.exists || !result.data) {
          console.log(
            "ℹ️ Belum ada absensi hari ini di database."
          );
          return;
        }

        const dataDb = result.data;

        let dataLokal = {};

        try {
          dataLokal =
            JSON.parse(
              localStorage.getItem(
                `attendance_${tanggal}`
              )
            ) || {};
        } catch (storageError) {
          console.error(
            "❌ Gagal membaca attendance lokal:",
            storageError
          );
        }

        const gabungan = {
          ...dataLokal,

          date: dataDb.tanggal || tanggal,

          attendanceType:
            dataDb.attendanceType ||
            dataLokal.attendanceType ||
            null,

          clockIn:
            dataDb.clockIn ||
            dataLokal.clockIn ||
            null,

          clockInPhoto:
            dataDb.clockInPhoto ||
            dataLokal.clockInPhoto ||
            null,

          clockInLocation:
            dataDb.clockInLocation ||
            dataLokal.clockInLocation ||
            null,

          clockInAddress:
            dataDb.clockInAddress ||
            dataLokal.clockInAddress ||
            null,

          clockOut:
            dataDb.clockOut ||
            dataLokal.clockOut ||
            null,

          clockOutPhoto:
            dataDb.clockOutPhoto ||
            dataLokal.clockOutPhoto ||
            null,

          clockOutLocation:
            dataDb.clockOutLocation ||
            dataLokal.clockOutLocation ||
            null,

          clockOutAddress:
            dataDb.clockOutAddress ||
            dataLokal.clockOutAddress ||
            null,

          kinerja_harian:
            dataDb.kinerja_harian ||
            dataLokal.kinerja_harian ||
            null,
        };

        console.log(
          "🔄 Absensi hari ini disinkronkan dari database."
        );

        setAttendance(gabungan);

        localStorage.setItem(
          `attendance_${tanggal}`,
          JSON.stringify(gabungan)
        );

        setPreviewFoto(
          (current) =>
            current ||
            gabungan.clockOutPhoto ||
            gabungan.clockInPhoto ||
            null
        );
      } catch (error) {
        // Offline atau server mati: tetap pakai data lokal.
        console.error(
          "❌ Gagal sinkron absensi hari ini:",
          error
        );
      }
    };

    sinkronkanAbsensiHariIni();

    return () => {
      dibatalkan = true;
    };
  }, [user?.no_wa]);

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

  function getCurrentTime() {
    return new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function getCurrentDate() {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getWatermarkDateTime() {
    return new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  function getUserPhone() {
    const phone =
      user?.no_wa ||
      localStorage.getItem("userPhone");

    if (!phone) {
      throw new Error(
        "Nomor telepon pegawai tidak tersedia. Silakan login kembali."
      );
    }

    return String(phone);
  }

  function normalizePhoneNumber(value) {
    if (!value) return "";

    const digits = String(value)
      .trim()
      .replace(/\D/g, "");

    if (!digits) return "";

    if (digits.startsWith("0")) {
      return `62${digits.slice(1)}`;
    }

    if (!digits.startsWith("62")) {
      return `62${digits}`;
    }

    return digits;
  }

  // =========================================================
  // GPS
  // =========================================================

  const ambilLokasi = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("Browser Anda tidak mendukung GPS.")
        );
        return;
      }

      // Browser hanya mengizinkan GPS di "secure context" — HTTPS atau
      // localhost. Di halaman http:// biasa, getCurrentPosition langsung
      // gagal dengan kode 1 (PERMISSION_DENIED), SAMA PERSIS dengan kode
      // saat pengguna benar-benar menolak izin. Tanpa pemeriksaan ini,
      // pesannya berbunyi "izin lokasi ditolak" dan pegawai dikirim
      // mengejar setelan yang sebenarnya sudah benar — GPS menyala, izin
      // sudah diberikan, tapi permintaan izinnya memang tidak pernah
      // muncul karena browser menolak lebih dulu.
      if (!window.isSecureContext) {
        reject(
          new Error(
            "GPS diblokir browser karena halaman ini dibuka lewat http://, " +
              "bukan https://. Bukan izin Anda yang bermasalah.\n\n" +
              "Silakan absen lewat WhatsApp SisKA, atau laporkan ke admin " +
              "agar alamat web ini dipasangi HTTPS."
          )
        );
        return;
      }

      setLoadingText("Mencari lokasi GPS...");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const {
              latitude,
              longitude,
              accuracy,
            } = position.coords;

            console.log("📍 GPS:", {
              latitude,
              longitude,
              accuracy,
            });

            const alamatHasil = await reverseGeocode(
              latitude,
              longitude
            );

            const lokasiLengkap = {
              lat: latitude,
              lng: longitude,
              accuracy,
              address: alamatHasil,
            };

            lokasiRef.current = lokasiLengkap;

            setLokasi(lokasiLengkap);
            setAlamat(alamatHasil);

            resolve(lokasiLengkap);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          console.error("❌ GPS Error:", error);

          let message = "Gagal mendapatkan lokasi.";

          if (error.code === 1) {
            // Pesan browser sendiri yang membedakan keduanya: penolakan
            // karena bukan HTTPS berbunyi "Only secure origins are
            // allowed". Dijaga di sini juga, kalau-kalau isSecureContext
            // di atas terlewat pada browser lama.
            message = /secure origin/i.test(error.message || "")
              ? "GPS diblokir karena halaman ini dibuka lewat http://, bukan https://. Bukan izin Anda yang bermasalah — laporkan ke admin."
              : "Izin lokasi ditolak. Silakan izinkan akses lokasi.";
          }

          if (error.code === 2) {
            message =
              "Lokasi tidak tersedia. Pastikan GPS aktif.";
          }

          if (error.code === 3) {
            message =
              "Waktu mendapatkan lokasi habis. Silakan coba lagi.";
          }

          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    });
  };

  // =========================================================
  // REVERSE GEOCODE
  // =========================================================

  const reverseGeocode = async (lat, lng) => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?format=jsonv2` +
        `&lat=${lat}` +
        `&lon=${lng}` +
        `&zoom=18` +
        `&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Gagal mendapatkan alamat.");
      }

      const data = await response.json();

      return (
        data.display_name ||
        "Alamat tidak tersedia"
      );
    } catch (error) {
      console.error("❌ Reverse geocoding:", error);

      return "Alamat tidak tersedia";
    }
  };

  // =========================================================
  // KAMERA
  // =========================================================

  // Kamera dalam aplikasi hanya bisa dipakai di secure context
  // (HTTPS atau localhost). Di luar itu navigator.mediaDevices
  // bahkan tidak ada, jadi keberadaannya harus diperiksa, bukan
  // sekadar menangkap error.
  const kameraDidukung =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    window.isSecureContext;

  const hentikanStream = () => {
    const stream = streamRef.current;

    if (!stream) return;

    stream.getTracks().forEach((track) => track.stop());

    streamRef.current = null;
  };

  const tutupKamera = () => {
    hentikanStream();

    setKameraAktif(false);
    setKameraSiap(false);
  };

  // Kalau kamera tidak tersedia, pegawai diarahkan memotret
  // lewat aplikasi kamera HP lalu mengunggah hasilnya.
  const bukaPemilihBerkas = (alasan) => {
    if (!inputKameraRef.current) {
      showAlert({
        title: "Kamera Tidak Terbuka",
        message: "Tidak bisa membuka pengambilan foto.",
        type: "error",
      });
      return;
    }

    showAlert({
      title: "Gunakan Kamera HP",
      message: `${alasan}\n\nSilakan ambil foto dengan aplikasi Kamera di HP Anda, lalu pilih foto tersebut pada layar berikutnya.`,
      type: "info",
      buttonText: "Pilih Foto",
      onClose: () => {
        if (inputKameraRef.current) {
          inputKameraRef.current.value = "";
          inputKameraRef.current.click();
        }
      },
    });
  };

  const bukaKamera = () => {
    if (!kameraDidukung) {
      bukaPemilihBerkas(
        window.isSecureContext
          ? "Kamera tidak tersedia di perangkat ini."
          : "Kamera hanya bisa dipakai lewat koneksi HTTPS."
      );
      return;
    }

    setKameraAktif(true);
  };

  // Stream dinyalakan setelah elemen video ada di layar.
  useEffect(() => {
    if (!kameraAktif) return;

    let dibatalkan = false;

    const nyalakan = async () => {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 1280 },
            },
            audio: false,
          });

        if (dibatalkan) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          await videoRef.current.play().catch(() => {});
        }

        setKameraSiap(true);
      } catch (error) {
        console.error("❌ Gagal membuka kamera:", error);

        if (dibatalkan) return;

        setKameraAktif(false);
        setKameraSiap(false);

        bukaPemilihBerkas(
          error?.name === "NotAllowedError"
            ? "Izin kamera ditolak."
            : "Kamera tidak bisa dibuka."
        );
      }
    };

    nyalakan();

    return () => {
      dibatalkan = true;
    };
  }, [kameraAktif]);

  // Kamera jangan tetap menyala kalau halaman ditinggalkan.
  useEffect(() => {
    return () => {
      hentikanStream();
    };
  }, []);

  const ambilJepretan = async () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      showAlert({
        title: "Kamera Belum Siap",
        message: "Kamera belum siap. Tunggu beberapa detik.",
        type: "warning",
      });
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      showAlert({
        title: "Perangkat Tidak Mendukung",
        message: "Canvas grafis tidak didukung pada browser ini.",
        type: "error",
      });
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.95)
    );

    tutupKamera();

    if (!blob) {
      showAlert({
        title: "Pengambilan Foto Gagal",
        message: "Gagal mengambil gambar dari kamera. Silakan coba lagi.",
        type: "error",
      });
      return;
    }

    await prosesFoto(blob);
  };


  // =========================================================
  // STATUS
  // =========================================================

  const sudahClockIn = Boolean(attendance.clockIn);
  const sudahClockOut = Boolean(attendance.clockOut);

  const isClockOut =
    sudahClockIn && !sudahClockOut;

  const isMenuMismatch =
    isClockOut &&
    attendance.attendanceType &&
    attendance.attendanceType !== jenisKehadiran;

  // =========================================================
  // BUTTON CLOCK IN / OUT
  // =========================================================

  const handleAttendance = async () => {
    if (isLoading) return;

    if (isMenuMismatch) {
      showAlert({
        title: "Perbedaan Kategori Absensi",
        message: `Anda absen masuk sebagai "${attendance.attendanceType}". Silakan kembali ke Beranda dan pilih menu ${attendance.attendanceType} untuk melakukan absen keluar.`,
        type: "warning",
      });
      return;
    }

    try {
      const no_wa = normalizePhoneNumber(
        getUserPhone()
      );

      if (!no_wa) {
        throw new Error(
          "Nomor telepon pegawai tidak valid."
        );
      }

      setIsLoading(true);

      setLoadingText(
        isClockOut
          ? "Mengecek lokasi untuk absen keluar..."
          : "Mengecek lokasi untuk absen masuk..."
      );

      await ambilLokasi();

      setIsLoading(false);

      bukaKamera();
    } catch (error) {
      console.error(error);

      setIsLoading(false);
      setLoadingText("");

      showAlert({
        title: "Gagal Mendapatkan Lokasi",
        message: error.message || "Gagal mendapatkan lokasi GPS.",
        type: "error",
      });
    }
  };

  // =========================================================
  // LOAD IMAGE
  // =========================================================

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);

      img.onerror = () =>
        reject(
          new Error(
            `Gagal memuat gambar: ${src}`
          )
        );

      img.src = src;
    });
  }

  // =========================================================
  // CREATE WATERMARK
  // =========================================================

  async function createWatermarkedPhoto(
    file,
    lokasiData,
    alamatFoto,
    jenis
  ) {
    const imageUrl =
      URL.createObjectURL(file);

    try {
      const image = await loadImage(imageUrl);

      const canvas =
        document.createElement("canvas");

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error(
          "Canvas tidak didukung browser."
        );
      }

      const lebarAsli =
        image.naturalWidth || image.width;

      const tinggiAsli =
        image.naturalHeight || image.height;

      const skala = Math.min(
        1,
        MAX_DIMENSI_FOTO /
          Math.max(lebarAsli, tinggiAsli)
      );

      const width = Math.round(lebarAsli * skala);
      const height = Math.round(tinggiAsli * skala);

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      const watermarkHeight =
        Math.max(
          240,
          Math.min(height * 0.3, 420)
        );

      const watermarkTop =
        height - watermarkHeight;

      const padding =
        Math.max(18, width * 0.025);

      // Latar watermark memakai gradien, bukan blok pekat.
      // Bagian atas dibiarkan bening supaya foto tetap terlihat,
      // dan hanya melandai gelap ke arah bawah tempat teks
      // berada. Teks sendiri diberi bayangan supaya tetap
      // terbaca walau fotonya terang.
      const gradien = ctx.createLinearGradient(
        0,
        watermarkTop,
        0,
        height
      );

      gradien.addColorStop(
        0,
        "rgba(0,0,0,0)"
      );

      gradien.addColorStop(
        0.35,
        `rgba(0,0,0,${WATERMARK_OPACITY * 0.45})`
      );

      gradien.addColorStop(
        1,
        `rgba(0,0,0,${WATERMARK_OPACITY})`
      );

      ctx.fillStyle = gradien;

      ctx.fillRect(
        0,
        watermarkTop,
        width,
        watermarkHeight
      );

      const lat = lokasiData.lat;
      const lng = lokasiData.lng;
      const accuracy = lokasiData.accuracy;

      // =====================================================
      // THUMBNAIL PETA
      // =====================================================

      const ukuranPeta = Math.round(
        Math.min(
          Math.max(
            watermarkHeight - padding * 2,
            160
          ),
          width * 0.35
        )
      );

      let petaCanvas = null;

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        try {
          petaCanvas =
            await buatThumbnailPeta(
              lat,
              lng,
              ukuranPeta
            );
        } catch (error) {
          // Peta gagal bukan alasan absensi ikut gagal.
          console.error(
            "❌ Gagal membuat peta watermark:",
            error
          );
        }
      }

      if (petaCanvas) {
        const petaX =
          width - padding - ukuranPeta;

        const petaY =
          watermarkTop +
          (watermarkHeight - ukuranPeta) / 2;

        ctx.drawImage(
          petaCanvas,
          petaX,
          petaY,
          ukuranPeta,
          ukuranPeta
        );

        ctx.lineWidth = Math.max(
          2,
          ukuranPeta * 0.015
        );

        ctx.strokeStyle = "#ffffff";

        ctx.strokeRect(
          petaX,
          petaY,
          ukuranPeta,
          ukuranPeta
        );
      }

      const waktu =
        getWatermarkDateTime();

      const infoX = padding;

      // Teks menyempit supaya tidak menabrak peta.
      const infoWidth = petaCanvas
        ? width - padding * 3 - ukuranPeta
        : width - padding * 2;

      let textY =
        watermarkTop +
        padding +
        30;

      // Bayangan menjaga teks tetap terbaca sekarang latarnya
      // jauh lebih bening daripada sebelumnya.
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = Math.max(4, width * 0.006);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = "#ffffff";

      ctx.font =
        "bold 30px Arial";

      ctx.fillText(
        waktu,
        infoX,
        textY
      );

      textY += 45;

      ctx.font =
        "bold 22px Arial";

      const address =
        String(alamatFoto);

      const words =
        address.split(" ");

      let line = "";
      const lines = [];

      words.forEach((word) => {
        const test =
          line
            ? `${line} ${word}`
            : word;

        if (
          ctx.measureText(test).width >
            infoWidth &&
          line
        ) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });

      if (line) lines.push(line);

      lines.slice(0, 3).forEach((item) => {
        ctx.fillText(
          item,
          infoX,
          textY
        );

        textY += 30;
      });

      textY += 10;

      ctx.font =
        "18px Arial";

      ctx.fillText(
        `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        infoX,
        textY
      );

      textY += 28;

      ctx.font =
        "bold 18px Arial";

      ctx.fillText(
        `GPS : ${Math.round(
          accuracy
        )} m`,
        infoX,
        textY
      );

      textY += 35;

      ctx.fillText(
        `ABSENSI ${jenis}`,
        infoX,
        textY
      );

      return canvas.toDataURL(
        "image/jpeg",
        0.92
      );
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  // =========================================================
  // FOTO DIAMBIL
  // =========================================================

  // Dipakai dua jalur: jepretan kamera dalam aplikasi dan
  // foto yang diunggah pegawai.
  const prosesFoto = async (file) => {
    if (!lokasiRef.current) {
      showAlert({
        title: "GPS Belum Siap",
        message: "Lokasi GPS belum tersedia. Silakan tunggu beberapa detik dan coba lagi.",
        type: "warning",
      });
      return;
    }

    setIsLoading(true);
    setLoadingText(
      "Membuat watermark foto..."
    );

    try {
      const lokasiData =
        lokasiRef.current;

      const jenis =
        attendanceTypeRef.current ||
        jenisKehadiran ||
        "WFO";

      const alamatFoto =
        lokasiData.address ||
        alamat ||
        "Alamat tidak tersedia";

      const fotoWatermark =
        await createWatermarkedPhoto(
          file,
          lokasiData,
          alamatFoto,
          jenis
        );

      setPreviewFoto(
        fotoWatermark
      );

      const currentTime =
        getCurrentTime();

      // =====================================================
      // CLOCK IN
      // =====================================================

      if (!isClockOut) {
        const newAttendance = {
          ...attendance,

          date: getTodayKey(),

          attendanceType:
            jenis,

          clockIn:
            currentTime,

          clockInPhoto:
            fotoWatermark,

          clockInLocation:
            lokasiData,

          clockInAddress:
            alamatFoto,

          clockOut: null,
          clockOutPhoto: null,
          clockOutLocation: null,
          clockOutAddress: null,

          kinerja_harian: null,
        };

        // =====================================================
        // SIMPAN CLOCK IN KE DATABASE
        // =====================================================

        setLoadingText(
          "Menyimpan absen masuk..."
        );

        const no_wa = normalizePhoneNumber(
          getUserPhone()
        );

        const response = await fetch(
          `${API_URL}/api/absensi/clock-in`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              no_wa,

              tanggal: getTodayKey(),

              attendanceType: jenis,

              clockIn: currentTime,

              clockInPhoto: fotoWatermark,

              clockInLocation: lokasiData,

              clockInAddress: alamatFoto,
            }),
          }
        );

        const result = await response.json();

        console.log(
          "================================="
        );
        console.log(
          "📥 RESPONSE CLOCK IN"
        );
        console.log(
          "Status:",
          response.status
        );
        console.log(
          "Data:",
          result
        );
        console.log(
          "================================="
        );

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Gagal menyimpan absen masuk."
          );
        }

        // Server menyimpan fotonya sebagai berkas dan
        // mengembalikan path-nya. Simpan path itu, bukan
        // base64-nya — dua foto base64 bisa melebihi kuota
        // localStorage dan membuat absensi gagal total.
        const dataTersimpan = {
          ...newAttendance,

          clockInPhoto:
            result?.data?.clockInPhoto ||
            fotoWatermark,
        };

        setAttendance(dataTersimpan);

        localStorage.setItem(
          `attendance_${getTodayKey()}`,
          JSON.stringify(dataTersimpan)
        );

        setIsLoading(false);
        setLoadingText("");

        showAlert({
          title: "Absen Masuk Berhasil!",
          message: "Data absensi masuk Anda berhasil dicatat hari ini.",
          type: "success",
        });

        return;
      }

      // =====================================================
      // CLOCK OUT
      // =====================================================

      const updatedAttendance = {
        ...attendance,

        clockOut:
          currentTime,

        clockOutPhoto:
          fotoWatermark,

        clockOutLocation:
          lokasiData,

        clockOutAddress:
          alamatFoto,

        kinerja_harian: null,
      };

      setAttendance(
        updatedAttendance
      );

      // SIMPAN SEMENTARA SAJA
      // BELUM KE DATABASE
      localStorage.setItem(
        `attendance_${getTodayKey()}`,
        JSON.stringify(
          updatedAttendance
        )
      );

      console.log(
        "================================="
      );
      console.log(
        "✅ CLOCK OUT SELESAI"
      );
      console.log(
        "⏰ Clock Out:",
        currentTime
      );
      console.log(
        "📸 Foto:",
        "ADA"
      );
      console.log(
        "📍 Lokasi:",
        lokasiData
      );
      console.log(
        "⚠️ BELUM DISIMPAN KE DATABASE"
      );
      console.log(
        "➡️ Lanjut ke Kinerja Harian"
      );
      console.log(
        "================================="
      );

      setIsLoading(false);
      setLoadingText("");

      // PENTING:
      // PINDAH KE KINERJA
      if (keKinerja) {
        keKinerja(
          updatedAttendance
        );
      }
    } catch (error) {
      console.error(
        "❌ Gagal proses foto:",
        error
      );

      setIsLoading(false);
      setLoadingText("");

      showAlert({
        title: "Gagal Memproses Foto",
        message: error.message || "Gagal memproses foto absensi.",
        type: "error",
      });
    }
  };

  const handleFotoDiambil = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    await prosesFoto(file);
  };

  // =========================================================
  // RENDER
  // =========================================================

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen w-full bg-paper font-sans text-navy flex flex-col">
      {/* =====================================================
          1. DESKTOP NAVBAR (hidden md:block)
      ===================================================== */}
      <header className="hidden md:block bg-white border-b border-mist/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-paper p-1.5 border border-mist flex items-center justify-center shadow-xs shrink-0">
              <img
                src={logoKemnaker}
                alt="Logo Kemnaker"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-navy leading-tight">Presensi Non-ASN</h1>
              <p className="text-[11px] text-slate-500">Biro Keuangan dan BMN</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={keHome}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
            >
              Beranda
            </button>
            {keRiwayat && (
              <button
                onClick={keRiwayat}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
              >
                Riwayat
              </button>
            )}
            {keProfile && (
              <button
                onClick={keProfile}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer"
              >
                Profil Saya
              </button>
            )}
            {petugas && keRekap && (
              <button
                onClick={keRekap}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Rekap Absensi</span>
                <span className="bg-brand/10 text-brand text-[10px] font-bold px-1.5 py-0.2 rounded-sm uppercase">Petugas</span>
              </button>
            )}
            <div className="w-px h-5 bg-mist mx-1" />
            {keLogout && (
              <button
                onClick={keLogout}
                className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all cursor-pointer font-bold"
              >
                Keluar
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* =====================================================
          2. MOBILE HEADER (block md:hidden)
      ===================================================== */}
      <header className="block md:hidden bg-brand text-white px-5 pt-8 pb-4 rounded-b-[30px] shadow-md shrink-0">
        <div className="flex items-center">
          <button
            onClick={keHome}
            disabled={isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FiChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold">Absensi</h1>
            <p className="text-xs text-mist mt-0.5">
              {user?.nama || "Pegawai"} • {jenisKehadiran}
            </p>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {/* =====================================================
          3. DESKTOP BREADCRUMB & TITLE BAR (hidden md:block)
      ===================================================== */}
      <div className="hidden md:block bg-white border-b border-mist/80 py-4 shadow-2xs">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={keHome}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-mist hover:bg-slate-50 text-xs font-semibold text-navy transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <FiArrowLeft className="w-4 h-4 text-brand" />
              <span>Kembali ke Beranda</span>
            </button>
            <div className="h-5 w-px bg-mist" />
            <div>
              <h2 className="text-lg font-bold text-navy leading-tight">Formulir Presensi Kehadiran</h2>
              <p className="text-xs text-slate-500">Pencatatan kehadiran dan foto bukti ber-watermark geotag</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${badgeConfig.color}`}>
              <span>{badgeConfig.icon}</span>
              <span>{badgeConfig.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          4. MAIN CONTENT CONTAINER (RESPONSIF MOBILE & DESKTOP)
      ===================================================== */}
      <main className="w-full max-w-[430px] md:max-w-6xl mx-auto px-4 sm:px-5 md:px-8 py-4 md:py-8 flex-1 pb-24 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
          
          {/* KOLOM KIRI: STATUS, WAKTU & LOKASI (md:col-span-7) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            
            {/* CARD 1: STATUS KEHADIRAN & WAKTU */}
            <div className="bg-white rounded-[22px] md:rounded-3xl p-5 border border-mist shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-mist/70">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">Tanggal Hari Ini</p>
                  <h3 className="font-bold text-navy text-sm sm:text-base mt-0.5">
                    {sekarang.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 font-semibold">Jam Digital</p>
                  <p className="font-extrabold text-brand text-xl sm:text-2xl tracking-tight">
                    {sekarang.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}{" "}
                    <span className="text-xs font-semibold text-slate-400">WIB</span>
                  </p>
                </div>
              </div>

              {/* IDENTITAS PEGAWAI STRIP */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-mist/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Identitas Pegawai</p>
                  <p className="font-bold text-navy text-sm truncate">{user?.nama || "Pegawai"}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                    {user?.nip || "-"} • {user?.jabatan || "-"}
                  </p>
                  {user?.sub_unit && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Unit: {user?.sub_unit}
                    </p>
                  )}
                </div>
                <span className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 ${badgeConfig.color}`}>
                  {badgeConfig.icon} {jenisKehadiran}
                </span>
              </div>

              {/* JAM MASUK & JAM KELUAR */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-paper p-3.5 rounded-2xl border border-mist/70">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-500">Jam Masuk</p>
                    <span className={`w-2.5 h-2.5 rounded-full ${attendance.clockIn ? "bg-teal" : "bg-slate-300"}`} />
                  </div>
                  <p className="font-extrabold text-navy text-lg sm:text-xl mt-1">
                    {attendance.clockIn ? `${attendance.clockIn} WIB` : "--:--"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {attendance.clockIn ? "Tercatat di server" : "Belum absen masuk"}
                  </p>
                </div>

                <div className="bg-paper p-3.5 rounded-2xl border border-mist/70">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-500">Jam Keluar</p>
                    <span className={`w-2.5 h-2.5 rounded-full ${attendance.clockOut ? "bg-green" : "bg-slate-300"}`} />
                  </div>
                  <p className="font-extrabold text-navy text-lg sm:text-xl mt-1">
                    {attendance.clockOut ? `${attendance.clockOut} WIB` : "--:--"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {attendance.clockOut ? "Tercatat di server" : "Belum absen keluar"}
                  </p>
                </div>
              </div>
            </div>

            {/* ALERT MISMATCH */}
            {isMenuMismatch && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start shadow-xs">
                <FiAlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-700">Perhatian Perbedaan Jenis Presensi!</h4>
                  <p className="text-xs text-red-600 mt-1 leading-relaxed">
                    Tadi Anda melakukan <strong>Absen Masuk</strong> menggunakan kategori <strong>{attendance.attendanceType}</strong>.
                    Silakan kembali ke Beranda dan pilih menu yang sama untuk melakukan <strong>Absen Keluar</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* CARD 2: LOKASI & GEOTAG */}
            {lokasi && (
              <div className="bg-white rounded-[22px] md:rounded-3xl p-5 border border-mist shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-mist/70">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <FiMapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-navy">Lokasi Geotag Saat Ini</h4>
                      <p className="text-[11px] text-slate-500">Terdeteksi via GPS Perangkat</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                    GPS Aktif
                  </span>
                </div>

                <div className="text-xs">
                  <p className="font-semibold text-navy leading-relaxed break-words">{alamat}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-2 font-mono bg-slate-50 p-2.5 rounded-xl border border-mist/70">
                    <span>Lat: {lokasi.lat.toFixed(6)}</span>
                    <span>•</span>
                    <span>Lng: {lokasi.lng.toFixed(6)}</span>
                    <span>•</span>
                    <span className="text-brand font-semibold">Akurasi ±{Math.round(lokasi.accuracy)}m</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                  💡 {badgeConfig.lokasiTip}
                </p>
              </div>
            )}

            {/* PANDUAN INFORMASI KETENTUAN */}
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
              <span className="text-base shrink-0">ℹ️</span>
              <div>
                <strong className="block text-navy font-bold mb-0.5">Ketentuan Presensi {jenisKehadiran}:</strong>
                <span>
                  Pastikan GPS aktif dan posisi Anda sesuai dengan lokasi kerja sebenarnya.
                  Foto akan langsung diberi watermark waktu (WIB), koordinat GPS, akurasi, dan cuplikan peta satelit.
                </span>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: BUKTI FOTO & TOMBOL AKSI (md:col-span-5) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* CARD 3: BUKTI FOTO & TOMBOL AKSI */}
            <div className="bg-white rounded-[22px] md:rounded-3xl p-5 border border-mist shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-mist/70 mb-4">
                  <h3 className="font-bold text-navy text-sm sm:text-base">Bukti Foto Presensi</h3>
                  {previewFoto ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                      Belum Ada Foto
                    </span>
                  )}
                </div>

                {/* CONTAINER FOTO / PLACEHOLDER */}
                {previewFoto ? (
                  <div className="w-full rounded-2xl overflow-hidden border-2 border-brand/40 shadow-sm bg-black aspect-4/3 flex items-center justify-center">
                    <img
                      src={urlFoto(previewFoto)}
                      alt="Bukti absensi"
                      className="w-full h-full object-contain block"
                    />
                  </div>
                ) : (
                  <div className="w-full rounded-2xl border-2 border-dashed border-mist bg-slate-50/80 p-6 flex flex-col items-center justify-center text-center aspect-4/3">
                    <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-2xl mb-3 shadow-2xs">
                      📷
                    </div>
                    <h4 className="font-bold text-navy text-sm">Ambil Foto Presensi</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                      Wajah harus terlihat jelas. Foto akan diproses dengan watermark resmi.
                    </p>
                  </div>
                )}
              </div>

              {/* ACTION BUTTON (DESKTOP INLINE) */}
              <div className="mt-5 pt-4 border-t border-mist/70 hidden md:block">
                {!sudahClockOut ? (
                  <button
                    onClick={handleAttendance}
                    disabled={isLoading || isMenuMismatch}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 ${
                      isMenuMismatch
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-brand hover:bg-brand/90 disabled:opacity-60"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{loadingText || "Memproses..."}</span>
                      </>
                    ) : sudahClockIn ? (
                      <>
                        <span>ABSEN KELUAR SEKARANG</span>
                        <FiLogOut className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <span>ABSEN MASUK SEKARANG</span>
                        <FiLogIn className="w-5 h-5" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => keKinerja && keKinerja(attendance)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <span>ISI KINERJA HARIAN</span>
                    <FiCheckCircle className="w-5 h-5" />
                  </button>
                )}

                <p className="text-[11px] text-slate-400 text-center mt-2.5">
                  🛡️ Foto diproteksi watermark anti-manipulasi geotag & jam server
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================
          5. MOBILE STICKY BOTTOM ACTION (block md:hidden)
      ===================================================== */}
      <div className="block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-mist p-3.5 z-30 shadow-lg">
        {!sudahClockOut ? (
          <button
            onClick={handleAttendance}
            disabled={isLoading || isMenuMismatch}
            className={`w-full text-white py-3.5 rounded-2xl font-bold shadow-md active:scale-[0.98] transition-all disabled:cursor-not-allowed text-sm ${
              isMenuMismatch
                ? "bg-navy/40"
                : "bg-brand disabled:opacity-60"
            }`}
          >
            {isLoading
              ? loadingText
              : sudahClockIn
              ? "Absen Keluar"
              : "Absen Masuk"}
          </button>
        ) : (
          <button
            onClick={() => keKinerja && keKinerja(attendance)}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold shadow-md active:scale-[0.98] transition-all text-sm"
          >
            Isi Kinerja Harian
          </button>
        )}
      </div>

      {/* =====================================================
          6. KAMERA MODAL OVERLAY (RESPONSIF DESKTOP & MOBILE)
      ===================================================== */}
      {kameraAktif && (
        <div className="fixed inset-0 z-50 bg-navy/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
          <div className="w-full h-full md:h-auto md:max-w-xl bg-black md:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:border md:border-white/10">
            {/* CAMERA HEADER */}
            <div className="flex items-center justify-between px-5 pt-6 md:pt-4 pb-3 text-white shrink-0 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <span className="text-base">📷</span>
                <span className="text-sm font-bold">
                  {isClockOut ? "Foto Absen Keluar" : "Foto Absen Masuk"} ({jenisKehadiran})
                </span>
              </div>
              <button
                onClick={tutupKamera}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg leading-none cursor-pointer"
                title="Tutup Kamera"
              >
                ✕
              </button>
            </div>

            {/* VIDEO FEED */}
            <div className="flex-1 min-h-[300px] md:min-h-[380px] max-h-[70vh] relative bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-contain"
              />

              {!kameraSiap && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center text-white">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Menyiapkan kamera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* CAMERA BOTTOM CONTROLS */}
            <div className="px-5 pt-3 pb-8 md:pb-5 shrink-0 flex flex-col items-center gap-2.5 bg-slate-900/90 text-white">
              <p className="text-slate-400 text-[11px] text-center">
                Posisikan wajah di dalam frame. Foto akan dibubuhi watermark waktu, lokasi, dan peta.
              </p>

              <button
                onClick={ambilJepretan}
                disabled={!kameraSiap}
                className="w-16 h-16 rounded-full bg-white border-4 border-brand hover:scale-105 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-lg flex items-center justify-center"
                aria-label="Ambil foto"
              >
                <div className="w-12 h-12 rounded-full border-2 border-slate-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA FILE FALLBACK */}
      <input
        ref={inputKameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFotoDiambil}
        className="hidden"
      />
    </div>
  );
}

export default Attendance;