
function BottomNav({ activeNav, keHome, keRiwayat, keProfile }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-6 pt-3 pb-5 z-50">
      <div className="flex items-center justify-around">
        {/* Attendance (Home) */}
        <button
          onClick={keHome}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeNav === "attendance" ? "text-[#00AEEF]" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2.5 2.5L16 9" />
          </svg>
          {activeNav === "attendance" && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]" />
          )}
        </button>

        {/* History (Riwayat) */}
        <button
          onClick={keRiwayat}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeNav === "history" ? "text-[#00AEEF]" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.93 4.93A10 10 0 1012 2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v4h4" />
          </svg>
          {activeNav === "history" && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]" />
          )}
        </button>

        {/* Announcement */}
        <button className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 10v4a2 2 0 002 2h2l4 3V5L8 8H6a2 2 0 00-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 9a4 4 0 010 6" />
          </svg>
        </button>

        {/* Profile */}
        <button
          onClick={keProfile}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeNav === "profile" ? "text-[#00AEEF]" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 00-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {activeNav === "profile" && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]" />
          )}
        </button>
      </div>
    </nav>
  );
}

export default BottomNav;