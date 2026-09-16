import { useEffect, useRef, useState } from "react";
import { API_URL, urlFoto } from "../config";

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

  ctx.fillStyle = "#13416B";
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
  keKinerja,
}) {
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
      alert("Tidak bisa membuka pengambilan foto.");
      return;
    }

    alert(
      `${alasan}\n\nSilakan foto dulu dengan aplikasi Kamera di HP Anda, lalu pilih foto itu pada layar berikutnya.`
    );

    inputKameraRef.current.value = "";
    inputKameraRef.current.click();
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
      alert("Kamera belum siap. Tunggu sebentar.");
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert("Canvas tidak didukung browser.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.95)
    );

    tutupKamera();

    if (!blob) {
      alert("Gagal mengambil gambar dari kamera.");
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
      alert(
        `Anda absen masuk sebagai "${attendance.attendanceType}". Silakan pilih menu ${attendance.attendanceType} untuk absen keluar.`
      );
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

      alert(
        error.message ||
          "Gagal mendapatkan lokasi."
      );
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
      alert(
        "Lokasi GPS belum tersedia. Silakan ulangi."
      );
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

        alert(
          "Absen masuk berhasil dicatat!"
        );

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

      alert(
        error.message ||
          "Gagal memproses foto."
      );
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

  return (
    <div className="h-[100dvh] relative w-full max-w-[430px] mx-auto bg-paper font-sans text-navy flex flex-col overflow-hidden">

      {/* HEADER */}

      <div className="bg-brand text-white px-5 pt-8 pb-4 rounded-b-[30px] shadow-md shrink-0">

        <div className="flex items-center">

          <button
            onClick={keHome}
            disabled={isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all disabled:opacity-50"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex-1 text-center">

            <h1 className="text-lg font-bold">
              Absensi
            </h1>

            <p className="text-xs text-mist mt-0.5">
              {user?.nama || "Pegawai"} • {jenisKehadiran}
            </p>

          </div>

          <div className="w-10" />

        </div>

      </div>

      {/* CONTENT */}

      <div className="flex-1 min-h-0 px-5 py-3 flex flex-col overflow-hidden">

        {/* DATE */}

        <div className="text-center mb-2 shrink-0">

          <p className="text-xs text-navy/60">
            {getCurrentDate()}
          </p>

          <h2 className="text-2xl font-bold text-brand mt-1">
            {getCurrentTime()}
          </h2>

        </div>

        {/* STATUS */}

        <div className="bg-white rounded-[20px] p-3 shadow-sm border border-mist shrink-0">

          <div className="flex items-center justify-between mb-3">

            <div>

              <p className="text-xs text-navy/60">
                Jenis Kehadiran
              </p>

              <h2 className="text-lg font-bold mt-1">
                {jenisKehadiran}
              </h2>

            </div>

            <div className="px-3 py-1.5 rounded-full bg-mist text-brand text-xs font-bold">
              Hari Ini
            </div>

          </div>

          {/* CLOCK IN */}

          <div className="flex items-center gap-3 py-2 border-b border-mist">

            <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center">

              <svg
                className="w-5 h-5 text-brand"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12l4 4L19 6"
                />
              </svg>

            </div>

            <div className="flex-1">

              <p className="text-xs text-navy/60">
                Jam Masuk
              </p>

              <p className="font-bold text-navy">
                {attendance.clockIn ||
                  "Belum"}
              </p>

            </div>

          </div>

          {/* CLOCK OUT */}

          <div className="flex items-center gap-3 py-2">

            <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center">

              <svg
                className="w-5 h-5 text-navy"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 2"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />
              </svg>

            </div>

            <div className="flex-1">

              <p className="text-xs text-navy/60">
                Jam Keluar
              </p>

              <p className="font-bold text-navy">
                {attendance.clockOut ||
                  "Belum"}
              </p>

            </div>

          </div>

        </div>

        {/* MISMATCH */}

        {isMenuMismatch && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-[20px] p-3 flex gap-3 items-start shadow-sm shrink-0">

            <svg
              className="w-6 h-6 text-red-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.333-1.333-1.732 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>

            <div>

              <h3 className="text-sm font-bold text-red-700">
                Perhatian!
              </h3>

              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                Tadi Anda{" "}
                <strong>
                  Jam Masuk
                </strong>{" "}
                menggunakan menu{" "}
                <strong>
                  {attendance.attendanceType}
                </strong>
                . Silakan kembali ke Home dan pilih menu tersebut untuk melakukan{" "}
                <strong>
                  Jam Keluar
                </strong>
                .
              </p>

            </div>

          </div>
        )}

        {/* LOCATION */}

        {lokasi && (
          <div className="bg-white rounded-[20px] p-3 shadow-sm border border-mist mt-2 shrink-0">

            <div className="flex gap-3">

              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">

                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                  />

                  <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                  />
                </svg>

              </div>

              <div className="min-w-0">

                <p className="text-xs text-navy/60">
                  Lokasi Saat Ini
                </p>

                <p className="text-xs font-semibold text-navy mt-1 break-words">
                  {alamat}
                </p>

                <p className="text-[10px] text-navy/60 mt-2">
                  {lokasi.lat.toFixed(6)}
                  ,{" "}
                  {lokasi.lng.toFixed(6)}
                  {" • "}
                  Akurasi{" "}
                  {Math.round(
                    lokasi.accuracy
                  )}{" "}
                  meter
                </p>

              </div>

            </div>

          </div>
        )}

        {/* FOTO */}

        {previewFoto && (
          <div className="mt-2 flex-1 min-h-0 flex flex-col">

            <div className="flex items-center justify-between mb-2 shrink-0">

              <h3 className="font-bold text-sm">
                Bukti Absensi
              </h3>

              <span className="text-[10px] text-brand font-bold">
                VERIFIED
              </span>

            </div>

            <div className="flex-1 min-h-0 rounded-[20px] overflow-hidden border-2 border-brand shadow-sm bg-black">

              <img
                src={urlFoto(previewFoto)}
                alt="Bukti absensi"
                className="w-full h-full object-contain block"
              />

            </div>

          </div>
        )}

        {/* INFORMATION */}

        {!previewFoto && (
          <div className="mt-2 p-3 bg-mist border border-mist rounded-2xl shrink-0">

            <p className="text-xs text-navy leading-relaxed">
              Pastikan GPS aktif dan posisi Anda sesuai dengan lokasi sebenarnya. Foto akan diberikan watermark waktu, koordinat GPS, akurasi dan alamat.
            </p>

          </div>
        )}

      </div>

      {/* BOTTOM ACTION */}

      <div className="bg-white border-t border-mist p-3 shrink-0">

        {!sudahClockOut ? (

          <button
            onClick={handleAttendance}
            disabled={
              isLoading ||
              isMenuMismatch
            }
            className={`w-full text-white py-3.5 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all disabled:cursor-not-allowed ${
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
            onClick={() =>
              keKinerja &&
              keKinerja(attendance)
            }
            className="w-full bg-brand text-white py-3.5 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all"
          >
            Isi Kinerja Harian
          </button>

        )}

      </div>

      {/* KAMERA */}

      {kameraAktif && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col">

          <div className="flex items-center justify-between px-5 pt-8 pb-3 text-white shrink-0">

            <span className="text-sm font-bold">
              {isClockOut ? "Foto Absen Keluar" : "Foto Absen Masuk"}
            </span>

            <button
              onClick={tutupKamera}
              className="text-2xl leading-none px-2"
            >
              ✕
            </button>

          </div>

          <div className="flex-1 min-h-0 relative">

            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-contain"
            />

            {!kameraSiap && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white text-sm">
                  Menyiapkan kamera...
                </p>
              </div>
            )}

          </div>

          <div className="px-5 pt-4 pb-8 shrink-0 flex flex-col items-center gap-3">

            <p className="text-mist text-[11px] text-center">
              Foto diambil langsung dari kamera dan diberi watermark waktu serta lokasi.
            </p>

            <button
              onClick={ambilJepretan}
              disabled={!kameraSiap}
              className="w-16 h-16 rounded-full bg-white border-4 border-brand active:scale-95 transition-all disabled:opacity-40"
              aria-label="Ambil foto"
            />

          </div>

        </div>
      )}

      {/* CAMERA */}

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