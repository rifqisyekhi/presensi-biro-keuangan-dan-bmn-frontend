import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import AlertModal from "../components/AlertModal";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState(null);

  const showAlert = useCallback((options, maybeType = "info") => {
    if (typeof options === "string") {
      // Deteksi otomatis jika string memuat kata-kata peringatan / gagal / sukses
      let detectedType = maybeType;
      const lower = options.toLowerCase();
      if (
        lower.includes("gagal") ||
        lower.includes("error") ||
        lower.includes("tidak dapat") ||
        lower.includes("tidak bisa") ||
        lower.includes("salah") ||
        lower.includes("ditolak")
      ) {
        detectedType = "error";
      } else if (
        lower.includes("perhatian") ||
        lower.includes("belum") ||
        lower.includes("wajib") ||
        lower.includes("minimal") ||
        lower.includes("maksimal") ||
        lower.includes("silakan")
      ) {
        detectedType = "warning";
      } else if (
        lower.includes("berhasil") ||
        lower.includes("selesai") ||
        lower.includes("sukses")
      ) {
        detectedType = "success";
      }

      setAlertConfig({
        message: options,
        type: detectedType,
      });
    } else if (options && typeof options === "object") {
      setAlertConfig({
        title: options.title,
        message: options.message || options.text || "",
        type: options.type || "info",
        buttonText: options.buttonText || "Mengerti",
        onClose: options.onClose,
      });
    }
  }, []);

  const closeAlert = useCallback(() => {
    if (alertConfig?.onClose) {
      try {
        alertConfig.onClose();
      } catch (e) {
        console.error("Error pada callback onClose alert:", e);
      }
    }
    setAlertConfig(null);
  }, [alertConfig]);

  // Intersep window.alert browser agar otomatis menampilkan popup modern ini
  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (msg) => {
      showAlert(String(msg ?? ""));
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert }}>
      {children}
      {alertConfig && (
        <AlertModal
          isOpen={true}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttonText={alertConfig.buttonText}
          onClose={closeAlert}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    return {
      showAlert: (opts) => {
        const msg = typeof opts === "string" ? opts : opts?.message;
        console.warn("Alert:", msg);
      },
      closeAlert: () => {},
    };
  }
  return context;
}

