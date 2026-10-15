
import { FiCheckCircle, FiClock, FiUser } from "react-icons/fi";

// =========================================================
// BOTTOM BAR CATEGORIES:
// 1. Primary + Greyish White (Default)
// 2. White / Greyish White
// 3. Navy
// 4. Other (Accent Teal & Yellow)
// =========================================================

function BottomNav({ activeNav, keHome, keRiwayat, keProfile, category = "1" }) {
  let navBg = "bg-paper/95 backdrop-blur-md border-t border-mist";
  let activeColor = "text-brand";
  let inactiveColor = "text-navy/35";
  let dotColor = "bg-brand";

  if (category === "2" || category === "white-grey") {
    // Category 2: White / Greyish White
    navBg = "bg-white border-t border-mist";
    activeColor = "text-brand";
    inactiveColor = "text-navy/30";
    dotColor = "bg-brand";
  } else if (category === "3" || category === "navy") {
    // Category 3: Navy
    navBg = "bg-navy border-t border-navy/80";
    activeColor = "text-white";
    inactiveColor = "text-white/40";
    dotColor = "bg-yellow";
  } else if (category === "4" || category === "other") {
    // Category 4: Other (Teal & Accent)
    navBg = "bg-white border-t border-mist";
    activeColor = "text-teal";
    inactiveColor = "text-navy/35";
    dotColor = "bg-teal";
  }

  return (
    <nav className={`md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] ${navBg} px-6 pt-2.5 pb-3.5 z-50 transition-colors duration-200`}>
      <div className="flex items-center justify-around">
        {/* Attendance (Home) */}
        <button
          onClick={keHome}
          className="flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90"
        >
          <FiCheckCircle className={`w-6 h-6 transition-colors ${activeNav === "attendance" ? activeColor : inactiveColor}`} />
          {activeNav === "attendance" ? (
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          ) : (
            <span className="w-1.5 h-1.5" />
          )}
        </button>

        {/* History (Riwayat) */}
        <button
          onClick={keRiwayat}
          className="flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90"
        >
          <FiClock className={`w-6 h-6 transition-colors ${activeNav === "history" ? activeColor : inactiveColor}`} />
          {activeNav === "history" ? (
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          ) : (
            <span className="w-1.5 h-1.5" />
          )}
        </button>

        {/* Profile */}
        <button
          onClick={keProfile}
          className="flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-90"
        >
          <FiUser className={`w-6 h-6 transition-colors ${activeNav === "profile" ? activeColor : inactiveColor}`} />
          {activeNav === "profile" ? (
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          ) : (
            <span className="w-1.5 h-1.5" />
          )}
        </button>
      </div>
    </nav>
  );
}

export default BottomNav;