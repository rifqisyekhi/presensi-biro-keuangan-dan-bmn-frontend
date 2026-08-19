
function BottomNav({ activeNav, keHome, keRiwayat, keProfile }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-mist px-6 pt-2 pb-3 z-50">
      <div className="flex items-center justify-around">
        {/* Attendance (Home) */}
        <button
          onClick={keHome}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeNav === "attendance" ? "text-brand" : "text-navy/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2.5 2.5L16 9" />
          </svg>
          {activeNav === "attendance" && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          )}
        </button>

        {/* History (Riwayat) */}
        <button
          onClick={keRiwayat}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeNav === "history" ? "text-brand" : "text-navy/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.93 4.93A10 10 0 1012 2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v4h4" />
          </svg>
          {activeNav === "history" && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          )}
        </button>

        {/* Profile */}
        <button
          onClick={keProfile}
          className="flex flex-col items-center gap-1"
        >
          <svg className={`w-6 h-6 ${activeNav === "profile" ? "text-brand" : "text-navy/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 00-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {activeNav === "profile" && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          )}
        </button>
      </div>
    </nav>
  );
}

export default BottomNav;