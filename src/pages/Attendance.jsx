import { useEffect, useRef, useState } from "react";

const MAX_GPS_ACCURACY = 500;

function Attendance({
  jenisKehadiran = "WFO",
  keHome,
  keKinerja,
}) {
  const inputKameraRef = useRef(null);
  const lokasiRef = useRef(null);
  const attendanceTypeRef = useRef(jenisKehadiran);

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [previewFoto, setPreviewFoto] = useState(null);
  const [lokasi, setLokasi] = useState(null);
  const [alamat, setAlamat] = useState("Mencari alamat...");

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

            if (accuracy > MAX_GPS_ACCURACY) {
              reject(
                new Error(
                  `Akurasi GPS terlalu rendah (${Math.round(
                    accuracy
                  )} meter). Silakan aktifkan GPS dengan akurasi tinggi.`
                )
              );
              return;
            }

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
            message =
              "Izin lokasi ditolak. Silakan izinkan akses lokasi.";
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
  // CAMERA
  // =========================================================

  const bukaKamera = () => {
    if (!inputKameraRef.current) {
      alert("Kamera tidak dapat dibuka.");
      return;
    }

    inputKameraRef.current.value = "";
    inputKameraRef.current.click();
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
        `Anda melakukan Clock In sebagai "${attendance.attendanceType}". Silakan pilih menu ${attendance.attendanceType} untuk Clock Out.`
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
          ? "Mengecek lokasi untuk Clock Out..."
          : "Mengecek lokasi untuk Clock In..."
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

      const width =
        image.naturalWidth || image.width;

      const height =
        image.naturalHeight || image.height;

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

      ctx.fillStyle =
        "rgba(0,0,0,0.76)";

      ctx.fillRect(
        0,
        watermarkTop,
        width,
        watermarkHeight
      );

      const lat = lokasiData.lat;
      const lng = lokasiData.lng;
      const accuracy = lokasiData.accuracy;

      const waktu =
        getWatermarkDateTime();

      const infoX = padding;
      const infoWidth =
        width - padding * 2;

      let textY =
        watermarkTop +
        padding +
        30;

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

  const handleFotoDiambil = async (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

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

        setAttendance(
          newAttendance
        );

        localStorage.setItem(
          `attendance_${getTodayKey()}`,
          JSON.stringify(
            newAttendance
          )
        );

        setIsLoading(false);
        setLoadingText("");

        alert(
          "Clock In berhasil dicatat!"
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

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#F7F9FC] font-sans text-gray-800 flex flex-col">

      {/* HEADER */}

      <div className="bg-[#5B84F5] text-white px-5 pt-10 pb-7 rounded-b-[30px] shadow-md">

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

            <p className="text-xs text-blue-100 mt-1">
              {jenisKehadiran}
            </p>

          </div>

          <div className="w-10" />

        </div>

      </div>

      {/* CONTENT */}

      <div className="flex-1 px-5 py-6 overflow-y-auto">

        {/* DATE */}

        <div className="text-center mb-5">

          <p className="text-xs text-gray-400">
            {getCurrentDate()}
          </p>

          <h2 className="text-3xl font-bold text-[#5B84F5] mt-1">
            {getCurrentTime()}
          </h2>

        </div>

        {/* USER */}

        {user && (
          <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 mb-4">

            <p className="text-xs text-gray-400">
              Pegawai
            </p>

            <p className="font-bold text-gray-800 mt-1">
              {user.nama || "Pegawai"}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              {user.no_wa || "-"}
            </p>

          </div>
        )}

        {/* STATUS */}

        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">

          <div className="flex items-center justify-between mb-5">

            <div>

              <p className="text-xs text-gray-400">
                Jenis Kehadiran
              </p>

              <h2 className="text-xl font-bold mt-1">
                {jenisKehadiran}
              </h2>

            </div>

            <div className="px-3 py-1.5 rounded-full bg-blue-50 text-[#5B84F5] text-xs font-bold">
              Hari Ini
            </div>

          </div>

          {/* CLOCK IN */}

          <div className="flex items-center gap-3 py-3 border-b border-gray-100">

            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">

              <svg
                className="w-5 h-5 text-green-500"
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

              <p className="text-xs text-gray-400">
                Clock In
              </p>

              <p className="font-bold text-gray-700">
                {attendance.clockIn ||
                  "Belum"}
              </p>

            </div>

          </div>

          {/* CLOCK OUT */}

          <div className="flex items-center gap-3 py-3">

            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">

              <svg
                className="w-5 h-5 text-orange-500"
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

              <p className="text-xs text-gray-400">
                Clock Out
              </p>

              <p className="font-bold text-gray-700">
                {attendance.clockOut ||
                  "Belum"}
              </p>

            </div>

          </div>

        </div>

        {/* MISMATCH */}

        {isMenuMismatch && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-[20px] p-4 flex gap-3 items-start shadow-sm">

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
                  Clock In
                </strong>{" "}
                menggunakan menu{" "}
                <strong>
                  {attendance.attendanceType}
                </strong>
                . Silakan kembali ke Home dan pilih menu tersebut untuk melakukan{" "}
                <strong>
                  Clock Out
                </strong>
                .
              </p>

            </div>

          </div>
        )}

        {/* LOCATION */}

        {lokasi && (
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 mt-4">

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

                <p className="text-xs text-gray-400">
                  Lokasi Saat Ini
                </p>

                <p className="text-xs font-semibold text-gray-700 mt-1 break-words">
                  {alamat}
                </p>

                <p className="text-[10px] text-gray-400 mt-2">
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
          <div className="mt-5">

            <div className="flex items-center justify-between mb-2">

              <h3 className="font-bold text-sm">
                Bukti Absensi
              </h3>

              <span className="text-[10px] text-green-600 font-bold">
                VERIFIED
              </span>

            </div>

            <div className="rounded-[20px] overflow-hidden border-2 border-green-400 shadow-sm bg-black">

              <img
                src={previewFoto}
                alt="Bukti absensi"
                className="w-full h-auto block"
              />

            </div>

          </div>
        )}

        {/* INFORMATION */}

        <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-2xl">

          <p className="text-xs text-blue-700 leading-relaxed">
            Pastikan GPS aktif dan posisi Anda sesuai dengan lokasi sebenarnya. Foto akan diberikan watermark waktu, koordinat GPS, akurasi dan alamat.
          </p>

        </div>

      </div>

      {/* BOTTOM ACTION */}

      <div className="bg-white border-t border-gray-100 p-5">

        {!sudahClockOut ? (

          <button
            onClick={handleAttendance}
            disabled={
              isLoading ||
              isMenuMismatch
            }
            className={`w-full text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all disabled:cursor-not-allowed ${
              isMenuMismatch
                ? "bg-gray-400"
                : "bg-[#5B84F5] disabled:opacity-60"
            }`}
          >
            {isLoading
              ? loadingText
              : sudahClockIn
              ? "Clock Out"
              : "Clock In"}
          </button>

        ) : (

          <button
            onClick={() =>
              keKinerja &&
              keKinerja(attendance)
            }
            className="w-full bg-[#5B84F5] text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all"
          >
            Isi Kinerja Harian
          </button>

        )}

      </div>

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